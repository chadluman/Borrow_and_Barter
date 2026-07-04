import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

export default function WelcomePrompt() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const seen = sessionStorage.getItem('borrow-barter-welcome-seen')
    if (!seen) {
      setVisible(true)
    }
  }, [])

  const dismiss = () => {
    sessionStorage.setItem('borrow-barter-welcome-seen', 'true')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="welcome-banner">
      <div>
        <h3>Welcome to Borrow & Barter</h3>
        <p>Sign in to list items, manage your account, and buy or borrow with confidence.</p>
      </div>
      <div className="hero-actions">
        <Link className="primary-btn" to="/auth" onClick={dismiss}>Sign in</Link>
        <button className="ghost-btn" type="button" onClick={dismiss}>Continue browsing</button>
      </div>
    </div>
  )
}
