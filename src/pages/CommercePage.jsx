import { Link } from 'react-router-dom'

const paymentMethods = [
  { name: 'Apple Pay', note: 'Fast one-tap checkout for iPhone and Safari buyers.' },
  { name: 'Google Pay', note: 'Android-friendly wallet payments with secure tokenized flows.' },
  { name: 'PayPal', note: 'Trusted checkout for buyers who prefer wallet-based payments.' },
  { name: 'Cash App', note: 'Simple peer-to-peer settlement for local exchanges.' },
  { name: 'Zelle', note: 'Direct bank transfer support for quick in-person transactions.' },
]

const payoutSteps = [
  'Create a business dashboard with Stripe Connect, PayPal for Business, or a marketplace payout provider.',
  'Connect the owner’s bank account through ACH, Plaid, or your provider’s onboarding flow.',
  'Set the marketplace commission to 3% and route the remaining balance to the listing owner.',
  'Enable webhook events and settlement reports so every sale can be reconciled automatically.',
]

export default function CommercePage() {
  return (
    <section className="section commerce-layout">
      <div className="detail-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Commerce layer</p>
            <h2>Built for secure buying, borrowing, and payout settlement.</h2>
          </div>
          <Link className="text-link" to="/">Back home</Link>
        </div>

        <div className="commission-pill">Marketplace commission: 3%</div>
        <p className="hero-text">
          Every completed transaction can be routed through the platform’s payment vault, with the marketplace taking a 3% commission and the remaining balance sent to the listing owner or borrower.
        </p>

        <div className="payment-grid">
          {paymentMethods.map((method) => (
            <article className="info-card" key={method.name}>
              <h3>{method.name}</h3>
              <p>{method.note}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="detail-card">
        <h3>Owner payout setup</h3>
        <div className="stack-list">
          {payoutSteps.map((step) => (
            <div className="stack-item" key={step}>
              <p>{step}</p>
            </div>
          ))}
        </div>
        <Link className="primary-btn payment-guide-link" to="/payment-readme">
          Open payment setup guide
        </Link>
      </div>
    </section>
  )
}
