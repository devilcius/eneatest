import { navigateTo } from '../utils/router'

function HomePage({ definition, activeItemCount }) {
  return (
    <div className="panel hero">
      <div>
        <p className="eyebrow">ENEATest</p>
        <img className="hero-logo" src="/img/eneatest.svg" alt="ENEATest logo" />
        <h1>{definition.name}</h1>
        <p className="lede">
          Solicita tu enlace personalizado para completar el test de eneagrama y descubrir tu tipo de personalidad.
        </p>
        <div className="actions">
          <button className="primary" onClick={() => navigateTo('/admin')}>
            Ir al panel de administración
          </button>
        </div>
      </div>
      <div className="hero-card">
        <div className="stat">
          <span>{definition.questionnaires.length}</span>
          <span>Cuestionarios</span>
        </div>
        <div className="stat">
          <span>{activeItemCount}</span>
          <span>Ítems activos</span>
        </div>
        <div className="stat">
          <span>
            {definition.scale.min}–{definition.scale.max}
          </span>
          <span>Escala</span>
        </div>
      </div>
    </div>
  )
}

export default HomePage
