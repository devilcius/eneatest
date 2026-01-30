import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'
import { TEST } from './data/testDefinition'
import { formatDateTime } from './utils/format'
import { parsePath } from './utils/router'
import TopBar from './components/TopBar'
import Footer from './components/Footer'
import HomePage from './pages/HomePage'
import AdminPage from './pages/AdminPage'
import AdminSessionPage from './pages/AdminSessionPage'
import PublicTestPage from './pages/PublicTestPage'
import { api } from './api/client'

function App() {
  const [route, setRoute] = useState(parsePath)

  const [adminUsers, setAdminUsers] = useState([])
  const [adminSessions, setAdminSessions] = useState([])
  const [adminTest, setAdminTest] = useState(null)
  const [adminLoading, setAdminLoading] = useState(false)
  const [adminError, setAdminError] = useState('')
  const [adminSessionDetail, setAdminSessionDetail] = useState(null)
  const [adminSessionTest, setAdminSessionTest] = useState(null)
  const [adminSessionLoading, setAdminSessionLoading] = useState(false)
  const [adminSessionError, setAdminSessionError] = useState('')

  const [publicData, setPublicData] = useState(null)
  const [publicLoading, setPublicLoading] = useState(false)
  const [publicError, setPublicError] = useState('')
  const [answers, setAnswers] = useState({})

  useEffect(() => {
    const onPopState = () => setRoute(parsePath())
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const loadAdminData = useCallback(async () => {
    setAdminLoading(true)
    setAdminError('')
    try {
      const [users, sessions, test] = await Promise.all([
        api.getUsers(),
        api.getSessions(),
        api.getTest(),
      ])
      setAdminUsers(users)
      setAdminSessions(sessions)
      setAdminTest(test)
    } catch (error) {
      setAdminError(error.message ?? 'No se pudo cargar el panel de administración.')
    } finally {
      setAdminLoading(false)
    }
  }, [])

  const loadPublicSession = useCallback(async (token) => {
    if (!token) return
    setPublicLoading(true)
    setPublicError('')
    setAnswers({})
    try {
      const data = await api.getPublicSession(token)
      setPublicData(data)
    } catch (error) {
      setPublicError(error.message ?? 'No se pudo cargar la sesión.')
      setPublicData(null)
    } finally {
      setPublicLoading(false)
    }
  }, [])

  const loadAdminSessionDetail = useCallback(async (sessionId) => {
    if (!sessionId) return
    setAdminSessionLoading(true)
    setAdminSessionError('')
    try {
      const detail = await api.getSessionDetail(sessionId)
      setAdminSessionDetail(detail)
      const test = await api.getTestDefinition(
        detail.session.testDefinitionId,
        detail.session.testDefinitionVersion
      )
      setAdminSessionTest(test)
    } catch (error) {
      setAdminSessionError(error.message ?? 'No se pudo cargar la sesión.')
      setAdminSessionDetail(null)
      setAdminSessionTest(null)
    } finally {
      setAdminSessionLoading(false)
    }
  }, [])

  useEffect(() => {
    if (route.page === 'admin') {
      loadAdminData()
    }
  }, [route.page, loadAdminData])

  useEffect(() => {
    if (route.page === 'admin-session') {
      loadAdminSessionDetail(route.sessionId)
    }
  }, [route.page, route.sessionId, loadAdminSessionDetail])

  useEffect(() => {
    if (route.page === 'test') {
      loadPublicSession(route.token)
    }
  }, [route.page, route.token, loadPublicSession])

  const createUser = async (payload) => {
    try {
      const user = await api.createUser(payload)
      setAdminUsers((prev) => [user, ...prev])
      return { ok: true, message: 'Usuario creado.' }
    } catch (error) {
      return { ok: false, message: error.message }
    }
  }

  const createSession = async (userId) => {
    try {
      const session = await api.createSession(userId)
      setAdminSessions((prev) => [session, ...prev])
      const link = `${window.location.origin}/t/${session.token}`
      try {
        await navigator.clipboard.writeText(link)
        return { ok: true, message: 'Enlace copiado al portapapeles.' }
      } catch (error) {
        return { ok: true, message: 'Enlace creado. No se pudo copiar automáticamente.' }
      }
    } catch (error) {
      return { ok: false, message: error.message }
    }
  }

  const handleRevokeSession = async (sessionId) => {
    try {
      await api.revokeSession(sessionId)
      setAdminSessions((prev) =>
        prev.map((session) =>
          session.id === sessionId ? { ...session, status: 'REVOKED' } : session
        )
      )
    } catch (error) {
      setAdminError(error.message)
    }
  }

  const handleResetSession = async (sessionId) => {
    try {
      await api.resetSession(sessionId)
      setAdminSessions((prev) =>
        prev.map((session) =>
          session.id === sessionId
            ? { ...session, status: 'CREATED', startedAt: null, completedAt: null, revokedAt: null }
            : session
        )
      )
    } catch (error) {
      setAdminError(error.message)
    }
  }

  const handleUpdateItem = async (itemId, patch) => {
    try {
      const updated = await api.updateItem(itemId, patch)
      setAdminTest((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          questionnaires: prev.questionnaires.map((questionnaire) => ({
            ...questionnaire,
            items: questionnaire.items.map((item) =>
              item.id === updated.id
                ? {
                    ...item,
                    text: updated.text,
                    isActive: updated.isActive,
                  }
                : item
            ),
          })),
        }
      })
    } catch (error) {
      setAdminError(error.message)
    }
  }

  const handleAnswerChange = async (itemId, value) => {
    const parsedValue = Number(value)
    setAnswers((prev) => ({
      ...prev,
      [itemId]: parsedValue,
    }))

    if (publicData?.session?.status === 'CREATED') {
      try {
        await api.startSession(route.token)
        setPublicData((prev) =>
          prev ? { ...prev, session: { ...prev.session, status: 'STARTED' } } : prev
        )
      } catch (error) {
        setPublicError(error.message)
      }
    }
  }

  const handleSubmit = async (token) => {
    try {
      const payload = {
        answers: Object.entries(answers).map(([itemId, value]) => ({
          itemId: Number(itemId),
          value,
        })),
      }
      await api.submitSession(token, payload)
      await loadPublicSession(token)
    } catch (error) {
      setPublicError(error.message)
    }
  }

  const homeDefinition = useMemo(() => TEST, [])

  return (
    <div className="app">
      <TopBar />
      <main>
        {route.page === 'home' && (
          <HomePage definition={homeDefinition} activeItemCount={homeDefinition.questionnaires.length * 20} />
        )}
        {route.page === 'admin' && (
          <AdminPage
            definition={adminTest}
            users={adminUsers}
            sessions={adminSessions}
            loading={adminLoading}
            error={adminError}
            onCreateUser={createUser}
            onCreateSession={createSession}
            onRevokeSession={handleRevokeSession}
            onResetSession={handleResetSession}
            onUpdateItem={handleUpdateItem}
            formatDateTime={formatDateTime}
          />
        )}
        {route.page === 'admin-session' && (
          <AdminSessionPage
            sessionDetail={adminSessionDetail}
            testDefinition={adminSessionTest}
            loading={adminSessionLoading}
            error={adminSessionError}
            formatDateTime={formatDateTime}
          />
        )}
        {route.page === 'test' && (
          <PublicTestPage
            token={route.token}
            data={publicData}
            answers={answers}
            onAnswerChange={handleAnswerChange}
            onSubmit={handleSubmit}
            loading={publicLoading}
            error={publicError}
          />
        )}
      </main>
      <Footer language={homeDefinition.language} />
    </div>
  )
}

export default App
