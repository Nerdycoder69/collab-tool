import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../utils/api.js';
import { useSocket } from '../hooks/useSocket.js';
import { useAuthStore } from '../store/authStore.js';

function timeAgo(date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const { token } = useAuthStore();
  const { on } = useSocket(token);
  const panelRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleNewNotification = useCallback((data) => {
    setNotifications((prev) => [data.notification, ...prev].slice(0, 50));
    setUnreadCount((prev) => prev + 1);
  }, []);

  useEffect(() => {
    const unsub = on('notification:new', handleNewNotification);
    return () => unsub && unsub();
  }, [on, handleNewNotification]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const markAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  };

  const markRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // ignore
    }
  };

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>
      <button
        className="btn-ghost"
        onClick={() => setOpen(!open)}
        style={{
          position: 'relative',
          fontSize: '1.125rem',
          padding: '0.375rem 0.5rem',
        }}
      >
        <span style={{ fontSize: '1rem' }}>{'\u{1F514}'}</span>
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '2px',
              right: '2px',
              background: '#ef4444',
              color: 'white',
              borderRadius: '999px',
              minWidth: '16px',
              height: '16px',
              fontSize: '0.625rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            width: '340px',
            maxHeight: '400px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.75rem 1rem',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Notifications</span>
            {unreadCount > 0 && (
              <button
                className="btn-ghost"
                onClick={markAllRead}
                style={{ fontSize: '0.6875rem' }}
              >
                Mark all read
              </button>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {notifications.length === 0 && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', textAlign: 'center', padding: '2rem 1rem' }}>
                No notifications
              </p>
            )}

            {notifications.map((n) => (
              <div
                key={n._id}
                onClick={() => !n.read && markRead(n._id)}
                style={{
                  padding: '0.75rem 1rem',
                  borderBottom: '1px solid var(--border)',
                  background: n.read ? 'transparent' : 'rgba(99, 102, 241, 0.08)',
                  cursor: n.read ? 'default' : 'pointer',
                  transition: 'background 0.1s',
                }}
              >
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                  {!n.read && (
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: 'var(--accent)',
                        flexShrink: 0,
                        marginTop: '0.375rem',
                      }}
                    />
                  )}
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.8125rem', lineHeight: 1.4 }}>{n.message}</p>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>
                      {timeAgo(n.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
