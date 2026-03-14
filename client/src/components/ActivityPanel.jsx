import { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api.js';
import { useSocket } from '../hooks/useSocket.js';
import { useAuthStore } from '../store/authStore.js';

function timeAgo(date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function actionText(activity) {
  const name = activity.user?.name || 'Someone';
  const d = activity.details || {};
  switch (activity.action) {
    case 'card:created':
      return `${name} created "${d.cardTitle || 'a card'}"`;
    case 'card:updated':
      return `${name} updated "${d.cardTitle || 'a card'}"`;
    case 'card:moved':
      return `${name} moved "${d.cardTitle || 'a card'}" from ${d.fromColumn} to ${d.toColumn}`;
    case 'card:deleted':
      return `${name} deleted "${d.cardTitle || 'a card'}"`;
    case 'card:commented':
      return `${name} commented on "${d.cardTitle || 'a card'}"`;
    case 'board:created':
      return `${name} created board "${d.boardTitle || ''}"`;
    case 'board:deleted':
      return `${name} deleted board "${d.boardTitle || ''}"`;
    case 'member:invited':
      return `${name} invited ${d.memberName || 'a member'}`;
    default:
      return `${name} performed an action`;
  }
}

const actionIcons = {
  'card:created': '+',
  'card:updated': '~',
  'card:moved': '\u2192',
  'card:deleted': '\u00d7',
  'card:commented': '\u2261',
  'board:created': '\u25a1',
  'board:deleted': '\u25a1',
  'member:invited': '\u263a',
};

const actionColors = {
  'card:created': '#22c55e',
  'card:updated': '#6366f1',
  'card:moved': '#f59e0b',
  'card:deleted': '#ef4444',
  'card:commented': '#3b82f6',
  'board:created': '#22c55e',
  'board:deleted': '#ef4444',
  'member:invited': '#a855f7',
};

export default function ActivityPanel({ workspaceId, boardId }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuthStore();
  const { on } = useSocket(token);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { activities: acts } = await api.getActivities(workspaceId, boardId);
        if (!cancelled) {
          setActivities(acts);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [workspaceId, boardId]);

  const handleNewActivity = useCallback((data) => {
    setActivities((prev) => {
      if (prev.find((a) => a._id === data.activity._id)) return prev;
      return [data.activity, ...prev].slice(0, 50);
    });
  }, []);

  useEffect(() => {
    const unsub = on('activity:new', handleNewActivity);
    return () => unsub && unsub();
  }, [on, handleNewActivity]);

  return (
    <div
      style={{
        width: '320px',
        minWidth: '320px',
        background: 'var(--bg-secondary)',
        borderRadius: 'var(--radius)',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: 'calc(100vh - 180px)',
        border: '1px solid var(--border)',
      }}
    >
      <div
        style={{
          padding: '0.75rem 1rem',
          borderBottom: '1px solid var(--border)',
          fontWeight: 600,
          fontSize: '0.875rem',
        }}
      >
        Activity Log
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0.5rem',
        }}
      >
        {loading && (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', textAlign: 'center', padding: '1rem' }}>
            Loading activity...
          </p>
        )}

        {!loading && activities.length === 0 && (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', textAlign: 'center', padding: '2rem 1rem' }}>
            No activity yet
          </p>
        )}

        {activities.map((activity) => (
          <div
            key={activity._id}
            style={{
              display: 'flex',
              gap: '0.625rem',
              padding: '0.5rem',
              borderRadius: '6px',
              transition: 'background 0.1s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: actionColors[activity.action] || 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'white',
                flexShrink: 0,
                marginTop: '0.125rem',
              }}
            >
              {actionIcons[activity.action] || '?'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '0.8125rem', lineHeight: 1.4, wordBreak: 'break-word' }}>
                {actionText(activity)}
              </p>
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>
                {timeAgo(activity.createdAt)}
                {activity.board?.title ? ` \u00b7 ${activity.board.title}` : ''}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
