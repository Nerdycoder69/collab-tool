import { useState } from 'react';
import { useBoardStore } from '../store/boardStore.js';
import { getSocket } from '../hooks/useSocket.js';
import CardItem from './CardItem.jsx';

export default function Column({ column, cards, workspaceId, boardId }) {
  const { createCard } = useBoardStore();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      const card = await createCard(workspaceId, boardId, {
        title: title.trim(),
        column: column._id,
      });

      // Broadcast via socket
      const socket = getSocket();
      if (socket) {
        socket.emit('card:created', { boardId, card });
      }
    } catch (err) {
      console.error(err);
    }

    setTitle('');
    setAdding(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragOver(false);

    const cardId = e.dataTransfer.getData('text/plain');
    if (!cardId) return;

    const { moveCard, cards: allCards } = useBoardStore.getState();
    const movingCard = allCards.find((c) => c._id === cardId);
    const fromColumn = movingCard?.column;
    try {
      const card = await moveCard(workspaceId, boardId, cardId, column._id, cards.length);

      const socket = getSocket();
      if (socket) {
        socket.emit('card:moved', { boardId, card, fromColumn });
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        minWidth: '280px',
        maxWidth: '280px',
        background: dragOver ? 'var(--bg-hover)' : 'var(--bg-secondary)',
        borderRadius: 'var(--radius)',
        padding: '0.75rem',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: 'calc(100vh - 180px)',
        transition: 'background 0.15s',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.75rem',
        }}
      >
        <h3
          style={{
            fontSize: '0.8125rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--text-secondary)',
          }}
        >
          {column.title}
        </h3>
        <span
          style={{
            fontSize: '0.75rem',
            color: 'var(--text-secondary)',
            background: 'var(--bg-primary)',
            padding: '0.125rem 0.5rem',
            borderRadius: '999px',
          }}
        >
          {cards.length}
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {cards.map((card) => (
          <CardItem
            key={card._id}
            card={card}
            workspaceId={workspaceId}
            boardId={boardId}
          />
        ))}
      </div>

      {adding ? (
        <form onSubmit={handleAdd} style={{ marginTop: '0.5rem' }}>
          <input
            placeholder="Card title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            style={{ marginBottom: '0.5rem' }}
          />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn-primary" type="submit" style={{ fontSize: '0.75rem' }}>
              Add
            </button>
            <button
              className="btn-ghost"
              type="button"
              onClick={() => setAdding(false)}
              style={{ fontSize: '0.75rem' }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          className="btn-ghost"
          onClick={() => setAdding(true)}
          style={{
            marginTop: '0.5rem',
            textAlign: 'left',
            fontSize: '0.8125rem',
          }}
        >
          + Add Card
        </button>
      )}
    </div>
  );
}
