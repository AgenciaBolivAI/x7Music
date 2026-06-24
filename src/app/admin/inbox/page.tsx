'use client';

import { useEffect, useState } from 'react';
import { Mail, MailOpen, Reply, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import {
  getAllMessages,
  markRead,
  replyMessage,
  deleteMessage,
  type Message,
} from '@/api/messageApi';
import { useLanguage } from '@/context/LanguageContext';

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });

const statusBadge = (status: Message['status']) => {
  const map = { unread: 'badge-unread', read: 'badge-read', replied: 'badge-replied' };
  return <span className={`badge ${map[status]}`}>{status}</span>;
};

export default function AdminInboxPage() {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read' | 'replied'>('all');

  const filterLabels: Record<string, string> = {
    all: t('admin.inbox.allMessages'),
    unread: t('admin.inbox.unread'),
    read: t('admin.inbox.read'),
    replied: t('admin.inbox.replied'),
  };

  const load = () => {
    setLoading(true);
    getAllMessages()
      .then((res) => setMessages(res.data.messages))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleExpand = async (msg: Message) => {
    if (expanded === msg._id) {
      setExpanded(null);
      return;
    }
    setExpanded(msg._id);
    if (msg.status === 'unread') {
      await markRead(msg._id).catch(() => {});
      setMessages((prev) =>
        prev.map((m) => (m._id === msg._id ? { ...m, status: 'read' } : m))
      );
    }
  };

  const handleReply = async (id: string) => {
    const text = replyText[id]?.trim();
    if (!text) return;
    setSending(id);
    try {
      await replyMessage(id, text);
      setMessages((prev) =>
        prev.map((m) =>
          m._id === id ? { ...m, status: 'replied', adminReply: text } : m
        )
      );
      setReplyText((prev) => ({ ...prev, [id]: '' }));
    } catch {
      alert('Failed to send reply. Please try again.');
    } finally {
      setSending(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this message?')) return;
    await deleteMessage(id).catch(() => {});
    setMessages((prev) => prev.filter((m) => m._id !== id));
    if (expanded === id) setExpanded(null);
  };

  const filtered = filter === 'all' ? messages : messages.filter((m) => m.status === filter);
  const unreadCount = messages.filter((m) => m.status === 'unread').length;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white">{t('admin.inbox.title')}</h1>
          {unreadCount > 0 && (
            <p className="text-brand-gray-muted mt-1">
              {unreadCount} {unreadCount !== 1 ? t('admin.inbox.unreadCountPlural') : t('admin.inbox.unreadCount')}
            </p>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {(['all', 'unread', 'read', 'replied'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors capitalize
              ${filter === f ? 'bg-brand-red text-white' : 'bg-brand-gray text-brand-gray-muted hover:text-white'}`}
          >
            {filterLabels[f]}
            {f === 'unread' && unreadCount > 0 && (
              <span className="ml-1.5 bg-white/20 text-white text-xs px-1.5 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Mail size={40} className="text-brand-gray-muted mx-auto mb-4" />
          <p className="text-brand-gray-muted">{t('admin.inbox.noMessages')}{filter !== 'all' ? ` in "${filterLabels[filter]}"` : ''}.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((msg) => (
            <div
              key={msg._id}
              className={`card overflow-hidden transition-all ${msg.status === 'unread' ? 'border-l-2 border-brand-red' : ''}`}
            >
              {/* Message header (always visible) */}
              <button
                className="w-full text-left px-5 py-4 flex items-start gap-3"
                onClick={() => handleExpand(msg)}
              >
                <div className="mt-0.5 text-brand-gray-muted shrink-0">
                  {msg.status === 'unread' ? <Mail size={18} className="text-brand-red" /> : <MailOpen size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-white text-sm">{msg.senderName}</span>
                    <span className="text-brand-gray-muted text-sm">&lt;{msg.senderEmail}&gt;</span>
                    {statusBadge(msg.status)}
                  </div>
                  <p className="text-white text-sm mt-0.5 truncate">{msg.subject}</p>
                  <p className="text-brand-gray-muted text-xs mt-0.5">{formatDate(msg.createdAt)}</p>
                </div>
                <div className="shrink-0 text-brand-gray-muted mt-1">
                  {expanded === msg._id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </button>

              {/* Expanded body */}
              {expanded === msg._id && (
                <div className="border-t border-white/10 px-5 py-4 space-y-4">
                  {/* Message body */}
                  <div className="bg-brand-black/40 rounded-lg p-4">
                    <p className="text-brand-gray-muted text-xs mb-2 uppercase tracking-wide">{t('admin.inbox.message')}</p>
                    <p className="text-white text-sm whitespace-pre-wrap">{msg.body}</p>
                  </div>

                  {/* Previous reply */}
                  {msg.adminReply && (
                    <div className="bg-brand-red/5 border border-brand-red/20 rounded-lg p-4">
                      <p className="text-brand-red text-xs mb-2 uppercase tracking-wide">{t('admin.inbox.yourReply')}</p>
                      <p className="text-white text-sm whitespace-pre-wrap">{msg.adminReply}</p>
                    </div>
                  )}

                  {/* Reply box */}
                  <div>
                    <label className="label">{t('admin.inbox.replyTo')} {msg.senderName}</label>
                    <textarea
                      rows={4}
                      className="input w-full resize-none"
                      placeholder={t('admin.inbox.replyPlaceholder')}
                      value={replyText[msg._id] ?? ''}
                      onChange={(e) =>
                        setReplyText((prev) => ({ ...prev, [msg._id]: e.target.value }))
                      }
                    />
                    <div className="flex items-center justify-between mt-3">
                      <button
                        className="btn-primary flex items-center gap-2 text-sm"
                        onClick={() => handleReply(msg._id)}
                        disabled={!replyText[msg._id]?.trim() || sending === msg._id}
                      >
                        <Reply size={15} />
                        {sending === msg._id ? t('admin.inbox.sending') : t('admin.inbox.sendReply')}
                      </button>
                      <button
                        className="text-red-400 hover:text-red-300 flex items-center gap-1.5 text-sm"
                        onClick={() => handleDelete(msg._id)}
                      >
                        <Trash2 size={14} /> {t('admin.inbox.delete2')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
