import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { TEST, TEST_VERSION } from './data/testDefinition'
import { applyOverrides } from './utils/definition'
import { formatDateTime } from './utils/format'
import { nextId } from './utils/id'
import { navigateTo, parseHash } from './utils/router'
import { computeRanking, computeTotals, getActiveItemCount, hasAllAnswers } from './utils/scoring'
import { loadJSON, saveJSON } from './utils/storage'
import { generateToken } from './utils/token'
import TopBar from './components/TopBar'
import Footer from './components/Footer'
import HomePage from './pages/HomePage'
import AdminPage from './pages/AdminPage'
import PublicTestPage from './pages/PublicTestPage'

const STORAGE_KEYS = {
  users: 'eneatest_users',
  sessions: 'eneatest_sessions',
  responses: 'eneatest_responses',
  overrides: 'eneatest_item_overrides',
}

function App() {
  const [route, setRoute] = useState(parseHash)
  const [users, setUsers] = useState(() => loadJSON(STORAGE_KEYS.users, []))
  const [sessions, setSessions] = useState(() => loadJSON(STORAGE_KEYS.sessions, []))
  const [responses, setResponses] = useState(() => loadJSON(STORAGE_KEYS.responses, []))
  const [overrides, setOverrides] = useState(() => loadJSON(STORAGE_KEYS.overrides, {}))

  useEffect(() => {
    const onHashChange = () => setRoute(parseHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => saveJSON(STORAGE_KEYS.users, users), [users])
  useEffect(() => saveJSON(STORAGE_KEYS.sessions, sessions), [sessions])
  useEffect(() => saveJSON(STORAGE_KEYS.responses, responses), [responses])
  useEffect(() => saveJSON(STORAGE_KEYS.overrides, overrides), [overrides])

  const definition = useMemo(() => applyOverrides(TEST, overrides), [overrides])

  const sessionsByToken = useMemo(() => {
    const map = new Map()
    sessions.forEach((session) => map.set(session.token, session))
    return map
  }, [sessions])

  useEffect(() => {
    if (route.page !== 'test' || route.token !== 'demo') return
    if (sessionsByToken.has('demo')) return
    const demoUserId = users.find((user) => user.externalId === 'DEMO')?.id ?? nextId(users)
    if (!users.some((user) => user.externalId === 'DEMO')) {
      setUsers((prev) => [
        ...prev,
        {
          id: demoUserId,
          externalId: 'DEMO',
          displayName: 'Usuario Demo',
          email: null,
          createdAt: new Date().toISOString(),
        },
      ])
    }
    setSessions((prev) => [
      ...prev,
      {
        id: nextId(prev),
        testDefinitionId: definition.id,
        testDefinitionVersion: TEST_VERSION,
        userId: demoUserId,
        token: 'demo',
        status: 'CREATED',
        createdAt: new Date().toISOString(),
        startedAt: null,
        completedAt: null,
        revokedAt: null,
        result: null,
      },
    ])
  }, [route.page, route.token, sessionsByToken, users, definition.id])

  const createUser = (payload) => {
    const trimmedId = payload.externalId.trim()
    const trimmedName = payload.displayName.trim()
    if (!trimmedId || !trimmedName) {
      return { ok: false, message: 'Completa el identificador externo y el nombre.' }
    }
    if (users.some((user) => user.externalId === trimmedId)) {
      return { ok: false, message: 'Ese identificador externo ya existe.' }
    }
    const created = {
      id: nextId(users),
      externalId: trimmedId,
      displayName: trimmedName,
      email: payload.email.trim() || null,
      createdAt: new Date().toISOString(),
    }
    setUsers((prev) => [...prev, created])
    return { ok: true, message: 'Usuario creado.' }
  }

  const createSession = async (userId) => {
    const token = generateToken()
    const created = {
      id: nextId(sessions),
      testDefinitionId: definition.id,
      testDefinitionVersion: TEST_VERSION,
      userId,
      token,
      status: 'CREATED',
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      revokedAt: null,
      result: null,
    }
    setSessions((prev) => [...prev, created])
    const link = `${window.location.origin}${window.location.pathname}#/t/${token}`
    try {
      await navigator.clipboard.writeText(link)
      return { ok: true, message: 'Enlace copiado al portapapeles.' }
    } catch (error) {
      return { ok: true, message: 'Enlace creado. No se pudo copiar automáticamente.' }
    }
  }

  const updateSession = (sessionId, updater) => {
    setSessions((prev) => prev.map((session) => (session.id === sessionId ? updater(session) : session)))
  }

  const revokeSession = (sessionId) => {
    updateSession(sessionId, (session) => ({
      ...session,
      status: 'REVOKED',
      revokedAt: new Date().toISOString(),
    }))
  }

  const resetSession = (sessionId) => {
    updateSession(sessionId, (session) => ({
      ...session,
      status: 'CREATED',
      startedAt: null,
      completedAt: null,
      revokedAt: null,
      result: null,
    }))
    setResponses((prev) => prev.filter((entry) => entry.sessionId !== sessionId))
  }

  const handleAnswerChange = (sessionId, itemId, value) => {
    const parsedValue = Number(value)
    setResponses((prev) => {
      const existing = prev.find((entry) => entry.sessionId === sessionId)
      const updatedAnswers = {
        ...(existing?.answers ?? {}),
        [itemId]: parsedValue,
      }
      if (existing) {
        return prev.map((entry) =>
          entry.sessionId === sessionId ? { ...entry, answers: updatedAnswers } : entry
        )
      }
      return [...prev, { sessionId, answers: updatedAnswers }]
    })
    updateSession(sessionId, (session) =>
      session.status === 'CREATED'
        ? { ...session, status: 'STARTED', startedAt: new Date().toISOString() }
        : session
    )
  }

  const submitSession = (sessionId) => {
    const responseEntry = responses.find((entry) => entry.sessionId === sessionId)
    const answers = responseEntry?.answers ?? {}
    if (!hasAllAnswers(definition, answers, overrides)) {
      return { ok: false, message: 'Faltan respuestas. Contesta todos los ítems activos.' }
    }
    const totals = computeTotals(definition, answers, overrides)
    const ranking = computeRanking(totals)
    updateSession(sessionId, (session) => ({
      ...session,
      status: 'COMPLETED',
      completedAt: new Date().toISOString(),
      result: { totals, ranking },
    }))
    return { ok: true, message: 'Test enviado.' }
  }

  const handleOverrideChange = (itemId, patch) => {
    const fallbackText = TEST.questionnaires.flatMap((q) => q.items).find((item) => item.id === itemId)
      ?.text
    setOverrides((prev) => ({
      ...prev,
      [itemId]: {
        text: fallbackText,
        isActive: true,
        ...prev[itemId],
        ...patch,
      },
    }))
  }

  const activeItemCount = getActiveItemCount(definition, overrides)

  return (
    <div className="app">
      <TopBar />
      <main>
        {route.page === 'home' && (
          <HomePage definition={definition} activeItemCount={activeItemCount} />
        )}
        {route.page === 'admin' && (
          <AdminPage
            definition={definition}
            users={users}
            sessions={sessions}
            onCreateUser={createUser}
            onCreateSession={createSession}
            onOpenSession={(token) => navigateTo(`/t/${token}`)}
            onRevokeSession={revokeSession}
            onResetSession={resetSession}
            onOverrideChange={handleOverrideChange}
            formatDateTime={formatDateTime}
          />
        )}
        {route.page === 'test' && (
          <PublicTestPage
            token={route.token}
            definition={definition}
            sessionsByToken={sessionsByToken}
            responses={responses}
            overrides={overrides}
            activeItemCount={activeItemCount}
            onAnswerChange={handleAnswerChange}
            onSubmit={submitSession}
          />
        )}
      </main>
      <Footer language={definition.language} />
    </div>
  )
}

export default App
