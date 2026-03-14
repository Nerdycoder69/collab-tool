import { useState, useEffect, useRef, useCallback } from 'react';
import { useBoardStore } from '../store/boardStore.js';
import { getSocket } from '../hooks/useSocket.js';
import { api } from '../utils/api.js';

export default function CardModal({ card, workspaceId, boardId, onClose }) {
  const { updateCard, deleteCard } = useBoardStore();
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || '');
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState([]);
  const [mentionQuery, setMentionQuery] = useState(null);
  const [mentionResults, setMentionResults] = useState([]);
  const [mentionIndex, setMentionIndex] = useState(0);
  const commentRef = useRef(null);

  // Load workspace members for @mention autocomplete
  useEffect(() => {
    async function loadMembers() {
      try {
        const { workspace } = await api.getWorkspaceMembers(workspaceId);
        if (workspace?.members) {
          setMembers(workspace.members.map((m) => m.user).filter(Boolean));
        }
      } catch {
        // ignore
      }
    }
    loadMembers();
  }, [workspaceId]);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const updated = await updateCard(workspaceId, boardId, card._id, {
        title: title.trim(),
        description: description.trim(),
      });

      const socket = getSocket();
      if (socket) {
        socket.emit('card:updated', { boardId, card: updated });
      }
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteCard(workspaceId, boardId, card._id);
      const socket = getSocket();
      if (socket) {
        socket.emit('card:deleted', { boardId, cardId: card._id, cardTitle: card.title });
      }
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  // Parse @mentions from text
  const extractMentions = (text) => {
    const matches = text.match(/@(\w+(?:\s\w+)?)/g);
    if (!matches) return [];
    return matches.map((m) => m.slice(1));
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    try {
      await api.addComment(workspaceId, boardId, card._id, {
        text: comment.trim(),
      });

      // Emit comment event with mentions for notifications
      const mentions = extractMentions(comment);
      const socket = getSocket();
      if (socket) {
        socket.emit('card:commented', {
          boardId,
          cardId: card._id,
          cardTitle: card.title,
          comment: { text: comment.trim() },
          mentions,
        });
      }

      setComment('');
      setMentionQuery(null);
      // Refresh card data
      const { fetchBoard } = useBoardStore.getState();
      fetchBoard(workspaceId, boardId);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCommentChange = (e) => {
    const val = e.target.value;
    setComment(val);

    // Detect @mention in progress
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = val.substring(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@(\w*)$/);

    if (atMatch) {
      const q = atMatch[1].toLowerCase();
      setMentionQuery(q);
      setMentionResults(
        members.filter(
          (m) => m.name && m.name.toLowerCase().includes(q)
        ).slice(0, 5)
      );
      setMentionIndex(0);
    } else {
      setMentionQuery(null);
      setMentionResults([]);
    }
  };

  const insertMention = (member) => {
    const input = commentRef.current;
    if (!input) return;

    const cursorPos = input.selectionStart;
    const textBeforeCursor = comment.substring(0, cursorPos);
    const textAfterCursor = comment.substring(cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf('@');

    const newText =
      textBeforeCursor.substring(0, atIndex) +
      `@${member.name} ` +
      textAfterCursor;

    setComment(newText);
    setMentionQuery(null);
    setMentionResults([]);

    // Refocus input
    setTimeout(() => {
      input.focus();
      const newPos = atIndex + member.name.length + 2;
      input.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const handleCommentKeyDown = (e) => {
    if (mentionResults.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex((prev) => Math.min(prev + 1, mentionResults.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(mentionResults[mentionIndex]);
      } else if (e.key === 'Escape') {
        setMentionQuery(null);
        setMentionResults([]);
      }
    }
  };

  // Render comment text with highlighted @mentions
  const renderCommentText = (text) => {
    const parts = text.split(/(@\w+(?:\s\w+)?)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return (
          <span key={i} style={{ color: 'var(--accent)', fontWeight: 600 }}>
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: '1rem',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-secondary)',
          borderRadius: '12px',
          padding: '1.5rem',
          width: '100%',
          maxWidth: '520px',
          maxHeight: '80vh',
          overflowY: 'auto',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.125rem' }}>Edit Card</h3>
          <button className="btn-ghost" onClick={onClose}>
            &times;
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
              Title
            </label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button className="btn-danger" onClick={handleDelete}>
              Delete
            </button>
          </div>

          {/* Comments Section */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
            <h4 style={{ fontSize: '0.875rem', marginBottom: '0.75rem' }}>
              Comments ({card.comments?.length || 0})
            </h4>

            {card.comments?.map((c) => (
              <div
                key={c._id}
                style={{
                  background: 'var(--bg-primary)',
                  padding: '0.625rem',
                  borderRadius: 'var(--radius)',
                  marginBottom: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                    {c.author?.name || 'Unknown'}
                  </span>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>
                    {new Date(c.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p style={{ fontSize: '0.8125rem' }}>{renderCommentText(c.text)}</p>
              </div>
            ))}

            <form
              onSubmit={handleAddComment}
              style={{ display: 'flex', gap: '0.5rem', position: 'relative' }}
            >
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  ref={commentRef}
                  placeholder="Add a comment... Use @name to mention"
                  value={comment}
                  onChange={handleCommentChange}
                  onKeyDown={handleCommentKeyDown}
                />

                {/* @mention autocomplete dropdown */}
                {mentionResults.length > 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '100%',
                      left: 0,
                      width: '100%',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      boxShadow: '0 -4px 12px rgba(0,0,0,0.3)',
                      marginBottom: '4px',
                      overflow: 'hidden',
                      zIndex: 10,
                    }}
                  >
                    {mentionResults.map((m, i) => (
                      <div
                        key={m._id}
                        onClick={() => insertMention(m)}
                        style={{
                          padding: '0.5rem 0.75rem',
                          cursor: 'pointer',
                          background: i === mentionIndex ? 'var(--accent)' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          fontSize: '0.8125rem',
                        }}
                      >
                        <div
                          style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            background: i === mentionIndex ? 'rgba(255,255,255,0.2)' : 'var(--accent)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.625rem',
                            fontWeight: 700,
                            color: 'white',
                          }}
                        >
                          {m.name?.charAt(0).toUpperCase()}
                        </div>
                        <span>{m.name}</span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.6875rem', marginLeft: 'auto' }}>
                          {m.email}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button className="btn-primary" type="submit" style={{ whiteSpace: 'nowrap' }}>
                Post
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
