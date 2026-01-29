'use client';
import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Send, MessageCircle, User as UserIcon } from 'lucide-react';
import { SkeletonList } from '@/components/ui/spinner';
import type { User, AlertType, ChatMessage, ChatConversation } from '@/types';

interface ChatTabProps {
  currentUser: User;
  showAlert: (message: string, type?: AlertType) => void;
  conversations: ChatConversation[];
  messages: ChatMessage[];
  activeBookingId: string | null;
  chatMeta: { itemTitle: string; itemPhoto?: string; otherUser: { _id: string; name: string; photo?: string } } | null;
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  onOpenChat: (bookingId: string) => void;
  onCloseChat: () => void;
  onSendMessage: (text: string) => Promise<void>;
  loadConversations: () => Promise<void>;
  initialBookingId?: string | null;
}

export default function ChatTab({
  currentUser,
  conversations,
  messages,
  activeBookingId,
  chatMeta,
  isLoadingConversations,
  isLoadingMessages,
  onOpenChat,
  onCloseChat,
  onSendMessage,
  loadConversations,
  initialBookingId,
}: ChatTabProps) {
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Открыть чат если передан initialBookingId
  useEffect(() => {
    if (initialBookingId && !activeBookingId) {
      onOpenChat(initialBookingId);
    }
  }, [initialBookingId, activeBookingId, onOpenChat]);

  // Автоскролл к последнему сообщению
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!messageText.trim() || isSending) return;
    setIsSending(true);
    const text = messageText;
    setMessageText('');
    try {
      await onSendMessage(text);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  // --- Список диалогов ---
  if (!activeBookingId) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          Сообщения
        </h2>

        {isLoadingConversations ? (
          <SkeletonList count={4} />
        ) : conversations.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageCircle className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">Нет сообщений</p>
              <p className="text-sm text-gray-400 mt-1">
                Чат появится после создания бронирования
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {conversations.map((conv) => (
              <Card
                key={conv.bookingId}
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => onOpenChat(conv.bookingId)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    {/* Аватар */}
                    <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      {conv.otherUser.photo ? (
                        <img src={conv.otherUser.photo} alt="" className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <UserIcon className="w-6 h-6 text-indigo-600" />
                      )}
                    </div>

                    {/* Контент */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium truncate">{conv.otherUser.name}</p>
                        {conv.lastMessage && (
                          <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                            {formatTime(conv.lastMessage.createdAt)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 truncate">{conv.itemTitle}</p>
                      {conv.lastMessage && (
                        <p className="text-sm text-gray-600 truncate mt-0.5">
                          {conv.lastMessage.senderId === currentUser._id ? 'Вы: ' : ''}
                          {conv.lastMessage.text}
                        </p>
                      )}
                    </div>

                    {/* Непрочитанные */}
                    {conv.unreadCount > 0 && (
                      <Badge className="bg-indigo-600 text-white flex-shrink-0">
                        {conv.unreadCount}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // --- Окно чата ---
  return (
    <div className="flex flex-col h-[calc(100vh-200px)] max-h-[700px]">
      {/* Шапка чата */}
      <Card className="rounded-b-none">
        <CardHeader className="py-3 px-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onCloseChat}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
              {chatMeta?.otherUser.photo ? (
                <img src={chatMeta.otherUser.photo} alt="" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <UserIcon className="w-5 h-5 text-indigo-600" />
              )}
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base truncate">{chatMeta?.otherUser.name ?? 'Чат'}</CardTitle>
              <p className="text-sm text-gray-500 truncate">{chatMeta?.itemTitle}</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Сообщения */}
      <div className="flex-1 overflow-y-auto bg-gray-50 border-x px-4 py-3 space-y-3">
        {isLoadingMessages ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400">Загрузка...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400">Начните переписку</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.senderId === currentUser._id;
            return (
              <div key={msg._id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                    isMine
                      ? 'bg-indigo-600 text-white rounded-br-md'
                      : 'bg-white border rounded-bl-md'
                  }`}
                >
                  {!isMine && msg.senderName && (
                    <p className="text-xs font-medium text-indigo-600 mb-0.5">{msg.senderName}</p>
                  )}
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                  <p className={`text-xs mt-1 ${isMine ? 'text-indigo-200' : 'text-gray-400'}`}>
                    {formatTime(msg.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Ввод сообщения */}
      <Card className="rounded-t-none">
        <CardContent className="p-3">
          <div className="flex gap-2">
            <Input
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Введите сообщение..."
              disabled={isSending}
              className="flex-1"
              maxLength={2000}
            />
            <Button
              onClick={handleSend}
              disabled={!messageText.trim() || isSending}
              size="icon"
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
