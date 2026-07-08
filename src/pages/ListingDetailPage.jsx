import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ImageViewer from '../components/ImageViewer'
import { supabase } from '../lib/supabase'

function parseDisplayDate(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return null

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [year, month, day] = raw.split('-').map(Number)
    return new Date(Date.UTC(year, month - 1, day))
  }

  const slashMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (slashMatch) {
    const [, month, day, year] = slashMatch
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
  }

  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function formatDisplayDate(value) {
  const parsed = parseDisplayDate(value)
  if (!parsed) return String(value ?? '')
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(parsed)
}

const getUserName = (user) => (
  user?.user_metadata?.username
  || user?.user_metadata?.full_name
  || user?.user_metadata?.name
  || user?.email?.split('@')[0]
  || 'Community member'
).slice(0, 120)

export default function ListingDetailPage() {
  const { id } = useParams()
  const [listing, setListing] = useState(null)
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [status, setStatus] = useState('')
  const [statusType, setStatusType] = useState('info')
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [isFavorite, setIsFavorite] = useState(false)
  const [favoriteLoading, setFavoriteLoading] = useState(false)
  const [reservationOpen, setReservationOpen] = useState(false)
  const [reservationLoading, setReservationLoading] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reservationNote, setReservationNote] = useState('')
  const messageInputRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    let ignore = false

    async function loadPage() {
      setLoading(true)
      const [{ data: sessionData }, { data: listingData, error: listingError }] = await Promise.all([
        supabase.auth.getSession(),
        supabase.from('listings').select('*').eq('id', id).maybeSingle(),
      ])

      if (ignore) return

      const activeSession = sessionData.session
      setSession(activeSession)

      if (listingError || !listingData) {
        setStatus('This listing could not be found or is no longer available.')
        setStatusType('error')
        setLoading(false)
        return
      }

      setListing(listingData)

      const availableDates = [...(listingData.availability || [])].sort()
      if (availableDates.length) {
        setStartDate(availableDates[0])
        setEndDate(availableDates[0])
      }

      if (activeSession?.user) {
        const userId = activeSession.user.id
        const [messagesResult, favoriteResult] = await Promise.all([
          supabase
            .from('messages')
            .select('*')
            .eq('listing_id', id)
            .order('created_at', { ascending: true }),
          supabase
            .from('interests')
            .select('id')
            .eq('user_id', userId)
            .eq('listing_id', id)
            .maybeSingle(),
        ])

        if (!ignore) {
          const visibleMessages = (messagesResult.data || []).filter((message) => {
            if (!activeSession?.user) return false
            return message.sender_id === userId || listingData.owner_id === userId
          })

          setMessages(visibleMessages)
          setIsFavorite(Boolean(favoriteResult.data))
        }
      }

      if (!ignore) setLoading(false)
    }

    loadPage()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!ignore) setSession(nextSession)
    })

    return () => {
      ignore = true
      authListener.subscription.unsubscribe()
    }
  }, [id])

  const requireSignIn = () => {
    if (session?.user) return true
    navigate('/auth')
    return false
  }

  const handleFavorite = async () => {
    if (!requireSignIn() || !listing) return

    setFavoriteLoading(true)
    setStatus('')

    const query = isFavorite
      ? supabase.from('interests').delete().eq('user_id', session.user.id).eq('listing_id', listing.id)
      : supabase.from('interests').insert({ user_id: session.user.id, listing_id: listing.id })

    const { error } = await query

    if (error) {
      setStatus(`Could not ${isFavorite ? 'remove' : 'save'} this favorite: ${error.message}`)
      setStatusType('error')
    } else {
      setIsFavorite((current) => !current)
      setStatus(isFavorite ? 'Removed from your favorites.' : 'Saved to your dashboard favorites.')
      setStatusType('success')
    }

    setFavoriteLoading(false)
  }

  const handleMessageLister = () => {
    if (!requireSignIn()) return
    messageInputRef.current?.focus()
    messageInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const handleSend = async (event) => {
    event.preventDefault()
    if (!requireSignIn() || !draft.trim() || !listing?.owner_id) return

    const basePayload = {
      listing_id: Number(id),
      sender_id: session.user.id,
      sender_name: getUserName(session.user),
      content: draft.trim(),
    }

    const targetRecipientId = isOwner ? replyTarget?.sender_id || listing.owner_id : listing.owner_id
    const payloadWithRecipient = {
      ...basePayload,
      recipient_id: targetRecipientId,
    }

    let data
    let error

    ;({ data, error } = await supabase.from('messages').insert(payloadWithRecipient).select())

    if (error && /recipient_id|column/i.test(error.message)) {
      ;({ data, error } = await supabase.from('messages').insert(basePayload).select())
    }

    if (error) {
      setStatus(`Your message could not be sent: ${error.message}`)
      setStatusType('error')
      return
    }

    setMessages((current) => [...current, ...(data || [])])
    setDraft('')
    setStatus(`Message sent to ${replyTarget?.sender_name || listing.owner_name || 'the lister'}.`)
    setStatusType('success')
  }

  const openReservation = () => {
    if (!requireSignIn()) return
    setReservationOpen(true)
    setStatus('')
  }

  const handleReservation = async (event) => {
    event.preventDefault()
    if (!requireSignIn() || !listing?.owner_id || !startDate || !endDate) return

    setReservationLoading(true)
    setStatus('')

    const { error } = await supabase.from('reservations').insert({
      listing_id: Number(id),
      requester_id: session.user.id,
      owner_id: listing.owner_id,
      start_date: startDate,
      end_date: endDate,
      note: reservationNote.trim() || null,
    })

    if (error) {
      setStatus(`Reservation request could not be sent: ${error.message}`)
      setStatusType('error')
    } else {
      setStatus('Reservation request sent. You can track it from your dashboard.')
      setStatusType('success')
      setReservationOpen(false)
      setReservationNote('')
    }

    setReservationLoading(false)
  }

  if (loading) return <p className="status-pill">Loading listing…</p>

  if (!listing) {
    return (
      <section className="section">
        <div className="detail-card">
          <p className="auth-status error" role="alert">{status}</p>
          <Link className="text-link" to="/">Back to browse</Link>
        </div>
      </section>
    )
  }

  const isOwner = session?.user?.id === listing.owner_id
  const availableDates = [...(listing.availability || [])].sort()
  const validEndDates = availableDates.filter((date) => !startDate || date >= startDate)
  const today = new Date().toISOString().split('T')[0]
  const replyTarget = session?.user && isOwner
    ? [...messages].reverse().find((message) => message.sender_id && message.sender_id !== session.user.id) || null
    : { id: listing.owner_id, name: listing.owner_name || 'the lister' }

  return (
    <section className="section detail-layout">
      <div className="detail-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Listing detail</p>
            <h2>{listing.title}</h2>
          </div>
          <Link className="text-link" to="/">Back to browse</Link>
        </div>

        {listing.image_url || listing.image_urls?.length ? (
          <div className="detail-media">
            <ImageViewer images={[listing.image_url, ...(listing.image_urls || [])].filter(Boolean)} altPrefix="Listing image" />
          </div>
        ) : null}

        <div className="listing-primary-row">
          <p className="listing-price">{listing.price > 0 ? `$${listing.price}` : 'Price on request'}</p>
          {!isOwner ? (
            <div className="listing-action-buttons">
              <button className={isFavorite ? 'favorite-btn active' : 'favorite-btn'} type="button" onClick={handleFavorite} disabled={favoriteLoading} aria-pressed={isFavorite}>
                <svg aria-hidden="true" viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'}>
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {isFavorite ? 'Favorited' : 'Favorite'}
              </button>
              <button className="ghost-btn" type="button" onClick={handleMessageLister}>Message lister</button>
              <button className="primary-btn" type="button" onClick={openReservation}>Begin reservation</button>
            </div>
          ) : <span className="owner-listing-badge">Your listing</span>}
        </div>

        {status ? <p className={`auth-status ${statusType}`} role={statusType === 'error' ? 'alert' : 'status'}>{status}</p> : null}

        <p className="hero-text">{listing.description}</p>

        <div className="listing-meta detail-meta">
          <span>Mode: {listing.mode}</span>
          <span>Category: {listing.category}</span>
          <span>Borrow price: {listing.borrow_price > 0 ? `$${listing.borrow_price}` : 'Not offered'}</span>
          <span>Deposit: {listing.deposit_amount > 0 ? `$${listing.deposit_amount}` : 'None'}</span>
          <span>Max rental days: {listing.duration_days || 1}</span>
          <span>Owner: {listing.owner_name}</span>
          <span>Location: {listing.location || 'Local pickup'}</span>
        </div>

        {availableDates.length ? (
          <div className="availability-panel">
            <h3>Availability calendar</h3>
            <p>Select one or more of these dates when requesting a reservation.</p>
            <div className="availability-tags">
              {availableDates.map((date) => (
                <span key={date} className="availability-chip">{formatDisplayDate(date)}</span>
              ))}
            </div>
          </div>
        ) : null}

        {reservationOpen ? (
          <form className="reservation-form" onSubmit={handleReservation}>
            <div className="reservation-heading">
              <div>
                <p className="eyebrow">Reservation request</p>
                <h3>Choose your dates</h3>
              </div>
              <button className="auth-text-button" type="button" onClick={() => setReservationOpen(false)}>Cancel</button>
            </div>
            <div className="reservation-date-grid">
              <label>
                <span>Start date</span>
                {availableDates.length ? (
                  <select value={startDate} onChange={(event) => {
                    setStartDate(event.target.value)
                    if (endDate < event.target.value) setEndDate(event.target.value)
                  }} required>
                    {availableDates.map((date) => <option key={date} value={date}>{formatDisplayDate(date)}</option>)}
                  </select>
                ) : <input type="date" min={today} value={startDate} onChange={(event) => setStartDate(event.target.value)} required />}
              </label>
              <label>
                <span>End date</span>
                {availableDates.length ? (
                  <select value={endDate} onChange={(event) => setEndDate(event.target.value)} required>
                    {validEndDates.map((date) => <option key={date} value={date}>{formatDisplayDate(date)}</option>)}
                  </select>
                ) : <input type="date" min={startDate || today} value={endDate} onChange={(event) => setEndDate(event.target.value)} required />}
              </label>
            </div>
            <label>
              <span>Note to the lister (optional)</span>
              <textarea rows="3" maxLength="1000" value={reservationNote} onChange={(event) => setReservationNote(event.target.value)} placeholder="Add pickup timing or other details" />
            </label>
            <button className="primary-btn reservation-submit" type="submit" disabled={reservationLoading}>
              {reservationLoading ? 'Sending request…' : 'Request reservation'}
            </button>
          </form>
        ) : null}
      </div>

      <div className="detail-card chat-card" id="listing-messages">
        <h3>Message the lister</h3>
        <p className="chat-intro">Ask {listing.owner_name || 'the owner'} a question about this item.</p>

        {session?.user ? (
          <>
            {messages.length ? (
              <div className="chat-list">
                {messages.map((message) => (
                  <div className={message.sender_id === session.user.id ? 'chat-bubble mine' : 'chat-bubble'} key={message.id}>
                    <strong>{message.sender_id === session.user.id ? 'You' : message.sender_name}</strong>
                    <p>{message.content}</p>
                  </div>
                ))}
              </div>
            ) : <p className="chat-empty">No messages yet. Start the conversation.</p>}

            {(!isOwner || replyTarget) ? (
              <form className="chat-form" onSubmit={handleSend}>
                <label htmlFor="listing-message">{isOwner ? `Reply to ${replyTarget?.sender_name || 'the interested member'}` : 'Your message'}</label>
                <textarea id="listing-message" ref={messageInputRef} value={draft} onChange={(event) => setDraft(event.target.value)} rows="4" maxLength="2000" placeholder={isOwner ? `Reply to ${replyTarget?.sender_name || 'the interested member'}` : 'Ask about condition, pickup, or availability'} required />
                <button className="primary-btn" type="submit">{isOwner ? 'Send reply' : 'Send message'}</button>
              </form>
            ) : <p className="chat-empty">Messages from interested members appear here.</p>}
          </>
        ) : (
          <div className="chat-sign-in">
            <p>Sign in to send a private message to the lister.</p>
            <Link className="primary-btn" to="/auth">Sign in to message</Link>
          </div>
        )}
      </div>
    </section>
  )
}
