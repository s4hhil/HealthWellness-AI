import React, { useState, useRef, useEffect } from 'react';

interface Message {
  sender: 'user' | 'agent';
  text: string;
  agentName?: string;
  thoughtTrace?: string[];
  toolCalls?: any[];
}

export default function ChatWindow() {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'agent',
      text: "Hello! I am your Personal Health Assistant. I can coordinate with our specialized coaching, nutrition, mental wellness, and cycle tracking agents to help you achieve your goals. What's on your mind today?",
      agentName: 'Personal Health Assistant'
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [expandedTraceIdx, setExpandedTraceIdx] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userMessage: Message = { sender: 'user', text: query };
    setMessages(prev => [...prev, userMessage]);
    setQuery('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.text })
      });
      const data = await response.json();

      if (data.success) {
        setMessages(prev => [
          ...prev,
          {
            sender: 'agent',
            text: data.data.output,
            agentName: data.data.routedAgent,
            thoughtTrace: data.data.thoughtTrace,
            toolCalls: data.data.toolCalls
          }
        ]);
      } else {
        setMessages(prev => [
          ...prev,
          {
            sender: 'agent',
            text: `Error: ${data.error || 'Failed to get agent response.'}`,
            agentName: 'System Monitor'
          }
        ]);
      }
    } catch (e: any) {
      setMessages(prev => [
        ...prev,
        {
          sender: 'agent',
          text: `Connection error: Could not reach backend agents.`,
          agentName: 'System Monitor'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🤖</span>
          <strong>HealthWellness Agent Orchestrator</strong>
        </div>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          ADK Multi-Agent Routing Active
        </span>
      </div>

      <div className="chat-messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message-bubble ${msg.sender}`}>
            {msg.agentName && (
              <div className="agent-name-tag">
                🤖 {msg.agentName}
              </div>
            )}
            <div>{msg.text}</div>
            
            {msg.toolCalls && msg.toolCalls.length > 0 && (
              <div style={{ marginTop: '10px', fontSize: '12px', background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '4px' }}>
                <div style={{ color: 'var(--accent-cyan)', fontWeight: 'bold', marginBottom: '4px' }}>⚙️ Invoked Tool:</div>
                {msg.toolCalls.map((tc, tcIdx) => (
                  <div key={tcIdx} style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {tc.toolName}({JSON.stringify(tc.arguments)})
                  </div>
                ))}
              </div>
            )}

            {msg.thoughtTrace && msg.thoughtTrace.length > 0 && (
              <>
                <div 
                  className="trace-toggle"
                  onClick={() => setExpandedTraceIdx(expandedTraceIdx === idx ? null : idx)}
                >
                  {expandedTraceIdx === idx ? '▼ Hide ADK Thought Trace' : '▶ Show ADK Thought Trace'}
                </div>
                {expandedTraceIdx === idx && (
                  <div className="trace-box">
                    {msg.thoughtTrace.map((line, traceId) => (
                      <div key={traceId} style={{ marginBottom: '4px' }}>{line}</div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
        {loading && (
          <div className="message-bubble agent" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ color: 'var(--accent-purple)' }}>Thinking...</span>
            <div className="status-dot" style={{ animation: 'logo-glow 1s infinite alternate' }}></div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-area" onSubmit={handleSubmit}>
        <input
          type="text"
          className="chat-input"
          placeholder="Ask a question (e.g. 'Suggest a low-carb dinner' or 'Log water intake')"
          value={query}
          onChange={e => setQuery(e.target.value)}
          disabled={loading}
        />
        <button type="submit" className="btn-primary" disabled={loading}>
          Send Query
        </button>
      </form>
    </div>
  );
}
