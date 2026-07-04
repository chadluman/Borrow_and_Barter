import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { setRememberSession, supabase } from '../lib/supabase'

export default function AuthPage() {
  const [mode, setMode] = useState('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [status, setStatus] = useState('')
  const [statusType, setStatusType] = useState('info')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('reset-password')
        setPassword('')
        setStatus('Enter a new password for your account.')
        setStatusType('info')
      }
    })

    return () => authListener.subscription.unsubscribe()
  }, [])

  const selectMode = (nextMode) => {
    setMode(nextMode)
    setStatus('')
    setPassword('')
    setShowPassword(false)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setStatus('')

    try {
      if (mode === 'forgot-password') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth`,
        })
        if (error) throw error

        setStatus('Password reset email sent. Open the link in that email to choose a new password.')
        setStatusType('success')
        return
      }

      if (mode === 'reset-password') {
        const { error } = await supabase.auth.updateUser({ password })
        if (error) throw error

        setStatus('Your password has been updated. You can now continue to your dashboard.')
        setStatusType('success')
        return
      }

      if (mode === 'sign-up') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName || email.split('@')[0] },
          },
        })

        if (error) throw error

        if (data.session) {
          navigate('/dashboard')
        } else {
          setStatus('Account created. Check your inbox to confirm your email before signing in.')
          setStatusType('success')
        }
      } else {
        setRememberSession(rememberMe)
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })

        if (error) throw error
        if (data.session) navigate('/dashboard')
      }
    } catch (error) {
      setStatus(error.message || 'Authentication failed. Please check your details and try again.')
      setStatusType('error')
    } finally {
      setLoading(false)
    }
  }

  const isSignIn = mode === 'sign-in'
  const isSignUp = mode === 'sign-up'
  const isForgotPassword = mode === 'forgot-password'
  const isResetPassword = mode === 'reset-password'

  const heading = isSignIn
    ? 'Welcome back'
    : isSignUp
      ? 'Create your account'
      : isForgotPassword
        ? 'Reset your password'
        : 'Choose a new password'

  return (
    <section className="section auth-layout">
      <div className="auth-card">
        <div className="auth-header">
          <Link className="auth-brand" to="/" aria-label="Borrow and Barter home">
            <img src="/logo.png" alt="" />
          </Link>
          <p className="eyebrow">Secure account access</p>
          <h1>{heading}</h1>
          <p className="auth-intro">
            {isForgotPassword
              ? 'Enter your email and we’ll send you a secure recovery link.'
              : isResetPassword
                ? 'Use at least six characters for your new password.'
                : isSignIn
                  ? 'Sign in to manage listings, messages, and saved items.'
                  : 'Join your local community of borrowers, buyers, and traders.'}
          </p>
        </div>

        {!isForgotPassword && !isResetPassword ? (
          <div className="auth-tabs" role="tablist" aria-label="Account options">
            <button className={isSignIn ? 'tab active' : 'tab'} type="button" role="tab" aria-selected={isSignIn} onClick={() => selectMode('sign-in')}>
              Sign in
            </button>
            <button className={isSignUp ? 'tab active' : 'tab'} type="button" role="tab" aria-selected={isSignUp} onClick={() => selectMode('sign-up')}>
              Register
            </button>
          </div>
        ) : null}

        <form className="auth-form" onSubmit={handleSubmit}>
          {isSignUp ? (
            <label className="auth-field" htmlFor="full-name">
              <span>Full name</span>
              <input id="full-name" name="name" autoComplete="name" maxLength="120" value={fullName} onChange={(event) => setFullName(event.target.value)} />
            </label>
          ) : null}

          {!isResetPassword ? (
            <label className="auth-field" htmlFor="email">
              <span>Email address</span>
              <input id="email" name="email" type="email" autoComplete="email" maxLength="254" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </label>
          ) : null}

          {!isForgotPassword ? (
            <label className="auth-field" htmlFor="password">
              <span>{isResetPassword ? 'New password' : 'Password'}</span>
              <span className="password-input-wrap">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isResetPassword || isSignUp ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength="6"
                  maxLength="128"
                />
                <button className="password-toggle" type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </span>
            </label>
          ) : null}

          {isSignIn ? (
            <div className="auth-options">
              <label className="remember-option">
                <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} />
                <span>Remember me</span>
              </label>
              <button className="auth-text-button" type="button" onClick={() => selectMode('forgot-password')}>
                Forgot password?
              </button>
            </div>
          ) : null}

          <button className="primary-btn auth-submit" type="submit" disabled={loading}>
            {loading
              ? 'Please wait…'
              : isSignIn
                ? 'Sign in'
                : isSignUp
                  ? 'Create account'
                  : isForgotPassword
                    ? 'Send reset link'
                    : 'Update password'}
          </button>

          {isForgotPassword || isResetPassword ? (
            <button className="auth-text-button auth-back" type="button" onClick={() => selectMode('sign-in')}>
              Back to sign in
            </button>
          ) : null}

          {isSignUp ? <p className="auth-helper">We’ll email you a confirmation link before your first sign-in.</p> : null}
        </form>

        {status ? <p className={`auth-status ${statusType}`} role={statusType === 'error' ? 'alert' : 'status'}>{status}</p> : null}

        <Link className="auth-home-link" to="/">Return to home</Link>
      </div>
    </section>
  )
}
