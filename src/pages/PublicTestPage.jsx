import { DEFAULT_SCALE } from '../data/testDefinition'
import { navigateTo } from '../utils/router'
import { hasAllAnswers } from '../utils/scoring'
import { getQuestionnaireTitle } from '../utils/definition'

function PublicTestPage({
  token,
  definition,
  sessionsByToken,
  responses,
  overrides,
  activeItemCount,
  onAnswerChange,
  onSubmit,
}) {
  const session = sessionsByToken.get(token)
  const responseEntry = responses.find((entry) => entry.sessionId === session?.id)
  const answers = responseEntry?.answers ?? {}
  const answeredCount = Object.entries(answers).filter(([itemId, value]) => {
    if (!Number.isFinite(value)) return false
    if (overrides[itemId]?.isActive === false) return false
    return true
  }).length

  if (!session) {
    return (
      <div className="panel">
        <h2>Enlace inválido</h2>
        <p className="muted">No encontramos una sesión activa para este token.</p>
        <button className="ghost" onClick={() => navigateTo('/admin')}>
          Volver al panel
        </button>
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
              {Object.entries(session.result?.totals ?? {}).map(([eneatype, score]) => (
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
              {(session.result?.ranking ?? []).map((entry) => (
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
      <div className="section-header">
        <div>
          <p className="eyebrow">Cuestionario</p>
          <h2>{definition.name}</h2>
          <p className="muted">
            Responde todas las afirmaciones con un valor entre {definition.scale.min} y
            {definition.scale.max}.
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
        {DEFAULT_SCALE.map((entry) => (
          <div key={entry.value}>
            <strong>{entry.value}</strong>
            <span>{entry.label}</span>
          </div>
        ))}
      </div>

      <div className="questionnaires">
        {definition.questionnaires.map((questionnaire) => (
          <section key={questionnaire.id} className="questionnaire">
            <header>
              <h3>{getQuestionnaireTitle(questionnaire)}</h3>
              <span className="tag">Tipo {questionnaire.eneatype}</span>
            </header>
            <div className="items">
              {questionnaire.items
                .filter((item) => item.isActive)
                .map((item) => (
                  <div key={item.id} className="item">
                    <p>{item.text}</p>
                    <div className="choices">
                      {DEFAULT_SCALE.map((entry) => (
                        <label key={entry.value}>
                          <input
                            type="radio"
                            name={`item-${item.id}`}
                            value={entry.value}
                            checked={answers[item.id] === entry.value}
                            onChange={(event) =>
                              onAnswerChange(session.id, item.id, event.target.value)
                            }
                          />
                          <span>{entry.value}</span>
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
        <button
          className="primary"
          onClick={() => onSubmit(session.id)}
          disabled={!hasAllAnswers(definition, answers, overrides)}
        >
          Enviar respuestas
        </button>
      </div>
    </div>
  )
}

export default PublicTestPage
