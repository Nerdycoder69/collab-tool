import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../utils/api.js';
import { encrypt, decrypt } from '../utils/crypto.js';
import { useSocket } from '../hooks/useSocket.js';
import { useAuthStore } from '../store/authStore.js';
import { useBoardStore } from '../store/boardStore.js';

export default function ChatPanel({ workspaceId, boardId }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [typingUser, setTypingUser] = useState(null);
  const messagesEndRef = useRef(null);
  const typingTimeout = useRef(null);
  const { token, user } = useAuthStore();
  const { emit, on } = useSocket(token);

  // Get the board's encryption key
  const encryptionKey = useBoardStore((s) => s.currentBoard?.encryptionKey);

  // Decrypt a single message
  const decryptMessage = useCallback(
    async (msg) => {
      if (!encryptionKey || !msg.ciphertext || !msg.iv) {
        // Legacy unencrypted message fallback
        return { ...msg, text: msg.text || '[encrypted]' };
      }
      try {
        const plaintext = await decrypt(msg.ciphertext, msg.iv, encryptionKey);
        return { ...msg, text: plaintext };
      } catch {
        return { ...msg, text: '[decryption failed]' };
      }
    },
    [encryptionKey]
  );

  // Load and decrypt initial messages
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { messages: msgs } = await api.getMessages(workspaceId, boardId);
        if (cancelled) return;
        // Decrypt all messages
        const decrypted = await Promise.all(msgs.map(decryptMessage));
        if (!cancelled) {
          setMessages(decrypted);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }
    if (encryptionKey) load();
    return () => { cancelled = true; };
  }, [workspaceId, boardId, encryptionKey, decryptMessage]);

  // Listen for real-time messages and decrypt
  const handleNewMessage = useCallback(
    async (data) => {
      const decrypted = await decryptMessage(data.message);
      setMessages((prev) => {
        if (prev.find((m) => m._id === decrypted._id)) return prev;
        return [...prev, decrypted];
      });
    },
    [decryptMessage]
  );

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

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || !encryptionKey) return;

    // Encrypt on the client before sending
    const { ciphertext, iv } = await encrypt(text.trim(), encryptionKey);
    emit('chat:send', { boardId, ciphertext, iv });
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
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        <span>{'\u{1F512}'}</span>
        Board Chat
        <span style={{ fontSize: '0.625rem', color: 'var(--success)', fontWeight: 400 }}>
          E2E Encrypted
        </span>
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
        <button className="btn-primary" type="submit" disabled={!text.trim() || !encryptionKey}>
          Send
        </button>
      </form>
    </div>
  );
}
