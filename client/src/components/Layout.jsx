import { useState, useCallback } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import NotificationBell from './NotificationBell.jsx';
import SearchModal from './SearchModal.jsx';
import KeyboardShortcutsHelp from './KeyboardShortcutsHelp.jsx';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts.js';
import { useTheme } from '../hooks/useTheme.js';

export default function Layout() {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useTheme();
  const [showSearch, setShowSearch] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const shortcutHandlers = {
    search: useCallback(() => setShowSearch(true), []),
    'show-help': useCallback(() => setShowShortcuts((p) => !p), []),
    close: useCallback(() => {
      setShowSearch(false);
      setShowShortcuts(false);
    }, []),
  };

  useKeyboardShortcuts(shortcutHandlers);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1.5rem',
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <Link to="/" style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--text-primary)' }}>
          CollabBoard
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            className="btn-ghost"
            onClick={() => setShowSearch(true)}
            style={{
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span>{'\u{1F50D}'}</span>
            <span>Search</span>
            <kbd
              style={{
                fontSize: '0.5625rem',
                background: 'var(--bg-primary)',
                padding: '0.0625rem 0.375rem',
                borderRadius: '4px',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
              }}
            >
              /
            </kbd>
          </button>

          <button
            className="btn-ghost"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            style={{ fontSize: '1rem', padding: '0.375rem 0.5rem' }}
          >
            {theme === 'dark' ? '\u2600' : '\u263D'}
          </button>

          <NotificationBell />

          <button
            className="btn-ghost"
            onClick={() => setShowShortcuts(true)}
            title="Keyboard shortcuts"
            style={{ fontSize: '0.75rem', padding: '0.375rem 0.5rem' }}
          >
            <kbd
              style={{
                fontSize: '0.625rem',
                background: 'var(--bg-primary)',
                padding: '0.0625rem 0.375rem',
                borderRadius: '4px',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
              }}
            >
              ?
            </kbd>
          </button>

          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            {user?.name}
          </span>
          <button className="btn-ghost" onClick={logout}>
            Sign Out
          </button>
        </div>
      </header>

      <main style={{ flex: 1, padding: '1.5rem' }}>
        <Outlet />
      </main>

      {showSearch && <SearchModal onClose={() => setShowSearch(false)} />}
      {showShortcuts && <KeyboardShortcutsHelp onClose={() => setShowShortcuts(false)} />}
    </div>
  );
}
