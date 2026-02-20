'use client';
import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Send, Plus, LifeBuoy, Clock, CheckCircle, AlertCircle, Loader2, Lock, Search } from 'lucide-react';
import { getAuthHeaders } from '@/hooks/use-auth';
import type { User, AlertType, SupportTicket, SupportMessage, SupportCategory, SupportStatus } from '@/types';

interface SupportSectionProps {
  mode: 'user' | 'admin';
  currentUser: User;
  showAlert: (message: string, type?: AlertType) => void;
  onClose?: () => void; // user mode: back to chat list
}

const CATEGORY_LABELS: Record<SupportCategory, string> = {
  technical: 'Технические проблемы',
  other: 'Другое',
};

const STATUS_LABELS: Record<SupportStatus, string> = {
  open: 'Открыто',
  in_progress: 'В работе',
  closed: 'Закрыто',
};

const STATUS_COLORS: Record<SupportStatus, string> = {
  open: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  closed: 'bg-gray-100 text-gray-600',
};

export default function SupportSection({ mode, currentUser, showAlert, onClose }: SupportSectionProps) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('open');
  const [showNewForm, setShowNewForm] = useState(false);

  const [search, setSearch] = useState('');

  // New ticket form state
  const [newSubject, setNewSubject] = useState('');
  const [newCategory, setNewCategory] = useState<SupportCategory>('technical');
  const [newMessage, setNewMessage] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadTickets = async () => {
    setIsLoading(true);
    try {
      const params = mode === 'admin' ? `?status=${statusFilter}` : '';
      const res = await fetch('/api/support' + params, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTickets(data.tickets || []);
    } catch {
      showAlert('Не удалось загрузить обращения', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTicketMessages = async (ticket: SupportTicket) => {
    setIsLoadingMessages(true);
    setActiveTicket(ticket);
    setMessages([]);
    try {
      const res = await fetch(`/api/support/${ticket._id}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMessages(data.messages || []);
      // Update unread flag in local list
      setTickets(prev =>
        prev.map(t =>
          t._id === ticket._id
            ? { ...t, unreadByUser: false, unreadByAdmin: false }
            : t,
        ),
      );
    } catch {
      showAlert('Не удалось загрузить сообщения', 'error');
    } finally {
      setIsLoadingMessages(false);
    }
  };

  useEffect(() => {
    loadTickets();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleCreateTicket = async () => {
    if (!newSubject.trim() || newSubject.trim().length < 5) {
      showAlert('Тема должна содержать не менее 5 символов', 'error');
      return;
    }
    if (!newMessage.trim() || newMessage.trim().length < 10) {
      showAlert('Сообщение должно содержать не менее 10 символов', 'error');
      return;
    }
    setIsCreating(true);
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: newSubject.trim(), category: newCategory, message: newMessage.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Ошибка');
      }
      const data = await res.json();
      showAlert('Обращение создано', 'success');
      setShowNewForm(false);
      setNewSubject('');
      setNewMessage('');
      setNewCategory('technical');
      setTickets(prev => [data.ticket, ...prev]);
      await loadTicketMessages(data.ticket);
    } catch (e: unknown) {
      showAlert(e instanceof Error ? e.message : 'Не удалось создать обращение', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !activeTicket || isSending) return;
    setIsSending(true);
    const text = replyText;
    setReplyText('');
    try {
      const res = await fetch(`/api/support/${activeTicket._id}/messages`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Ошибка');
      }
      const data = await res.json();
      setMessages(prev => [...prev, data.message]);
    } catch (e: unknown) {
      setReplyText(text);
      showAlert(e instanceof Error ? e.message : 'Не удалось отправить сообщение', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleChangeStatus = async (status: SupportStatus) => {
    if (!activeTicket) return;
    try {
      const res = await fetch(`/api/support/${activeTicket._id}`, {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setActiveTicket(prev => prev ? { ...prev, status: data.ticket.status, closedAt: data.ticket.closedAt } : prev);
      setTickets(prev => prev.map(t => t._id === activeTicket._id ? { ...t, status: data.ticket.status } : t));
      showAlert(`Статус обновлён: ${STATUS_LABELS[status]}`, 'success');
    } catch {
      showAlert('Не удалось изменить статус', 'error');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  };

  const formatTime = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  // ======================== NEW TICKET FORM ========================
  if (showNewForm) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setShowNewForm(false)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-lg font-semibold">Новое обращение</h2>
        </div>

        <Card>
          <CardContent className="pt-5 space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Категория</label>
              <Select value={newCategory} onValueChange={(v) => setNewCategory(v as SupportCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="technical">Технические проблемы</SelectItem>
                  <SelectItem value="other">Другое</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Тема</label>
              <Input
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder="Кратко опишите проблему..."
                maxLength={255}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Сообщение</label>
              <Textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Подробно опишите проблему или вопрос..."
                rows={5}
                maxLength={5000}
              />
            </div>
            <Button
              onClick={handleCreateTicket}
              disabled={isCreating || !newSubject.trim() || !newMessage.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
            >
              {isCreating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Отправить обращение
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ======================== TICKET DETAIL VIEW ========================
  if (activeTicket) {
    const isAdmin = mode === 'admin';
    return (
      <div className="flex flex-col h-[calc(100vh-200px)] max-h-[700px]">
        {/* Header */}
        <Card className="rounded-b-none">
          <CardHeader className="py-3 px-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => { setActiveTicket(null); setMessages([]); }}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-base truncate">{activeTicket.subject}</CardTitle>
                  <Badge className={`text-xs ${STATUS_COLORS[activeTicket.status]}`}>
                    {STATUS_LABELS[activeTicket.status]}
                  </Badge>
                </div>
                <p className="text-sm text-gray-500">
                  {CATEGORY_LABELS[activeTicket.category]}
                  {isAdmin && activeTicket.user && ` · ${activeTicket.user.name}`}
                </p>
              </div>
              {/* Admin status actions */}
              {isAdmin && (
                <div className="flex gap-1 flex-shrink-0">
                  {activeTicket.status !== 'in_progress' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-blue-600 border-blue-200 hover:bg-blue-50 text-xs"
                      onClick={() => handleChangeStatus('in_progress')}
                    >
                      В работе
                    </Button>
                  )}
                  {activeTicket.status !== 'closed' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-gray-600 border-gray-200 hover:bg-gray-50 text-xs"
                      onClick={() => handleChangeStatus('closed')}
                    >
                      Закрыть
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 text-xs"
                      onClick={() => handleChangeStatus('open')}
                    >
                      Открыть
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Messages */}
        <div
          className="flex-1 overflow-y-auto bg-gray-50 border-x px-4 py-3 space-y-3"
          role="log"
          aria-live="polite"
        >
          {isLoadingMessages ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-400">Нет сообщений</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = isAdmin ? msg.isAdmin : !msg.isAdmin;
              return (
                <div key={msg._id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                      isMine
                        ? 'bg-indigo-600 text-white rounded-br-md'
                        : msg.isAdmin
                          ? 'bg-indigo-50 border border-indigo-200 rounded-bl-md'
                          : 'bg-white border rounded-bl-md'
                    }`}
                  >
                    {!isMine && (
                      <p className={`text-xs font-medium mb-0.5 ${msg.isAdmin ? 'text-indigo-600' : 'text-gray-600'}`}>
                        {msg.isAdmin ? 'Служба поддержки' : (msg.user?.name || 'Пользователь')}
                      </p>
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

        {/* Reply input or closed notice */}
        {activeTicket.status === 'closed' ? (
          <Card className="rounded-t-none">
            <CardContent className="p-3 text-center text-sm text-gray-500 flex items-center justify-center gap-2">
              <Lock className="w-4 h-4 flex-shrink-0" />
              <span>
                Обращение закрыто.
                {isAdmin
                  ? ' Нажмите «Открыть», чтобы продолжить переписку.'
                  : ' Создайте новое обращение, если проблема не решена.'}
              </span>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-t-none">
            <CardContent className="p-3">
              <div className="flex gap-2">
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Введите сообщение..."
                  disabled={isSending}
                  className="flex-1 resize-none min-h-[40px] max-h-[120px]"
                  rows={1}
                  maxLength={5000}
                />
                <Button
                  onClick={handleSendReply}
                  disabled={!replyText.trim() || isSending}
                  size="icon"
                  className="bg-indigo-600 hover:bg-indigo-700 self-end"
                  aria-label="Отправить"
                >
                  {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // ======================== TICKET LIST VIEW ========================
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {mode === 'user' && onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <LifeBuoy className="w-5 h-5" />
            Служба поддержки
          </h2>
        </div>
        {mode === 'user' && (
          <Button
            size="sm"
            onClick={() => setShowNewForm(true)}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4 mr-1" />
            Новое обращение
          </Button>
        )}
      </div>

      {/* Admin status filter */}
      {mode === 'admin' && (
        <div className="flex gap-2">
          {(['open', 'in_progress', 'closed'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={mode === 'admin' ? 'Поиск по теме или пользователю...' : 'Поиск по теме...'}
          className="pl-9"
        />
      </div>

      {/* Tickets list */}
      {isLoading ? (
        <div className="py-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-300 mx-auto" />
        </div>
      ) : tickets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <LifeBuoy className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">
              {mode === 'user' ? 'У вас нет обращений' : 'Нет обращений'}
            </p>
            {mode === 'user' && (
              <Button
                className="mt-4 bg-indigo-600 hover:bg-indigo-700"
                onClick={() => setShowNewForm(true)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Создать обращение
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {tickets.filter(t => {
            if (!search.trim()) return true;
            const q = search.toLowerCase();
            return t.subject.toLowerCase().includes(q) ||
              (mode === 'admin' && t.user?.name?.toLowerCase().includes(q));
          }).map((ticket) => {
            const hasUnread = mode === 'admin' ? ticket.unreadByAdmin : ticket.unreadByUser;
            return (
              <Card
                key={ticket._id}
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => loadTicketMessages(ticket)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 flex-shrink-0 ${ticket.status === 'closed' ? 'text-gray-400' : 'text-indigo-500'}`}>
                      {ticket.status === 'closed' ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : ticket.status === 'in_progress' ? (
                        <Clock className="w-5 h-5 text-blue-500" />
                      ) : (
                        <AlertCircle className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`font-medium truncate ${hasUnread ? 'text-gray-900' : 'text-gray-700'}`}>
                          {ticket.subject}
                        </p>
                        <span className="text-xs text-gray-400 flex-shrink-0">
                          {formatTime(ticket.updatedAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge className={`text-xs ${STATUS_COLORS[ticket.status]}`}>
                          {STATUS_LABELS[ticket.status]}
                        </Badge>
                        <span className="text-xs text-gray-400">
                          {CATEGORY_LABELS[ticket.category]}
                        </span>
                        {mode === 'admin' && ticket.user && (
                          <span className="text-xs text-gray-500">{ticket.user.name}</span>
                        )}
                        {ticket.messageCount !== undefined && (
                          <span className="text-xs text-gray-400">{ticket.messageCount} сообщ.</span>
                        )}
                      </div>
                    </div>
                    {hasUnread && (
                      <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 flex-shrink-0 mt-2" />
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
