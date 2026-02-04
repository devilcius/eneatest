import { useState } from 'react'
import UsersTab from './admin/UsersTab'
import SessionsTab from './admin/SessionsTab'
import ItemsTab from './admin/ItemsTab'

function AdminPage({
  definition,
  users,
  sessions,
  loading,
  error,
  onCreateUser,
  onCreateSession,
  onRevokeSession,
  onResetSession,
  onUpdateItem,
  onDeleteSession,
  formatDateTime,
}) {
  const [adminTab, setAdminTab] = useState('users')
  const [newUser, setNewUser] = useState({ externalId: '', displayName: '', email: '' })
  const [notice, setNotice] = useState('')

  const handleCreateUser = async (event) => {
    event.preventDefault()
    const result = await onCreateUser(newUser)
    setNotice(result.message)
    if (result.ok) {
      setNewUser({ externalId: '', displayName: '', email: '' })
    }
  }

  const handleCreateSession = async (userId) => {
    const result = await onCreateSession(userId)
    if (result?.message) setNotice(result.message)
  }

  return (
    <div className="panel">
      <div className="section-header">
        <div>
          <p className="eyebrow">Admin</p>
          <h2>Panel de administración</h2>
          <p className="muted">Gestiona usuarios, sesiones y contenido del test.</p>
        </div>
        <div className="tab-row">
          {['users', 'sessions', 'items'].map((tab) => (
            <button
              key={tab}
              className={`tab ${adminTab === tab ? 'active' : ''}`}
              onClick={() => setAdminTab(tab)}
            >
              {tab === 'users' ? 'Usuarios' : tab === 'sessions' ? 'Sesiones' : 'Ítems'}
            </button>
          ))}
        </div>
      </div>

      {notice && <div className="notice">{notice}</div>}
      {error && <div className="notice">{error}</div>}
      {loading && <p className="muted">Cargando datos...</p>}

      {!loading && adminTab === 'users' && (
        <UsersTab
          users={users}
          newUser={newUser}
          onNewUserChange={setNewUser}
          onSubmit={handleCreateUser}
          onCreateSession={handleCreateSession}
        />
      )}

      {!loading && adminTab === 'sessions' && (
        <SessionsTab
          sessions={sessions}
          users={users}
          onRevoke={onRevokeSession}
          onReset={onResetSession}
          onDelete={onDeleteSession}
          formatDateTime={formatDateTime}
        />
      )}

      {!loading && adminTab === 'items' && definition && (
        <ItemsTab definition={definition} onUpdateItem={onUpdateItem} />
      )}

      <div className="actions" style={{ marginTop: '2rem' }}>
        <a className="ghost button-link" href="/">
          Volver al inicio
        </a>
      </div>
    </div>
  )
}

export default AdminPage
