import { useState } from 'react'
import { navigateTo } from '../utils/router'
import UsersTab from './admin/UsersTab'
import SessionsTab from './admin/SessionsTab'
import ItemsTab from './admin/ItemsTab'

function AdminPage({
  definition,
  users,
  sessions,
  onCreateUser,
  onCreateSession,
  onOpenSession,
  onRevokeSession,
  onResetSession,
  onOverrideChange,
  formatDateTime,
}) {
  const [adminTab, setAdminTab] = useState('users')
  const [newUser, setNewUser] = useState({ externalId: '', displayName: '', email: '' })
  const [notice, setNotice] = useState('')

  const handleCreateUser = (event) => {
    event.preventDefault()
    const result = onCreateUser(newUser)
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

      {adminTab === 'users' && (
        <UsersTab
          users={users}
          newUser={newUser}
          onNewUserChange={setNewUser}
          onSubmit={handleCreateUser}
          onCreateSession={handleCreateSession}
        />
      )}

      {adminTab === 'sessions' && (
        <SessionsTab
          sessions={sessions}
          users={users}
          onOpenSession={(token) => onOpenSession(token)}
          onRevoke={onRevokeSession}
          onReset={onResetSession}
          formatDateTime={formatDateTime}
        />
      )}

      {adminTab === 'items' && (
        <ItemsTab definition={definition} onOverrideChange={onOverrideChange} />
      )}

      <div className="actions" style={{ marginTop: '2rem' }}>
        <button className="ghost" onClick={() => navigateTo('/')}>
          Volver al inicio
        </button>
      </div>
    </div>
  )
}

export default AdminPage
