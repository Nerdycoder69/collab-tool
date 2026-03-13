import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../utils/api.js';
import { useSocket } from '../hooks/useSocket.js';
import { useAuthStore } from '../store/authStore.js';

export default function ChatPanel({ workspaceId, boardId }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [typingUser, setTypingUser] = useState(null);
  const messagesEndRef = useRef(null);
  const typingTimeout = useRef(null);
  const { token, user } = useAuthStore();
  const { emit, on } = useSocket(token);

  // Load initial messages
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { messages: msgs } = await api.getMessages(workspaceId, boardId);
        if (!cancelled) {
          setMessages(msgs);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [workspaceId, boardId]);

  // Listen for real-time messages
  const handleNewMessage = useCallback((data) => {
    setMessages((prev) => {
      if (prev.find((m) => m._id === data.message._id)) return prev;
      return [...prev, data.message];
    });
  }, []);

  const handleTyping = useCallback((data) => {
    if (data.user._id === user?._id) return;
    setTypingUser(data.user.name);
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => setTypingUser(null), 2000);
  }, [user]);

  useEffect(() => {
    const unsubs = [
      on('chat:message', handleNewMessage),
      on('chat:typing', handleTyping),
    ];
    return () => unsubs.forEach((u) => u && u());
  }, [on, handleNewMessage, handleTyping]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    emit('chat:send', { boardId, text: text.trim() });
    setText('');
  };

  const handleInputChange = (e) => {
    setText(e.target.value);
    emit('chat:typing', { boardId });
  };

  const colors = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#3b82f6'];
  const getColor = (name) => colors[name.charCodeAt(0) % colors.length];

  return (
    <div
      style={{
        width: '320px',
        minWidth: '320px',
        background: 'var(--bg-secondary)',
        borderRadius: 'var(--radius)',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: 'calc(100vh - 180px)',
        border: '1px solid var(--border)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '0.75rem 1rem',
          borderBottom: '1px solid var(--border)',
          fontWeight: 600,
          fontSize: '0.875rem',
        }}
      >
        Board Chat
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
        }}
      >
        {loading && (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', textAlign: 'center' }}>
            Loading messages...
          </p>
        )}

        {!loading && messages.length === 0 && (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', textAlign: 'center', marginTop: '2rem' }}>
            No messages yet. Start the conversation!
          </p>
        )}

        {messages.map((msg) => {
          const isMe = msg.author?._id === user?._id;
          return (
            <div
              key={msg._id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isMe ? 'flex-end' : 'flex-start',
              }}
            >
              {!isMe && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.125rem' }}>
                  <div
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: getColor(msg.author?.name || '?'),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.5625rem',
                      fontWeight: 700,
                      color: 'white',
                      flexShrink: 0,
                    }}
                  >
                    {msg.author?.name?.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    {msg.author?.name}
                  </span>
                </div>
              )}
              <div
                style={{
                  background: isMe ? 'var(--accent)' : 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '12px',
                  borderTopRightRadius: isMe ? '4px' : '12px',
                  borderTopLeftRadius: isMe ? '12px' : '4px',
                  maxWidth: '85%',
                  fontSize: '0.8125rem',
                  lineHeight: 1.4,
                  wordBreak: 'break-word',
                }}
              >
                {msg.text}
              </div>
              <span
                style={{
                  fontSize: '0.625rem',
                  color: 'var(--text-secondary)',
                  marginTop: '0.125rem',
                  opacity: 0.7,
                }}
              >
                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing indicator */}
      {typingUser && (
        <div style={{ padding: '0 1rem 0.25rem', fontSize: '0.6875rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
          {typingUser} is typing...
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={handleSend}
        style={{
          display: 'flex',
          gap: '0.5rem',
          padding: '0.75rem',
          borderTop: '1px solid var(--border)',
        }}
      >
        <input
          placeholder="Type a message..."
          value={text}
          onChange={handleInputChange}
          style={{ flex: 1 }}
        />
        <button className="btn-primary" type="submit" disabled={!text.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
