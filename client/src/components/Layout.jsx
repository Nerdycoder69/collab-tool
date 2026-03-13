import { Outlet, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';

export default function Layout() {
  const { user, logout } = useAuthStore();

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

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
    </div>
  );
}
