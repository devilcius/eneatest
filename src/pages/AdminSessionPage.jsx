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

  const ranking = useMemo(() => {
    return Object.entries(totals)
      .map(([eneatype, score]) => ({ eneatype: Number(eneatype), score }))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score
        return a.eneatype - b.eneatype
      })
  }, [totals])

  const maxScore = useMemo(() => {
    if (!ranking.length) return 1
    return Math.max(...ranking.map((entry) => entry.score))
  }, [ranking])

  const polarData = useMemo(() => {
    const count = ranking.length
    if (!count) return []
    const minRadius = 32
    const maxRadius = 130
    const angleStep = (Math.PI * 2) / count
    return ranking.map((entry, index) => {
      const ratio = maxScore ? entry.score / maxScore : 0
      const radius = minRadius + ratio * (maxRadius - minRadius)
      const startAngle = -Math.PI / 2 + index * angleStep
      const endAngle = startAngle + angleStep
      return { ...entry, radius, startAngle, endAngle }
    })
  }, [ranking, maxScore])

  const polarPalette = [
    '#8cc9ff',
    '#b33a3a',
    '#f7d63c',
    '#f7a21b',
    '#5aa469',
    '#3b2f2f',
    '#8e44ad',
    '#2c3e50',
    '#2ecc71',
  ]

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
        <div className="actions session-actions">
          <button className="ghost print-button" onClick={() => window.print()}>
            Exportar PDF
          </button>
          <a className="ghost button-link" href="/admin">
            Volver al panel
          </a>
        </div>
      </div>

      <div className="" style={{ marginBottom: '1.5rem' }}>
        {polarData.length > 0 && (
          <>
            <div className="polar-chart">
              <svg
                role="img"
                aria-label="Distribución radial de puntuaciones"
              >
                {polarData.map((entry, index) => {
                  const cx = 140
                  const cy = 140
                  const startX = cx + entry.radius * Math.cos(entry.startAngle)
                  const startY = cy + entry.radius * Math.sin(entry.startAngle)
                  const endX = cx + entry.radius * Math.cos(entry.endAngle)
                  const endY = cy + entry.radius * Math.sin(entry.endAngle)
                  const largeArc = entry.endAngle - entry.startAngle > Math.PI ? 1 : 0
                  const path = [
                    `M ${cx} ${cy}`,
                    `L ${startX} ${startY}`,
                    `A ${entry.radius} ${entry.radius} 0 ${largeArc} 1 ${endX} ${endY}`,
                    'Z',
                  ].join(' ')
                  const labelAngle = (entry.startAngle + entry.endAngle) / 2
                  const labelRadius = entry.radius + 8
                  const labelX = cx + labelRadius * Math.cos(labelAngle)
                  const labelY = cy + labelRadius * Math.sin(labelAngle)
                  const rotate = (labelAngle * 180) / Math.PI + 90
                  return (
                    <g key={entry.eneatype}>
                      <path
                        d={path}
                        fill={polarPalette[index % polarPalette.length]}
                        stroke="rgba(36, 26, 18, 0.4)"
                        strokeWidth="1.5"
                      />
                      <text
                        x={labelX}
                        y={labelY}
                        textAnchor="middle"
                        className="polar-label"
                        transform={`rotate(${rotate} ${labelX} ${labelY})`}
                      >
                        Tipo {entry.eneatype}
                      </text>
                    </g>
                  )
                })}
              </svg>
            </div>
          </>
        )}

        {result?.ranking && result.ranking.length > 0 && (
          <>
            <h3>Eneatipos</h3>
            <ol>
              {result.ranking.map((entry) => (
                <li key={entry.eneatype}>
                  Tipo {entry.eneatype} · {entry.score} puntos
                </li>
              ))}
            </ol>
          </>
        )}
      </div>

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
