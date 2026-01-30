import { navigateTo } from '../utils/router'

function TopBar() {
  return (
    <header className="topbar">
      <button className="logo" onClick={() => navigateTo('/')}>
        ENEATest
      </button>
      <div className="top-actions">
        <a className="ghost button-link" href="/admin">
          Admin
        </a>
      </div>
    </header>
  )
}

export default TopBar
