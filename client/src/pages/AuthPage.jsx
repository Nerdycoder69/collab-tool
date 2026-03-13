import { useState } from 'react';
import { useAuthStore } from '../store/authStore.js';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login, register, error } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
    } catch {
      // error is set in the store
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        style={{
          background: 'var(--bg-secondary)',
          padding: '2rem',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '400px',
          boxShadow: 'var(--shadow)',
        }}
      >
        <h1 style={{ marginBottom: '0.25rem', fontSize: '1.5rem' }}>
          CollabBoard
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
          {isLogin ? 'Sign in to your workspace' : 'Create your account'}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {!isLogin && (
            <input
              type="text"
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />

          {error && (
            <p style={{ color: 'var(--danger)', fontSize: '0.8125rem' }}>{error}</p>
          )}

          <button className="btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p
          style={{
            textAlign: 'center',
            marginTop: '1rem',
            fontSize: '0.8125rem',
            color: 'var(--text-secondary)',
          }}
        >
          {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            className="btn-ghost"
            style={{ color: 'var(--accent)', padding: 0 }}
            onClick={() => {
              setIsLogin(!isLogin);
              useAuthStore.setState({ error: null });
            }}
          >
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </p>
      </div>
    </div>
  );
}
