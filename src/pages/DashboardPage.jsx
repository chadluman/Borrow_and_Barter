import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function DashboardPage() {
  const [session, setSession] = useState(null)
  const [listings, setListings] = useState([])
  const [favorites, setFavorites] = useState([])
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [availabilitySummary, setAvailabilitySummary] = useState([])

  useEffect(() => {
    let ignore = false

    async function loadDashboard() {
      const { data: { session: activeSession } } = await supabase.auth.getSession()
      if (!ignore) setSession(activeSession)

      if (!activeSession?.user) {
        if (!ignore) setLoading(false)
        return
      }

      const [listingsResult, favoritesResult, reservationsResult] = await Promise.all([
        supabase.from('listings').select('*').eq('owner_id', activeSession.user.id).order('created_at', { ascending: false }),
        supabase.from('interests').select('id, listing_id, created_at, listing:listings(*)').eq('user_id', activeSession.user.id).order('created_at', { ascending: false }),
        supabase.from('reservations').select('*, listing:listings(id, title, image_url, image_urls, owner_name)').order('created_at', { ascending: false }),
      ])

      if (!ignore) {
        const ownedListings = listingsResult.data || []
        const dates = ownedListings.flatMap((listing) => listing.availability || [])
        setListings(ownedListings)
        setFavorites(favoritesResult.data || [])
        setReservations(reservationsResult.data || [])
        setAvailabilitySummary([...new Set(dates)].sort())
        setLoading(false)
      }
    }

    loadDashboard()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!ignore) setSession(nextSession)
    })

    return () => {
      ignore = true
      authListener.subscription.unsubscribe()
    }
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const formatAvailabilityDate = (date) => {
    const parsedDate = new Date(`${date}T00:00:00`)

    return {
      weekday: parsedDate.toLocaleDateString(undefined, { weekday: 'short' }),
      month: parsedDate.toLocaleDateString(undefined, { month: 'short' }),
      day: parsedDate.toLocaleDateString(undefined, { day: 'numeric' }),
      year: parsedDate.toLocaleDateString(undefined, { year: 'numeric' }),
    }
  }

  if (loading) {
    return <p className="status-pill">Loading dashboard…</p>
  }

  if (!session?.user) {
    return (
      <section className="section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Your account</p>
            <h2>Please sign in to manage your listings.</h2>
          </div>
          <Link className="text-link" to="/auth">Go to sign in</Link>
        </div>
      </section>
    )
  }

  return (
    <section className="section dashboard-layout">
      <div className="detail-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Dashboard</p>
            <h2>Welcome back, {session.user.email}</h2>
          </div>
          <button className="ghost-btn" type="button" onClick={handleSignOut}>Sign out</button>
        </div>

        <div className="hero-actions">
          <Link className="primary-btn" to="/new">Create a listing</Link>
          <Link className="ghost-btn" to="/">Browse marketplace</Link>
        </div>

        <div className="availability-panel dashboard-availability">
          <div className="availability-heading">
            <div>
              <h3>Availability overview</h3>
              <p>Dates currently offered across your listings</p>
            </div>
            <strong className="availability-count">{availabilitySummary.length}</strong>
          </div>
          {availabilitySummary.length ? (
            <div className="availability-date-grid">
              {availabilitySummary.map((date) => {
                const formattedDate = formatAvailabilityDate(date)

                return (
                  <time key={date} className="availability-date" dateTime={date}>
                    <span className="availability-weekday">{formattedDate.weekday}</span>
                    <span className="availability-month">{formattedDate.month}</span>
                    <strong>{formattedDate.day}</strong>
                    <span className="availability-year">{formattedDate.year}</span>
                  </time>
                )
              })}
            </div>
          ) : (
            <p className="availability-empty">No availability dates set yet. Add them when you create a listing.</p>
          )}
        </div>
      </div>

      <div className="detail-card">
        <h3>Your listings</h3>
        {listings.length ? (
          <div className="dashboard-listing-grid">
            {listings.map((listing) => {
              const thumbnail = listing.image_url || listing.image_urls?.[0]

              return (
                <Link
                  className="dashboard-listing-card"
                  key={listing.id}
                  to={`/listings/${listing.id}`}
                  aria-label={`View listing: ${listing.title}`}
                >
                  <span className="dashboard-listing-thumbnail">
                    {thumbnail ? (
                      <img src={thumbnail} alt="" loading="lazy" />
                    ) : (
                      <span className="dashboard-listing-placeholder">No photo</span>
                    )}
                  </span>
                  <span className="dashboard-listing-content">
                    <span className="dashboard-listing-topline">
                      <span className="listing-tag">{listing.category}</span>
                      <span className="listing-mode">{listing.mode}</span>
                    </span>
                    <strong>{listing.title}</strong>
                    <span className="dashboard-listing-description">{listing.description}</span>
                    <span className="dashboard-listing-footer">
                      <span>{listing.price > 0 ? `$${listing.price}` : 'Price on request'}</span>
                      <span className="dashboard-view-link">View listing <span aria-hidden="true">→</span></span>
                    </span>
                  </span>
                </Link>
              )
            })}
          </div>
        ) : (
          <p className="hero-text">No listings yet. Create one to get started.</p>
        )}
      </div>

      <div className="detail-card">
        <h3>Favorites</h3>
        {favorites.length ? (
          <div className="favorite-grid">
            {favorites.map((favorite) => {
              const favoriteListing = favorite.listing
              if (!favoriteListing) return null
              const thumbnail = favoriteListing.image_url || favoriteListing.image_urls?.[0]

              return (
                <Link className="favorite-card" key={favorite.id} to={`/listings/${favoriteListing.id}`}>
                  <span className="favorite-thumbnail">
                    {thumbnail ? <img src={thumbnail} alt="" loading="lazy" /> : <span>No photo</span>}
                  </span>
                  <span>
                    <strong>{favoriteListing.title}</strong>
                    <small>{favoriteListing.category} · {favoriteListing.location || 'Local pickup'}</small>
                  </span>
                  <span className="favorite-arrow" aria-hidden="true">→</span>
                </Link>
              )
            })}
          </div>
        ) : (
          <p className="hero-text">You have not favorited any listings yet.</p>
        )}
      </div>

      <div className="detail-card">
        <h3>Reservations</h3>
        {reservations.length ? (
          <div className="reservation-list">
            {reservations.map((reservation) => {
              const requestedByYou = reservation.requester_id === session.user.id
              const thumbnail = reservation.listing?.image_url || reservation.listing?.image_urls?.[0]

              return (
                <Link className="reservation-card" key={reservation.id} to={`/listings/${reservation.listing_id}`}>
                  <span className="reservation-card-thumbnail">
                    {thumbnail ? <img src={thumbnail} alt="" loading="lazy" /> : <span>No photo</span>}
                  </span>
                  <span className="reservation-card-content">
                    <span className="reservation-card-heading">
                      <strong>{reservation.listing?.title || 'Listing reservation'}</strong>
                      <span className={`reservation-status ${reservation.status}`}>{reservation.status}</span>
                    </span>
                    <small>{requestedByYou ? 'Your request' : 'Request received'} · {new Date(`${reservation.start_date}T00:00:00`).toLocaleDateString()} – {new Date(`${reservation.end_date}T00:00:00`).toLocaleDateString()}</small>
                    {reservation.note ? <span className="reservation-card-note">{reservation.note}</span> : null}
                  </span>
                </Link>
              )
            })}
          </div>
        ) : (
          <p className="hero-text">No reservation requests yet.</p>
        )}
      </div>
    </section>
  )
}
