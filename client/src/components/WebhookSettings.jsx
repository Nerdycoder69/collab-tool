import { useState, useEffect } from 'react';
import { api } from '../utils/api.js';

const EVENTS = [
  { value: 'card:moved:done', label: 'Card moved to Done' },
  { value: 'card:created', label: 'Card created' },
  { value: 'card:deleted', label: 'Card deleted' },
];

export default function WebhookSettings({ workspaceId, onClose }) {
  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', url: '', event: 'card:moved:done', secret: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    loadWebhooks();
  }, [workspaceId]);

  const loadWebhooks = async () => {
    try {
      const { webhooks: wh } = await api.getWebhooks(workspaceId);
      setWebhooks(wh);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || !form.url.trim()) {
      setError('Name and URL are required');
      return;
    }
    try {
      const { webhook } = await api.createWebhook(workspaceId, {
        name: form.name.trim(),
        url: form.url.trim(),
        event: form.event,
        secret: form.secret.trim() || undefined,
      });
      setWebhooks((prev) => [webhook, ...prev]);
      setForm({ name: '', url: '', event: 'card:moved:done', secret: '' });
      setShowForm(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleEnabled = async (webhook) => {
    try {
      const { webhook: updated } = await api.updateWebhook(workspaceId, webhook._id, {
        enabled: !webhook.enabled,
      });
      setWebhooks((prev) => prev.map((w) => (w._id === updated._id ? updated : w)));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (webhookId) => {
    try {
      await api.deleteWebhook(workspaceId, webhookId);
      setWebhooks((prev) => prev.filter((w) => w._id !== webhookId));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius)',
          padding: '1.5rem',
          width: '100%',
          maxWidth: '600px',
          maxHeight: '80vh',
          overflow: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1rem' }}>Webhook Integrations</h3>
          <button className="btn-ghost" onClick={onClose}>X</button>
        </div>

        {error && (
          <p style={{ color: 'var(--danger)', fontSize: '0.8125rem', marginBottom: '0.75rem' }}>{error}</p>
        )}

        <button
          className="btn-primary"
          onClick={() => setShowForm(!showForm)}
          style={{ marginBottom: '1rem', fontSize: '0.8125rem' }}
        >
          {showForm ? 'Cancel' : '+ New Webhook'}
        </button>

        {showForm && (
          <form
            onSubmit={handleCreate}
            style={{
              background: 'var(--bg-primary)',
              padding: '1rem',
              borderRadius: 'var(--radius)',
              marginBottom: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.625rem',
            }}
          >
            <input
              placeholder="Webhook name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              autoFocus
            />
            <input
              placeholder="https://example.com/webhook"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
            />
            <select
              value={form.event}
              onChange={(e) => setForm({ ...form, event: e.target.value })}
              style={{
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '0.625rem 0.75rem',
                fontSize: '0.875rem',
              }}
            >
              {EVENTS.map((ev) => (
                <option key={ev.value} value={ev.value}>{ev.label}</option>
              ))}
            </select>
            <input
              placeholder="Signing secret (optional)"
              value={form.secret}
              onChange={(e) => setForm({ ...form, secret: e.target.value })}
            />
            <button className="btn-primary" type="submit" style={{ alignSelf: 'flex-start' }}>
              Create Webhook
            </button>
          </form>
        )}

        {loading ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Loading...</p>
        ) : webhooks.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            No webhooks configured. Create one to get notified when cards move to Done.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {webhooks.map((wh) => (
              <div
                key={wh._id}
                style={{
                  background: 'var(--bg-primary)',
                  padding: '0.875rem',
                  borderRadius: 'var(--radius)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  opacity: wh.enabled ? 1 : 0.5,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.125rem' }}>
                    {wh.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {wh.url}
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--accent)', marginTop: '0.25rem' }}>
                    {EVENTS.find((e) => e.value === wh.event)?.label || wh.event}
                    {wh.board && ` \u2022 ${wh.board.title}`}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.375rem', marginLeft: '0.75rem' }}>
                  <button
                    className="btn-ghost"
                    onClick={() => toggleEnabled(wh)}
                    style={{ fontSize: '0.75rem' }}
                  >
                    {wh.enabled ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    className="btn-ghost"
                    onClick={() => handleDelete(wh._id)}
                    style={{ fontSize: '0.75rem', color: 'var(--danger)' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
