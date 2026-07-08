import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import WelcomePrompt from '../components/WelcomePrompt'
import { supabase } from '../lib/supabase'

export default function HomePage({ session, authReady }) {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [locationFilter, setLocationFilter] = useState('')

  useEffect(() => {
    let ignore = false

    async function loadListings() {
      setLoading(true)
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .order('created_at', { ascending: false })

      if (!ignore) {
        if (error) {
          setStatus('Listings could not be loaded. Check the Supabase schema and try again.')
          setListings([])
        } else {
          setListings(data || [])
        }
        setLoading(false)
      }
    }

    loadListings()

    return () => {
      ignore = true
    }
  }, [])

  const filteredListings = [...listings]
    .filter((listing) => (categoryFilter === 'All' ? true : listing.category === categoryFilter))
    .filter((listing) => {
      if (!locationFilter.trim()) return true
      return (listing.location || '').toLowerCase().includes(locationFilter.trim().toLowerCase())
    })

  const sortedListings = [...filteredListings].sort((a, b) => {
    if (sortBy === 'location') {
      return (a.location || '').localeCompare(b.location || '')
    }

    if (sortBy === 'price') {
      return (a.price || 0) - (b.price || 0)
    }

    return new Date(b.created_at || 0) - new Date(a.created_at || 0)
  })

  return (
    <>
      <WelcomePrompt session={session} authReady={authReady} />
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Borrow smarter. Trade easier.</p>
          <h1>Find the gear you need without buying everything new.</h1>
          <p className="hero-text">
            Borrow & Barter brings together local listings with flexible borrow-and-buy options, built-in chats,
            and category browsing designed to feel familiar and polished.
          </p>
          <div className="hero-actions">
            <Link className="primary-btn" to={session ? '/new' : '/auth'}>
              {session ? 'List or buy' : 'Login to list or buy'}
            </Link>
            <a className="ghost-btn" href="#listings">Browse listings</a>
          </div>
        </div>

        <div className="hero-panel">
          <div className="panel-card">
            <div className="panel-top">
              <span className="panel-badge">Featured flow</span>
              <span className="panel-price">Borrow or buy</span>
            </div>
            <h2>Deposit-based lending made simple</h2>
            <p>List an item as borrow-only, buy-only, or borrow-and-buy and keep conversations tied to each listing.</p>
            <div className="panel-details">
              <div>
                <strong>Deposit</strong>
                <span>Reserve with confidence</span>
              </div>
              <div>
                <strong>Rental</strong>
                <span>Daily and multi-day terms</span>
              </div>
              <div>
                <strong>Buyout</strong>
                <span>Convert to ownership later</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="listings">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Live listings</p>
            <h2>Browse the latest items from the community.</h2>
          </div>
          <div className="section-actions">
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="sort-select">
              <option value="All">All categories</option>
              <option value="Tools & Hardware">Tools & Hardware</option>
              <option value="Electronics">Electronics</option>
              <option value="Vehicles">Vehicles</option>
              <option value="Home & Garden">Home & Garden</option>
              <option value="Fashion & Style">Fashion & Style</option>
              <option value="Sporting Goods">Sporting Goods</option>
            </select>
            <input className="sort-select" value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)} placeholder="Filter location" />
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="sort-select">
              <option value="newest">Newest</option>
              <option value="location">Location</option>
              <option value="price">Price</option>
            </select>
            <Link className="text-link" to={session ? '/new' : '/auth'}>Create a listing</Link>
          </div>
        </div>

        {status ? <p className="status-pill">{status}</p> : null}

        {loading ? (
          <p className="status-pill">Loading listings…</p>
        ) : sortedListings.length ? (
          <div className="listing-grid">
            {sortedListings.map((listing) => {
              const thumbnail = listing.image_url || listing.image_urls?.[0]

              return (
                <article className="listing-card" key={listing.id}>
                  <Link className="listing-thumbnail" to={`/listings/${listing.id}`} aria-label={`View ${listing.title}`}>
                    {thumbnail ? (
                      <img src={thumbnail} alt={`${listing.title} thumbnail`} loading="lazy" />
                    ) : (
                      <span className="listing-thumbnail-placeholder">No photo available</span>
                    )}
                  </Link>
                  <div className="listing-top">
                    <span className="listing-tag">{listing.category}</span>
                    <span className="listing-mode">{listing.mode}</span>
                  </div>
                  <h3>{listing.title}</h3>
                  <p className="listing-price">
                    {listing.price > 0 ? `$${listing.price}` : 'Price on request'}
                  </p>
                  <div className="listing-meta">
                    <span>Borrow: {listing.borrow_price > 0 ? `$${listing.borrow_price}` : 'Not offered'}</span>
                    <span>Deposit: {listing.deposit_amount > 0 ? `$${listing.deposit_amount}` : 'None'}</span>
                    <span>Duration: up to {listing.duration_days || 1} day(s)</span>
                    <span>Location: {listing.location || 'Local pickup'}</span>
                  </div>
                  <p className="listing-note">{listing.description}</p>
                  <Link className="ghost-btn small" to={`/listings/${listing.id}`}>
                    View details
                  </Link>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="detail-card">
            <h3>No listings found</h3>
            <p className="hero-text">Try changing your filters, or sign in to publish the first listing.</p>
          </div>
        )}
      </section>
    </>
  )
}
