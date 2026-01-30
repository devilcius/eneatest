import { useMemo } from 'react'
import { navigateTo } from '../utils/router'
import { getQuestionnaireTitle } from '../utils/definition'

function PublicTestPage({ token, data, answers, onAnswerChange, onSubmit, loading, error }) {
  const definition = data?.test
  const session = data?.session

  const scale = useMemo(() => {
    if (!definition?.scale) return []
    const labels = definition.scale.labels ?? {}
    const values = []
    for (let value = definition.scale.min; value <= definition.scale.max; value += 1) {
      values.push({ value, label: labels[String(value)] ?? String(value) })
    }
    return values
  }, [definition])

  const activeItemCount = useMemo(() => {
    if (!definition) return 0
    return definition.questionnaires.reduce((count, questionnaire) => count + questionnaire.items.length, 0)
  }, [definition])

  const answeredCount = useMemo(() => {
    return Object.values(answers).filter((value) => Number.isFinite(value)).length
  }, [answers])

  const isComplete = answeredCount >= activeItemCount && activeItemCount > 0

  if (loading) {
    return (
      <div className="panel">
        <p className="muted">Cargando sesión...</p>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="panel">
        <h2>Enlace inválido</h2>
        <p className="muted">{error}</p>
        <button className="ghost" onClick={() => navigateTo('/admin')}>
          Volver al panel
        </button>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="panel">
        <h2>Enlace inválido</h2>
        <p className="muted">No encontramos una sesión activa para este token.</p>
      </div>
    )
  }

  if (session.status === 'REVOKED') {
    return (
      <div className="panel">
        <h2>Sesión revocada</h2>
        <p className="muted">Este enlace ya no está disponible.</p>
      </div>
    )
  }

  if (session.status === 'COMPLETED') {
    return (
      <div className="panel">
        <div className="section-header">
          <div>
            <p className="eyebrow">Resultados</p>
            <h2>Resultados completados</h2>
            <p className="muted">Gracias por completar el test.</p>
          </div>
          <button className="ghost" onClick={() => navigateTo('/admin')}>
            Volver al panel
          </button>
        </div>
        <div className="results">
          <div className="card">
            <h3>Totales por tipo</h3>
            <div className="totals">
              {Object.entries(data?.result?.totals ?? {}).map(([eneatype, score]) => (
                <div key={eneatype} className="total-row">
                  <span>Tipo {eneatype}</span>
                  <strong>{score}</strong>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <h3>Ranking</h3>
            <ol>
              {(data?.result?.ranking ?? []).map((entry) => (
                <li key={entry.eneatype}>
                  Tipo {entry.eneatype} · {entry.score} puntos
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="panel">
      {error && <div className="notice">{error}</div>}
      <div className="section-header">
        <div>
          <p className="eyebrow">Cuestionario</p>
          <h2>{definition?.name}</h2>
          <p className="muted">
            Responde todas las afirmaciones con un valor entre {definition?.scale?.min} y
            {definition?.scale?.max}.
          </p>
        </div>
        <div className="progress">
          <span>
            Respondidas {answeredCount}/{activeItemCount}
          </span>
          <button className="ghost" onClick={() => navigateTo('/admin')}>
            Panel admin
          </button>
        </div>
      </div>

      <div className="scale">
        {scale.map((entry) => (
          <div key={entry.value}>
            <strong>{entry.value}</strong>
            <span>{entry.label}</span>
          </div>
        ))}
      </div>

      <div className="questionnaires">
        {definition?.questionnaires?.map((questionnaire) => (
          <section key={questionnaire.id} className="questionnaire">
            <header>
              <h3>{getQuestionnaireTitle(questionnaire)}</h3>
              <span className="tag">Tipo {questionnaire.eneatype}</span>
            </header>
            <div className="items">
              {questionnaire.items.map((item) => (
                <div key={item.id} className="item">
                  <p>{item.text}</p>
                  <div className="choices segmented-group" role="radiogroup" aria-label={`Respuesta ${item.id}`}>
                    {scale.map((entry) => (
                      <label key={entry.value} className="segmented-option">
                        <input
                          type="radio"
                          name={`item-${item.id}`}
                          value={entry.value}
                          checked={answers[item.id] === entry.value}
                          onChange={(event) => onAnswerChange(item.id, event.target.value)}
                        />
                        <span className="segmented-label">{entry.value}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="submit-row">
        <button className="primary" onClick={() => onSubmit(token)} disabled={!isComplete}>
          Enviar respuestas
        </button>
      </div>
    </div>
  )
}

export default PublicTestPage
