export default function OnlineUsers({ users, viewingStatus }) {
  if (!users || users.length === 0) return null;

  // Deduplicate by _id
  const unique = [...new Map(users.map((u) => [u._id, u])).values()];

  const colors = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#3b82f6'];

  const getViewing = (userId) => {
    if (!viewingStatus) return null;
    return viewingStatus[userId];
  };

  const viewingLabel = (v) => {
    if (!v) return null;
    if (v.type === 'card') return `Viewing: ${v.title || 'a card'}`;
    if (v.type === 'column') return `Viewing: ${v.title || 'a column'}`;
    return 'On this board';
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
        Online:
      </span>
      <div style={{ display: 'flex' }}>
        {unique.slice(0, 5).map((user, i) => {
          const viewing = getViewing(user._id);
          const label = viewingLabel(viewing);
          return (
            <div
              key={user._id}
              title={label ? `${user.name} — ${label}` : user.name}
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
                border: viewing?.type === 'card'
                  ? '2px solid #f59e0b'
                  : '2px solid var(--bg-primary)',
                marginLeft: i > 0 ? '-8px' : 0,
                zIndex: unique.length - i,
                position: 'relative',
              }}
            >
              {user.name?.charAt(0).toUpperCase()}
              {/* Pulse indicator when actively viewing something */}
              {viewing?.type === 'card' && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '-1px',
                    right: '-1px',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#f59e0b',
                    border: '1px solid var(--bg-primary)',
                  }}
                />
              )}
            </div>
          );
        })}
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
