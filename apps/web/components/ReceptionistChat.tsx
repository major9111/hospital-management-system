'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, Send, AlertTriangle } from 'lucide-react';
import { authFetch } from '@/lib/api';

type Message = { role: 'user' | 'assistant'; content: string };

export function ReceptionistChat() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hi — I'm the front-desk assistant. What brings you in today?" },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [escalated, setEscalated] = useState(false);
  const sessionId = useRef(`web-${Date.now()}`);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  async function send() {
    if (!input.trim() || sending) return;
    const userMessage: Message = { role: 'user', content: input };
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setSending(true);
    try {
      const data = await authFetch('/ai/receptionist/chat', {
        method: 'POST',
        body: JSON.stringify({
          patient_message: userMessage.content,
          session_id: sessionId.current,
          history,
        }),
      });
      setMessages((prev) => [...prev, { role: 'assistant', content: data.message }]);
      if (data.action === 'escalate_to_human') setEscalated(true);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Sorry — something went wrong (${err.message}).` },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="border border-hairline bg-white rounded-md flex flex-col h-[560px] sticky top-8">
      <div className="px-5 py-3 border-b border-hairline flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-clinical" />
          <h3 className="font-display text-base font-semibold text-ink">AI receptionist</h3>
        </div>
        {escalated && (
          <span className="flex items-center gap-1 font-mono text-xs px-2 py-0.5 rounded-badge bg-signal-light text-signal border border-signal/30">
            <AlertTriangle className="w-3 h-3" /> escalated
          </span>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <p
              className={`text-sm px-3 py-2 rounded-md max-w-[85%] ${
                m.role === 'user' ? 'bg-clinical text-white' : 'bg-clinical-light text-ink'
              }`}
            >
              {m.content}
            </p>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <p className="text-sm px-3 py-2 rounded-md bg-clinical-light text-ink-muted italic">…</p>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); send(); }}
        className="border-t border-hairline p-3 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={escalated}
          placeholder={escalated ? 'A staff member will follow up shortly' : 'Type a message…'}
          className="flex-1 border border-hairline px-3 py-2 rounded-sm text-sm disabled:opacity-50 focus-visible:outline-clinical"
        />
        <button
          type="submit"
          disabled={sending || escalated}
          className="bg-clinical hover:bg-clinical-dark text-white px-3 py-2 rounded-sm disabled:opacity-60"
          aria-label="Send"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
