'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { getAuthHeaders } from './use-auth';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { ChatMessage, ChatConversation } from '@/types';

interface UseChatOptions {
  currentUserId?: string;
  onShowAlert?: (message: string, type?: 'success' | 'error') => void;
}

export function useChat({ currentUserId, onShowAlert }: UseChatOptions = {}) {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);
  const [chatMeta, setChatMeta] = useState<{ itemTitle: string; itemPhoto?: string; otherUser: { _id: string; name: string; photo?: string } } | null>(null);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const channelRef = useRef<ReturnType<ReturnType<typeof getSupabaseClient>['channel']> | null>(null);

  // Загрузка списка диалогов
  const loadConversations = useCallback(async () => {
    setIsLoadingConversations(true);
    try {
      const res = await fetch('/api/chat', { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Ошибка загрузки чатов');
      const data = await res.json();
      setConversations(data.conversations ?? []);
    } catch {
      onShowAlert?.('Не удалось загрузить чаты', 'error');
    } finally {
      setIsLoadingConversations(false);
    }
  }, [onShowAlert]);

  // Загрузка сообщений для конкретного бронирования
  const loadMessages = useCallback(async (bookingId: string) => {
    setIsLoadingMessages(true);
    try {
      const res = await fetch(`/api/chat/${bookingId}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Ошибка загрузки сообщений');
      const data = await res.json();
      setMessages(data.messages ?? []);
      setChatMeta({
        itemTitle: data.itemTitle,
        itemPhoto: data.itemPhoto,
        otherUser: data.otherUser,
      });
    } catch {
      onShowAlert?.('Не удалось загрузить сообщения', 'error');
    } finally {
      setIsLoadingMessages(false);
    }
  }, [onShowAlert]);

  // Открыть чат
  const openChat = useCallback((bookingId: string) => {
    setActiveBookingId(bookingId);
    loadMessages(bookingId);
  }, [loadMessages]);

  // Закрыть чат (вернуться к списку)
  const closeChat = useCallback(() => {
    setActiveBookingId(null);
    setMessages([]);
    setChatMeta(null);
    loadConversations();
  }, [loadConversations]);

  // Отправить сообщение
  const sendMessage = useCallback(async (text: string) => {
    if (!activeBookingId || !text.trim()) return;

    try {
      const res = await fetch(`/api/chat/${activeBookingId}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ text: text.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Ошибка отправки');
      }
      const msg: ChatMessage = await res.json();
      setMessages(prev => [...prev, msg]);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Не удалось отправить сообщение';
      onShowAlert?.(message, 'error');
    }
  }, [activeBookingId, onShowAlert]);

  // Загрузка непрочитанных
  const loadUnreadCount = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/unread', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setUnreadTotal(data.unreadCount ?? 0);
      }
    } catch {
      // тихо
    }
  }, []);

  // Supabase Realtime подписка на новые сообщения
  useEffect(() => {
    if (!currentUserId) return;

    const supabase = getSupabaseClient();
    const channel = supabase
      .channel('messages-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMsg = payload.new as {
            id: string;
            booking_id: string;
            sender_id: string;
            text: string;
            is_read: boolean;
            created_at: string;
          };

          // Если это сообщение для активного чата — добавить в список
          if (activeBookingId && newMsg.booking_id === activeBookingId && newMsg.sender_id !== currentUserId) {
            const chatMessage: ChatMessage = {
              _id: newMsg.id,
              bookingId: newMsg.booking_id,
              senderId: newMsg.sender_id,
              text: newMsg.text,
              isRead: newMsg.is_read,
              createdAt: newMsg.created_at,
            };
            setMessages(prev => [...prev, chatMessage]);

            // Отметить как прочитанное
            fetch(`/api/chat/${newMsg.booking_id}`, { headers: getAuthHeaders() }).catch(() => {});
          }

          // Обновить счётчик непрочитанных
          if (newMsg.sender_id !== currentUserId) {
            setUnreadTotal(prev => prev + 1);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, activeBookingId]);

  return {
    conversations,
    messages,
    activeBookingId,
    chatMeta,
    isLoadingConversations,
    isLoadingMessages,
    unreadTotal,
    loadConversations,
    loadMessages,
    openChat,
    closeChat,
    sendMessage,
    loadUnreadCount,
  };
}
