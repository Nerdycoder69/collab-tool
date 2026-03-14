import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api.js';

export default function SearchModal({ onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ boards: [], cards: [] });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const doSearch = useCallback(async (q) => {
    if (q.trim().length < 2) {
      setResults({ boards: [], cards: [] });
      return;
    }
    setLoading(true);
    try {
      const data = await api.search(q);
      setResults(data);
    } catch {
      setResults({ boards: [], cards: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e) => {
    const v = e.target.value;
    setQuery(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(v), 300);
  };

  const goToBoard = (board) => {
    const wsId = board.workspace?._id || board.workspace;
    navigate(`/workspace/${wsId}/board/${board._id}`);
    onClose();
  };

  const goToCard = (card) => {
    const wsId = card.boardInfo?.workspace;
    const boardId = card.board;
    if (wsId && boardId) {
      navigate(`/workspace/${wsId}/board/${boardId}`);
    }
    onClose();
  };

  const hasResults = results.boards.length > 0 || results.cards.length > 0;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '15vh',
        zIndex: 200,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-secondary)',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '60vh',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Search input */}
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '1.125rem' }}>
              {'\u{1F50D}'}
            </span>
            <input
              ref={inputRef}
              placeholder="Search boards and cards..."
              value={query}
              onChange={handleChange}
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                fontSize: '1rem',
                outline: 'none',
                color: 'var(--text-primary)',
                padding: '0.25rem 0',
              }}
            />
            <kbd
              style={{
                fontSize: '0.625rem',
                background: 'var(--bg-primary)',
                padding: '0.125rem 0.5rem',
                borderRadius: '4px',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border)',
              }}
            >
              ESC
            </kbd>
          </div>
        </div>

        {/* Results */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
          {loading && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', textAlign: 'center', padding: '1rem' }}>
              Searching...
            </p>
          )}

          {!loading && query.length >= 2 && !hasResults && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', textAlign: 'center', padding: '2rem 1rem' }}>
              No results found for "{query}"
            </p>
          )}

          {!loading && query.length < 2 && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', textAlign: 'center', padding: '2rem 1rem' }}>
              Type at least 2 characters to search
            </p>
          )}

          {results.boards.length > 0 && (
            <div style={{ marginBottom: '0.5rem' }}>
              <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Boards
              </div>
              {results.boards.map((board) => (
                <div
                  key={board._id}
                  onClick={() => goToBoard(board)}
                  style={{
                    padding: '0.625rem 0.75rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <p style={{ fontSize: '0.875rem', fontWeight: 500 }}>{board.title}</p>
                  <p style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', marginTop: '0.125rem' }}>
                    in {board.workspace?.name || 'Workspace'} · {board.columns?.length || 0} columns
                  </p>
                </div>
              ))}
            </div>
          )}

          {results.cards.length > 0 && (
            <div>
              <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Cards
              </div>
              {results.cards.map((card) => (
                <div
                  key={card._id}
                  onClick={() => goToCard(card)}
                  style={{
                    padding: '0.625rem 0.75rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <p style={{ fontSize: '0.875rem', fontWeight: 500 }}>{card.title}</p>
                    {card.labels?.length > 0 && (
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        {card.labels.slice(0, 2).map((l, i) => (
                          <span
                            key={i}
                            style={{
                              fontSize: '0.5625rem',
                              padding: '0.0625rem 0.375rem',
                              borderRadius: '999px',
                              background: 'var(--accent)',
                              color: 'white',
                              fontWeight: 600,
                            }}
                          >
                            {l.text}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {card.description && (
                    <p style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-secondary)',
                      marginTop: '0.125rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {card.description}
                    </p>
                  )}
                  <p style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', marginTop: '0.125rem' }}>
                    in {card.boardInfo?.title || 'Board'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
