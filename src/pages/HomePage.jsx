import { navigateTo } from '../utils/router'

function HomePage({ definition, activeItemCount }) {
  return (
    <div className="panel hero">
      <div>
        <p className="eyebrow">ENEATest · Demo local</p>
        <h1>{definition.name}</h1>
        <p className="lede">
          Administra usuarios, genera enlaces únicos y completa el cuestionario de 9 tipos. Esta
          versión funciona sin backend y guarda datos en tu navegador.
        </p>
        <div className="actions">
          <button className="primary" onClick={() => navigateTo('/admin')}>
            Ir al panel de administración
          </button>
          <button className="ghost" onClick={() => navigateTo('/t/demo')}>
            Probar con token de muestra
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
