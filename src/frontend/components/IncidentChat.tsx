import React, { useEffect, useState, useRef } from 'react';
import { getMessages, getSteps, getIncident, sendChat } from '../lib/api';
import IncidentTimeline from './IncidentTimeline';

interface IncidentChatProps {
  incidentId: string;
  onBack: () => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

export default function IncidentChat({ incidentId, onBack }: IncidentChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [steps, setSteps] = useState<any[]>([]);
  const [incident, setIncident] = useState<any>(null);
  const [chatInput, setChatInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadData();
    // Poll for updates while investigation is active
    pollRef.current = setInterval(loadData, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [incidentId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadData() {
    try {
      const [incData, msgsData, stepsData] = await Promise.all([
        getIncident(incidentId).catch(() => null),
        getMessages(incidentId).catch(() => []),
        getSteps(incidentId).catch(() => []),
      ]);

      if (incData?.incident) setIncident(incData.incident);
      if (Array.isArray(msgsData)) setMessages(msgsData);
      if (Array.isArray(stepsData)) setSteps(stepsData);

      // Stop polling when complete or failed
      if (incData?.incident?.status === 'completed' || incData?.incident?.status === 'failed') {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }
    } catch {
      // Silently handle poll errors
    } finally {
      setLoading(false);
    }
  }

  async function handleSendChat(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim() || sending) return;

    const msg = chatInput.trim();
    setChatInput('');
    setSending(true);

    // Optimistic add
    setMessages((prev) => [...prev, {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: msg,
      createdAt: new Date().toISOString(),
    }]);

    try {
      const response = await sendChat(incidentId, msg);
      setMessages((prev) => [...prev, {
        id: `resp-${Date.now()}`,
        role: 'assistant',
        content: response.answer,
        createdAt: new Date().toISOString(),
      }]);
    } catch (err) {
      setMessages((prev) => [...prev, {
        id: `err-${Date.now()}`,
        role: 'system',
        content: `Error: ${err instanceof Error ? err.message : 'Failed to send message'}`,
        createdAt: new Date().toISOString(),
      }]);
    } finally {
      setSending(false);
    }
  }

  function renderMessageContent(content: string) {
    // Simple markdown-like rendering
    return content.split('\n').map((line, i) => {
      // Bold
      let processed = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      // Inline code
      processed = processed.replace(/`(.*?)`/g, '<code>$1</code>');

      if (line.startsWith('- ') || line.startsWith('• ')) {
        return <li key={i} className="ml-4 list-disc" dangerouslySetInnerHTML={{ __html: processed.slice(2) }} />;
      }
      if (/^\d+\.\s/.test(line)) {
        return <li key={i} className="ml-4 list-decimal" dangerouslySetInnerHTML={{ __html: processed.replace(/^\d+\.\s/, '') }} />;
      }
      if (!line.trim()) return <br key={i} />;
      return <p key={i} className="mb-1" dangerouslySetInnerHTML={{ __html: processed }} />;
    });
  }

  const isActive = incident?.status && !['completed', 'failed'].includes(incident.status);

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
        <button onClick={onBack} className="btn-secondary p-2" aria-label="Go back">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-[var(--color-accent)]">{incidentId}</span>
            {incident && (
              <span className={`badge status-${incident.status}`}>{incident.status}</span>
            )}
            {isActive && (
              <div className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-pulse" />
            )}
          </div>
          {incident && (
            <p className="text-xs text-[var(--color-text-dim)] truncate">
              {incident.targetUrl}
            </p>
          )}
        </div>
      </div>

      {/* Content Area — split between timeline and chat */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Investigation Timeline (collapsible) */}
        {steps.length > 0 && (
          <div className="px-5 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg)]/50 max-h-48 overflow-y-auto">
            <IncidentTimeline steps={steps} />
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-6 h-6 border-2 border-[var(--color-accent)] border-t-transparent rounded-full" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-[var(--color-text-dim)] text-sm">
              {isActive ? 'Investigation starting…' : 'No messages yet.'}
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`chat-bubble chat-bubble-${msg.role} markdown-content`}>
                  {renderMessageContent(msg.content)}
                </div>
              </div>
            ))
          )}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Chat Input */}
      <form
        onSubmit={handleSendChat}
        className="flex items-center gap-3 px-5 py-3 border-t border-[var(--color-border)] bg-[var(--color-bg-elevated)]"
      >
        <input
          type="text"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          placeholder={isActive ? 'Investigation in progress…' : 'Ask a follow-up question…'}
          className="input-field flex-1"
          disabled={sending}
          id="chat-input"
        />
        <button
          type="submit"
          disabled={sending || !chatInput.trim()}
          className="btn-primary px-4"
          id="chat-send-btn"
        >
          {sending ? (
            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          )}
        </button>
      </form>
    </div>
  );
}
