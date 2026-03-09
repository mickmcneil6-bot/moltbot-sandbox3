import { useState } from 'react'
import AdminPage from './pages/AdminPage'
import VideoGeneratorPage from './pages/VideoGeneratorPage'
import './App.css'

type Tab = 'admin' | 'video'

export default function App() {
  const [tab, setTab] = useState<Tab>('admin')

  return (
    <div className="app">
      <header className="app-header">
        <img src="/logo-small.png" alt="Moltworker" className="header-logo" />
        <h1>Moltbot Admin</h1>
        <nav className="header-nav">
          <button
            className={`nav-tab ${tab === 'admin' ? 'active' : ''}`}
            onClick={() => setTab('admin')}
          >
            Devices
          </button>
          <button
            className={`nav-tab ${tab === 'video' ? 'active' : ''}`}
            onClick={() => setTab('video')}
          >
            Video Generator
          </button>
        </nav>
      </header>
      <main className="app-main">
        {tab === 'admin' && <AdminPage />}
        {tab === 'video' && <VideoGeneratorPage />}
      </main>
    </div>
  )
}
