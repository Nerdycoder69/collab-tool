import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useWorkspaceStore } from '../store/workspaceStore.js';
import { useBoardStore } from '../store/boardStore.js';
import { api } from '../utils/api.js';

const TEMPLATE_INFO = {
  basic: { icon: '\u25a1', color: '#6366f1' },
  kanban: { icon: '\u2630', color: '#22c55e' },
  sprint: { icon: '\u26a1', color: '#f59e0b' },
  roadmap: { icon: '\u279c', color: '#3b82f6' },
};

export default function DashboardPage() {
  const { workspaces, fetchWorkspaces, createWorkspace, loading } =
    useWorkspaceStore();
  const { boards, fetchBoards, createBoard } = useBoardStore();
  const navigate = useNavigate();

  const [showNewWorkspace, setShowNewWorkspace] = useState(false);
  const [wsName, setWsName] = useState('');
  const [selectedWs, setSelectedWs] = useState(null);
  const [showNewBoard, setShowNewBoard] = useState(false);
  const [boardTitle, setBoardTitle] = useState('');
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('basic');

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  useEffect(() => {
    if (selectedWs) {
      fetchBoards(selectedWs._id);
      // Load templates
      api.getBoardTemplates(selectedWs._id)
        .then(({ templates: t }) => setTemplates(t))
        .catch(() => {});
    }
  }, [selectedWs, fetchBoards]);

  const handleCreateWorkspace = async (e) => {
    e.preventDefault();
    if (!wsName.trim()) return;
    const ws = await createWorkspace(wsName.trim());
    setWsName('');
    setShowNewWorkspace(false);
    setSelectedWs(ws);
  };

  const handleCreateBoard = async (e) => {
    e.preventDefault();
    if (!boardTitle.trim() || !selectedWs) return;
    const board = await createBoard(selectedWs._id, boardTitle.trim(), selectedTemplate);
    setBoardTitle('');
    setShowNewBoard(false);
    setSelectedTemplate('basic');
    navigate(`/workspace/${selectedWs._id}/board/${board._id}`);
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem' }}>Your Workspaces</h2>
        <button className="btn-primary" onClick={() => setShowNewWorkspace(true)}>
          + New Workspace
        </button>
      </div>

      {showNewWorkspace && (
        <form
          onSubmit={handleCreateWorkspace}
          style={{
            display: 'flex',
            gap: '0.5rem',
            marginBottom: '1rem',
            background: 'var(--bg-secondary)',
            padding: '1rem',
            borderRadius: 'var(--radius)',
          }}
        >
          <input
            placeholder="Workspace name"
            value={wsName}
            onChange={(e) => setWsName(e.target.value)}
            autoFocus
          />
          <button className="btn-primary" type="submit">Create</button>
          <button className="btn-ghost" type="button" onClick={() => setShowNewWorkspace(false)}>
            Cancel
          </button>
        </form>
      )}

      {loading && <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {workspaces.map((ws) => (
          <div
            key={ws._id}
            onClick={() => setSelectedWs(ws)}
            style={{
              background: selectedWs?._id === ws._id ? 'var(--accent)' : 'var(--bg-secondary)',
              padding: '1.25rem',
              borderRadius: 'var(--radius)',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
          >
            <h3 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>{ws.name}</h3>
            <p style={{ fontSize: '0.75rem', opacity: 0.7 }}>
              {ws.members?.length || 0} member{ws.members?.length !== 1 ? 's' : ''}
            </p>
          </div>
        ))}
      </div>

      {selectedWs && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.125rem' }}>Boards in {selectedWs.name}</h2>
            <button className="btn-primary" onClick={() => setShowNewBoard(true)}>
              + New Board
            </button>
          </div>

          {showNewBoard && (
            <div
              style={{
                marginBottom: '1rem',
                background: 'var(--bg-secondary)',
                padding: '1rem',
                borderRadius: 'var(--radius)',
              }}
            >
              {/* Template selector */}
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
                  Choose a template
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {templates.map((t) => {
                    const info = TEMPLATE_INFO[t.id] || TEMPLATE_INFO.basic;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedTemplate(t.id)}
                        style={{
                          background: selectedTemplate === t.id ? 'var(--accent)' : 'var(--bg-primary)',
                          color: 'var(--text-primary)',
                          border: selectedTemplate === t.id ? '2px solid var(--accent-hover)' : '2px solid var(--border)',
                          borderRadius: 'var(--radius)',
                          padding: '0.625rem 0.875rem',
                          cursor: 'pointer',
                          textAlign: 'left',
                          minWidth: '120px',
                          transition: 'all 0.15s',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.25rem' }}>
                          <span style={{ color: info.color, fontSize: '0.875rem' }}>{info.icon}</span>
                          <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{t.name}</span>
                        </div>
                        <p style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', lineHeight: 1.3 }}>
                          {t.columns.join(' \u2192 ')}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <form
                onSubmit={handleCreateBoard}
                style={{ display: 'flex', gap: '0.5rem' }}
              >
                <input
                  placeholder="Board title"
                  value={boardTitle}
                  onChange={(e) => setBoardTitle(e.target.value)}
                  autoFocus
                />
                <button className="btn-primary" type="submit">Create</button>
                <button className="btn-ghost" type="button" onClick={() => { setShowNewBoard(false); setSelectedTemplate('basic'); }}>
                  Cancel
                </button>
              </form>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
            {boards.map((board) => (
              <Link
                key={board._id}
                to={`/workspace/${selectedWs._id}/board/${board._id}`}
                style={{
                  background: 'var(--bg-secondary)',
                  padding: '1.25rem',
                  borderRadius: 'var(--radius)',
                  color: 'var(--text-primary)',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-secondary)')}
              >
                <h3 style={{ fontSize: '1rem' }}>{board.title}</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  {board.columns?.length || 0} columns
                </p>
              </Link>
            ))}
            {boards.length === 0 && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                No boards yet. Create one to get started!
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
