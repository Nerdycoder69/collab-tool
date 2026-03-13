import { useState } from 'react';
import { useBoardStore } from '../store/boardStore.js';
import { getSocket } from '../hooks/useSocket.js';
import { api } from '../utils/api.js';

export default function CardModal({ card, workspaceId, boardId, onClose }) {
  const { updateCard, deleteCard } = useBoardStore();
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || '');
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

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
        socket.emit('card:deleted', { boardId, cardId: card._id });
      }
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    try {
      await api.addComment(workspaceId, boardId, card._id, {
        text: comment.trim(),
      });
      setComment('');
      // Refresh card data
      const { fetchBoard } = useBoardStore.getState();
      fetchBoard(workspaceId, boardId);
    } catch (err) {
      console.error(err);
    }
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
                <p style={{ fontSize: '0.8125rem' }}>{c.text}</p>
              </div>
            ))}

            <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                placeholder="Add a comment..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
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
