import { useState } from 'react';
import { api } from '../utils/api.js';

export default function InviteModal({ workspaceId, onClose, onInvited }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('editor');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      const { workspace } = await api.inviteMember(workspaceId, {
        email: email.trim(),
        role,
      });
      setSuccess(`Invited ${email} as ${role}`);
      setEmail('');
      if (onInvited) onInvited(workspace);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
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
          maxWidth: '420px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.125rem' }}>Invite Member</h3>
          <button className="btn-ghost" onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
              Email address
            </label>
            <input
              type="email"
              placeholder="colleague@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
              Role
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {['editor', 'viewer'].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    background: role === r ? 'var(--accent)' : 'var(--bg-primary)',
                    color: role === r ? 'white' : 'var(--text-secondary)',
                    border: `1px solid ${role === r ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius)',
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    textTransform: 'capitalize',
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
            <p style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', marginTop: '0.375rem' }}>
              {role === 'editor'
                ? 'Can create/edit boards and cards'
                : 'Can view boards and add comments'}
            </p>
          </div>

          {error && (
            <p style={{ color: 'var(--danger)', fontSize: '0.8125rem' }}>{error}</p>
          )}
          {success && (
            <p style={{ color: 'var(--success)', fontSize: '0.8125rem' }}>{success}</p>
          )}

          <button className="btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Inviting...' : 'Send Invite'}
          </button>
        </form>
      </div>
    </div>
  );
}
