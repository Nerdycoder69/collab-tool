import { useState } from 'react';
import { useBoardStore } from '../store/boardStore.js';
import { getSocket } from '../hooks/useSocket.js';
import CardModal from './CardModal.jsx';

export default function CardItem({ card, workspaceId, boardId }) {
  const [showModal, setShowModal] = useState(false);

  const openModal = () => {
    setShowModal(true);
    // Broadcast presence: viewing this card
    const socket = getSocket();
    if (socket) {
      socket.emit('presence:focus', {
        boardId,
        viewing: { type: 'card', id: card._id, title: card.title },
      });
    }
  };

  const closeModal = () => {
    setShowModal(false);
    // Clear presence: back to board view
    const socket = getSocket();
    if (socket) {
      socket.emit('presence:focus', {
        boardId,
        viewing: { type: 'board', id: boardId },
      });
    }
  };

  const handleDragStart = (e) => {
    e.dataTransfer.setData('text/plain', card._id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const labelColors = {
    red: '#ef4444',
    blue: '#3b82f6',
    green: '#22c55e',
    yellow: '#f59e0b',
    purple: '#a855f7',
    orange: '#f97316',
  };

  return (
    <>
      <div
        draggable
        onDragStart={handleDragStart}
        onClick={openModal}
        style={{
          background: 'var(--bg-card)',
          padding: '0.75rem',
          borderRadius: 'var(--radius)',
          cursor: 'grab',
          transition: 'box-shadow 0.15s',
          boxShadow: 'var(--shadow)',
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.boxShadow = '0 6px 12px -2px rgba(0,0,0,0.4)')
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.boxShadow = 'var(--shadow)')
        }
      >
        {card.labels?.length > 0 && (
          <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            {card.labels.map((label, i) => (
              <span
                key={i}
                style={{
                  background: labelColors[label.color] || 'var(--accent)',
                  padding: '0.0625rem 0.5rem',
                  borderRadius: '999px',
                  fontSize: '0.625rem',
                  fontWeight: 600,
                  color: 'white',
                }}
              >
                {label.text}
              </span>
            ))}
          </div>
        )}

        <p style={{ fontSize: '0.875rem', fontWeight: 500 }}>{card.title}</p>

        {card.description && (
          <p
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              marginTop: '0.25rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {card.description}
          </p>
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '0.5rem',
          }}
        >
          {card.dueDate && (
            <span style={{ fontSize: '0.6875rem', color: 'var(--warning)' }}>
              Due {new Date(card.dueDate).toLocaleDateString()}
            </span>
          )}
          {card.comments?.length > 0 && (
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>
              {card.comments.length} comment{card.comments.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {showModal && (
        <CardModal
          card={card}
          workspaceId={workspaceId}
          boardId={boardId}
          onClose={closeModal}
        />
      )}
    </>
  );
}
