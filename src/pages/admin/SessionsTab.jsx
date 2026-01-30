const STATUS_LABELS = {
  CREATED: 'Creada',
  STARTED: 'Iniciada',
  COMPLETED: 'Completada',
  REVOKED: 'Revocada',
}

function SessionsTab({ sessions, users, onRevoke, onReset, formatDateTime }) {
  return (
    <div className="card">
      <h3>Sesiones</h3>
      {sessions.length === 0 ? (
        <p className="muted">Todavía no hay sesiones.</p>
      ) : (
        <div className="table">
          {sessions
            .slice()
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .map((session) => {
              const user = users.find((entry) => entry.id === session.userId)
              const displayName = user?.displayName ?? session.displayName ?? 'Usuario'
              return (
                <div key={session.id} className="table-row">
                  <div>
                    <strong>{displayName}</strong>
                    <div className="muted">Sesión #{session.id}</div>
                    <div className="muted">Estado: {STATUS_LABELS[session.status] ?? session.status}</div>
                    <div className="muted">Creada: {formatDateTime(session.createdAt)}</div>
                    {session.completedAt && (
                      <div className="muted">Completada: {formatDateTime(session.completedAt)}</div>
                    )}
                  </div>
                  <div className="row-actions">
                    {session.status !== 'REVOKED' && session.status !== 'COMPLETED' && (
                      <button className="ghost" onClick={() => onRevoke(session.id)}>
                        Revocar
                      </button>
                    )}
                    {session.status === 'COMPLETED' && (
                      <button className="ghost" onClick={() => onReset(session.id)}>
                        Reiniciar
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
        </div>
      )}
    </div>
  )
}

export default SessionsTab
