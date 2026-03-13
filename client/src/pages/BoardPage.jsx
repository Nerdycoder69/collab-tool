import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useBoardStore } from '../store/boardStore.js';
import { useSocket } from '../hooks/useSocket.js';
import { useAuthStore } from '../store/authStore.js';
import Column from '../components/Column.jsx';
import OnlineUsers from '../components/OnlineUsers.jsx';
import ChatPanel from '../components/ChatPanel.jsx';
import InviteModal from '../components/InviteModal.jsx';

export default function BoardPage() {
  const { workspaceId, boardId } = useParams();
  const { token } = useAuthStore();
  const { emit, on } = useSocket(token);
  const {
    currentBoard,
    cards,
    onlineUsers,
    fetchBoard,
    clearBoard,
    handleRemoteCardCreated,
    handleRemoteCardUpdated,
    handleRemoteCardMoved,
    handleRemoteCardDeleted,
    setOnlineUsers,
    loading,
  } = useBoardStore();

  const [addingColumn, setAddingColumn] = useState(false);
  const [newColTitle, setNewColTitle] = useState('');
  const [chatOpen, setChatOpen] = useState(true);
  const [showInvite, setShowInvite] = useState(false);

  useEffect(() => {
    fetchBoard(workspaceId, boardId);

    emit('workspace:join', workspaceId);
    emit('board:join', boardId);

    return () => {
      emit('workspace:leave', workspaceId);
      emit('board:leave', boardId);
      clearBoard();
    };
  }, [workspaceId, boardId, fetchBoard, emit, clearBoard]);

  // Listen for real-time events
  useEffect(() => {
    const unsubs = [
      on('card:created', handleRemoteCardCreated),
      on('card:updated', handleRemoteCardUpdated),
      on('card:moved', handleRemoteCardMoved),
      on('card:deleted', handleRemoteCardDeleted),
      on('workspace:presence', (data) => setOnlineUsers(data.users)),
    ];

    return () => unsubs.forEach((unsub) => unsub && unsub());
  }, [on, handleRemoteCardCreated, handleRemoteCardUpdated, handleRemoteCardMoved, handleRemoteCardDeleted, setOnlineUsers]);

  const handleAddColumn = async (e) => {
    e.preventDefault();
    if (!newColTitle.trim() || !currentBoard) return;

    const newCol = {
      _id: Date.now().toString(),
      title: newColTitle.trim(),
      order: currentBoard.columns.length,
    };

    // This would go through the board update API
    const { api } = await import('../utils/api.js');
    try {
      const { board } = await api.updateBoard(workspaceId, boardId, {
        columns: [...currentBoard.columns, newCol],
      });
      useBoardStore.setState({ currentBoard: board });
    } catch (err) {
      console.error(err);
    }

    setNewColTitle('');
    setAddingColumn(false);
  };

  if (loading || !currentBoard) {
    return <p style={{ color: 'var(--text-secondary)' }}>Loading board...</p>;
  }

  const sortedColumns = [...currentBoard.columns].sort(
    (a, b) => a.order - b.order
  );

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link
            to="/"
            style={{
              color: 'var(--text-secondary)',
              fontSize: '0.875rem',
            }}
          >
            &larr; Back
          </Link>
          <h2 style={{ fontSize: '1.25rem' }}>{currentBoard.title}</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <OnlineUsers users={onlineUsers} />
          <button className="btn-primary" onClick={() => setShowInvite(true)} style={{ fontSize: '0.75rem' }}>
            Invite
          </button>
          <button
            className="btn-ghost"
            onClick={() => setChatOpen(!chatOpen)}
            style={{ fontSize: '0.75rem' }}
          >
            {chatOpen ? 'Hide Chat' : 'Show Chat'}
          </button>
        </div>
      </div>

      {showInvite && (
        <InviteModal
          workspaceId={workspaceId}
          onClose={() => setShowInvite(false)}
        />
      )}

      <div style={{ display: 'flex', gap: '1rem', flex: 1, minHeight: 0 }}>
        {/* Board columns */}
        <div
          style={{
            display: 'flex',
            gap: '1rem',
            overflowX: 'auto',
            paddingBottom: '1rem',
            alignItems: 'flex-start',
            flex: 1,
          }}
        >
          {sortedColumns.map((column) => (
            <Column
              key={column._id}
              column={column}
              cards={cards
                .filter((c) => c.column?.toString() === column._id?.toString())
                .sort((a, b) => a.order - b.order)}
              workspaceId={workspaceId}
              boardId={boardId}
            />
          ))}

          {/* Add column button */}
          <div style={{ minWidth: '280px', flexShrink: 0 }}>
            {addingColumn ? (
              <form
                onSubmit={handleAddColumn}
                style={{
                  background: 'var(--bg-secondary)',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius)',
                }}
              >
                <input
                  placeholder="Column title"
                  value={newColTitle}
                  onChange={(e) => setNewColTitle(e.target.value)}
                  autoFocus
                  style={{ marginBottom: '0.5rem' }}
                />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn-primary" type="submit">
                    Add
                  </button>
                  <button
                    className="btn-ghost"
                    type="button"
                    onClick={() => setAddingColumn(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                className="btn-ghost"
                onClick={() => setAddingColumn(true)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '0.75rem',
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius)',
                  opacity: 0.7,
                }}
              >
                + Add Column
              </button>
            )}
          </div>
        </div>

        {/* Chat panel */}
        {chatOpen && (
          <ChatPanel workspaceId={workspaceId} boardId={boardId} />
        )}
      </div>
    </div>
  );
}
