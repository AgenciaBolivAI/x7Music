'use client';

import { useEffect, useRef, useState } from 'react';
import { Bot, Send, X, Sparkles, Check } from 'lucide-react';
import { askAgent, executeAgentAction, type AgentChatMsg, type PendingAction } from '@/api/agentApi';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';

interface UiMsg extends AgentChatMsg {
  pending?: PendingAction | null;
  note?: string; // system note (e.g. action result)
}

export default function AgentWidget() {
  const { isAuthenticated, user } = useAuth();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<UiMsg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open, loading]);

  // Renders for everyone. Logged-in users get the role-scoped agent (the JWT is
  // attached automatically); anonymous visitors get the restricted public agent.
  const greeting = isAuthenticated
    ? t('agent.greeting').replace('{name}', user?.firstName || '')
    : t('agent.greetingPublic');
  const subtitle = isAuthenticated ? t('agent.subtitle') : t('agent.subtitlePublic');

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    const next: UiMsg[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setLoading(true);
    try {
      const history: AgentChatMsg[] = next.map((m) => ({ role: m.role, content: m.content }));
      const res = await askAgent(history);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: res.data.answer || t('agent.noAnswer'), pending: res.data.pendingAction },
      ]);
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setMessages((prev) => [...prev, { role: 'assistant', content: msg || t('agent.error') }]);
    } finally {
      setLoading(false);
    }
  };

  const confirmAction = async (idx: number, action: PendingAction) => {
    setConfirming(true);
    try {
      const res = await executeAgentAction(action.name, action.args);
      setMessages((prev) =>
        prev.map((m, i) => (i === idx ? { ...m, pending: null, note: res.data.message } : m))
      );
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setMessages((prev) => prev.map((m, i) => (i === idx ? { ...m, pending: null, note: msg || t('agent.error') } : m)));
    } finally {
      setConfirming(false);
    }
  };

  return (
    <>
      {/* Launcher */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label={t('agent.title')}
          className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-brand-red text-white shadow-xl flex items-center justify-center hover:bg-brand-red-light transition-colors"
        >
          <Bot size={24} />
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed bottom-5 right-5 z-50 w-[min(94vw,380px)] h-[min(80vh,560px)] flex flex-col card shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-brand-black border-b border-brand-red/40">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-brand-red/20 flex items-center justify-center">
                <Bot size={16} className="text-brand-red" />
              </div>
              <div>
                <p className="text-white text-sm font-semibold leading-tight">{t('agent.title')}</p>
                <p className="text-brand-gray-muted text-[10px] leading-tight flex items-center gap-1">
                  <Sparkles size={9} /> {t('agent.poweredBy')}
                </p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-brand-gray-muted hover:text-white">
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center mt-6">
                <div className="w-12 h-12 rounded-full bg-brand-red/10 flex items-center justify-center mx-auto mb-3">
                  <Bot size={22} className="text-brand-red" />
                </div>
                <p className="text-white text-sm font-medium">{greeting}</p>
                <p className="text-brand-gray-muted text-xs mt-1">{subtitle}</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user' ? 'bg-brand-red text-white' : 'bg-brand-gray-light text-gray-100'
                  }`}
                >
                  {m.content}
                  {m.pending && (
                    <div className="mt-2 border-t border-white/10 pt-2">
                      <p className="text-xs text-brand-gray-muted mb-2">{m.pending.summary}</p>
                      <button
                        disabled={confirming}
                        onClick={() => confirmAction(i, m.pending!)}
                        className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5"
                      >
                        <Check size={13} /> {confirming ? t('agent.working') : t('agent.confirm')}
                      </button>
                    </div>
                  )}
                  {m.note && (
                    <div className="mt-2 border-t border-white/10 pt-2 text-xs text-green-400 flex items-center gap-1.5">
                      <Check size={13} /> {m.note}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-brand-gray-light rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-brand-gray-muted rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-brand-gray-muted rounded-full animate-bounce" style={{ animationDelay: '120ms' }} />
                    <span className="w-1.5 h-1.5 bg-brand-gray-muted rounded-full animate-bounce" style={{ animationDelay: '240ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-brand-gray-light p-3">
            <form
              onSubmit={(e) => { e.preventDefault(); send(); }}
              className="flex items-end gap-2"
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                rows={1}
                placeholder={t('agent.placeholder')}
                className="input flex-1 text-sm py-2 resize-none max-h-24"
              />
              <button type="submit" disabled={loading || !input.trim()} className="btn-primary px-3 py-2 shrink-0">
                <Send size={16} />
              </button>
            </form>
            <p className="text-[10px] text-brand-gray-muted text-center mt-2">{t('agent.poweredBy')}</p>
          </div>
        </div>
      )}
    </>
  );
}
