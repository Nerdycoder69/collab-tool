export default function OnlineUsers({ users }) {
  if (!users || users.length === 0) return null;

  // Deduplicate by _id
  const unique = [...new Map(users.map((u) => [u._id, u])).values()];

  const colors = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#3b82f6'];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
        Online:
      </span>
      <div style={{ display: 'flex' }}>
        {unique.slice(0, 5).map((user, i) => (
          <div
            key={user._id}
            title={user.name}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: colors[i % colors.length],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.6875rem',
              fontWeight: 600,
              color: 'white',
              border: '2px solid var(--bg-primary)',
              marginLeft: i > 0 ? '-8px' : 0,
              zIndex: unique.length - i,
            }}
          >
            {user.name?.charAt(0).toUpperCase()}
          </div>
        ))}
        {unique.length > 5 && (
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'var(--bg-hover)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.625rem',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              border: '2px solid var(--bg-primary)',
              marginLeft: '-8px',
            }}
          >
            +{unique.length - 5}
          </div>
        )}
      </div>
    </div>
  );
}
