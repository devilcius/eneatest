import { useMemo } from 'react'

const STATUS_LABELS = {
  CREATED: 'Creada',
  STARTED: 'Iniciada',
  COMPLETED: 'Completada',
  REVOKED: 'Revocada',
}

const toNumber = (value) => (Number.isFinite(value) ? value : null)

function AdminSessionPage({ sessionDetail, testDefinition, loading, error, formatDateTime }) {
  const session = sessionDetail?.session
  const responses = sessionDetail?.responses ?? []
  const result = sessionDetail?.result

  const responseMap = useMemo(() => {
    const map = new Map()
    responses.forEach((entry) => map.set(entry.itemId, entry.value))
    return map
  }, [responses])

  const totals = useMemo(() => {
    if (!testDefinition) return {}
    if (result?.totals) return result.totals
    const tally = {}
    testDefinition.questionnaires.forEach((questionnaire) => {
      const total = questionnaire.items.reduce((sum, item) => {
        const value = responseMap.get(item.id)
        return sum + (Number.isFinite(value) ? value : 0)
      }, 0)
      tally[questionnaire.eneatype] = total
    })
    return tally
  }, [testDefinition, result, responseMap])

  if (loading) {
    return (
      <div className="panel">
        <p className="muted">Cargando resultados...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="panel">
        <div className="notice">{error}</div>
        <a className="ghost button-link" href="/admin">
          Volver al panel
        </a>
      </div>
    )
  }

  if (!session || !testDefinition) {
    return (
      <div className="panel">
        <p className="muted">No se encontraron datos para esta sesión.</p>
        <a className="ghost button-link" href="/admin">
          Volver al panel
        </a>
      </div>
    )
  }

  return (
    <div className="panel">
      <div className="section-header">
        <div>
          <p className="eyebrow">Resultados</p>
          <h2>Detalle de sesión</h2>
          <p className="muted">
            {session.displayName ?? 'Usuario'} · {STATUS_LABELS[session.status] ?? session.status}
          </p>
          <p className="muted">Creada: {formatDateTime(session.createdAt)}</p>
          {session.completedAt && (
            <p className="muted">Completada: {formatDateTime(session.completedAt)}</p>
          )}
        </div>
        <div className="actions">
          <a className="ghost button-link" href="/admin">
            Volver al panel
          </a>
        </div>
      </div>

      {result?.ranking && result.ranking.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3>Eneatipos</h3>
          <ol>
            {result.ranking.map((entry) => (
              <li key={entry.eneatype}>
                Tipo {entry.eneatype} · {entry.score} puntos
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="questionnaires">
        {testDefinition.questionnaires.map((questionnaire) => {
          const questionnaireTotal = totals[questionnaire.eneatype]
          return (
            <section key={questionnaire.id} className="questionnaire">
              <header>
                <h3>
                  {questionnaire.title} · Tipo {questionnaire.eneatype}
                </h3>
                <span className="tag">Total: {toNumber(questionnaireTotal) ?? '—'}</span>
              </header>
              <div className="items">
                {questionnaire.items.map((item) => {
                  const value = responseMap.get(item.id)
                  return (
                    <div key={item.id} className="item">
                      <p>{item.text}</p>
                      <div className="item-score">Puntuación: {toNumber(value) ?? '—'}</div>
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

export default AdminSessionPage
