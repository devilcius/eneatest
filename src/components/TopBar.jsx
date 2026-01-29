import { navigateTo } from '../utils/router'

function TopBar() {
  return (
    <header className="topbar">
      <button className="logo" onClick={() => navigateTo('/')}>
        ENEATest
      </button>
      <div className="top-actions">
        <button className="ghost" onClick={() => navigateTo('/admin')}>
          Admin
        </button>
        <button className="ghost" onClick={() => navigateTo('/t/demo')}>
          Probar token
        </button>
      </div>
    </header>
  )
}

export default TopBar
