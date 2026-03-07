import { useState } from 'react'
import AdminPage from './pages/AdminPage'
import DeliveranceSwarm from './pages/DeliveranceSwarm'
import './App.css'

export default function App() {
  const [view, setView] = useState<'admin' | 'swarm'>('admin')

  if (view === 'swarm') {
    return (
      <div>
        <button
          onClick={() => setView('admin')}
          style={{
            position: 'fixed', top: 12, right: 16, zIndex: 999,
            padding: '6px 14px', background: '#1A1A2A', border: '1px solid #353550',
            borderRadius: 6, color: '#8A88A8', fontSize: 11, cursor: 'pointer',
            fontWeight: 600, letterSpacing: '0.3px',
          }}
        >
          ← Admin
        </button>
        <DeliveranceSwarm />
      </div>
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <img src="/logo-small.png" alt="Moltworker" className="header-logo" />
        <h1>Moltbot Admin</h1>
        <button
          onClick={() => setView('swarm')}
          style={{
            marginLeft: 'auto', padding: '6px 14px', background: '#7E5DB815',
            border: '1px solid #7E5DB840', borderRadius: 6, color: '#7E5DB8',
            fontSize: 11, cursor: 'pointer', fontWeight: 600, letterSpacing: '0.3px',
          }}
        >
          ◈ Delivery Swarm
        </button>
      </header>
      <main className="app-main">
        <AdminPage />
      </main>
    </div>
  )
}
