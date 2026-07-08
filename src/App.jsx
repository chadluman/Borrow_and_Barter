import { useEffect, useState } from 'react'
import { Link, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import HomePage from './pages/HomePage'
import CreateListingPage from './pages/CreateListingPage'
import ListingDetailPage from './pages/ListingDetailPage'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import CommercePage from './pages/CommercePage'
import { supabase } from './lib/supabase'

function App() {
  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(false)

  const signedInName = session?.user
    ? session.user.user_metadata?.username
      || session.user.user_metadata?.full_name
      || session.user.user_metadata?.name
      || session.user.email?.split('@')[0]
      || 'Member'
    : ''

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthReady(true)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setAuthReady(true)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" to="/">
          <img className="brand-logo" src="/logo.png" alt="Borrow & Barter logo" />
          <div className="brand-copy">
            <p className="brand-name">
              <span className="brand-name-gold">Borrow</span>
              <span className="brand-name-amp"> &amp; </span>
              <span className="brand-name-silver">Barter</span>
            </p>
            <span className="brand-subtitle">Share more <i aria-hidden="true" /> Spend less</span>
          </div>
        </Link>

        <div className="header-actions">
          {session ? (
            <Link className="signed-in-pill" to="/dashboard" title={`Signed in as ${signedInName}`}>
              <span>Signed in as</span>
              <strong>{signedInName}</strong>
            </Link>
          ) : null}
          <nav className="nav-links" aria-label="Primary">
            <Link to="/">Home</Link>
            <Link to="/new">Create</Link>
            <Link to="/commerce">Commerce</Link>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/auth">{session ? 'Account' : 'Sign in'}</Link>
          </nav>
        </div>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<HomePage session={session} authReady={authReady} />} />
          <Route path="/new" element={session ? <CreateListingPage /> : <Navigate to="/auth" replace />} />
          <Route path="/listings/:id" element={<ListingDetailPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/dashboard" element={session ? <DashboardPage /> : <Navigate to="/auth" replace />} />
          <Route path="/commerce" element={session ? <CommercePage /> : <Navigate to="/auth" replace />} />
          <Route path="/payment-readme" element={<div className="section"><div className="detail-card"><h2>Payment setup guide</h2><p>Open the payment guide in the project root at PAYMENT_README.md for bank account setup and marketplace payout instructions.</p></div></div>} />
        </Routes>
      </main>

      <footer className="footer">
        <p>Borrow & Barter is a live concept marketplace experience with authentication, listings, and chat flows connected to Supabase.</p>
      </footer>
    </div>
  )
}

export default App
