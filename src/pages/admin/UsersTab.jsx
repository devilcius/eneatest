function UsersTab({ users, newUser, onNewUserChange, onSubmit, onCreateSession }) {
  return (
    <div className="grid">
      <form className="card" onSubmit={onSubmit}>
        <h3>Nuevo usuario</h3>
        <label>
          Identificador externo
          <input
            value={newUser.externalId}
            onChange={(event) => onNewUserChange({ ...newUser, externalId: event.target.value })}
            placeholder="U000123"
          />
        </label>
        <label>
          Nombre para mostrar
          <input
            value={newUser.displayName}
            onChange={(event) => onNewUserChange({ ...newUser, displayName: event.target.value })}
            placeholder="Nombre completo"
          />
        </label>
        <label>
          Email (opcional)
          <input
            value={newUser.email}
            onChange={(event) => onNewUserChange({ ...newUser, email: event.target.value })}
            placeholder="correo@dominio.com"
          />
        </label>
        <button className="primary" type="submit">
          Crear usuario
        </button>
      </form>

      <div className="card">
        <h3>Usuarios registrados</h3>
        {users.length === 0 ? (
          <p className="muted">Aún no hay usuarios.</p>
        ) : (
          <div className="table">
            {users.map((user) => (
              <div key={user.id} className="table-row">
                <div>
                  <strong>{user.displayName}</strong>
                  <div className="muted">{user.externalId}</div>
                  {user.email && <div className="muted">{user.email}</div>}
                </div>
                <div className="row-actions">
                  <button className="ghost" onClick={() => onCreateSession(user.id)}>
                    Crear enlace
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default UsersTab
