import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../constants';

const BrandMark = () => (
  <span className="client-logo-mark" aria-hidden="true">
    <span className="material-symbols-outlined">hub</span>
  </span>
);

function Home() {
  const navigate = useNavigate();

  const serviceCards = [
    ['storefront', 'Product Showcase', 'Pitch products to ready clients'],
    ['support_agent', 'Service Requests', 'Receive and manage client requests'],
    ['inventory_2', 'Inventory Items', 'Publish add-ons and product stock'],
    ['campaign', 'Company Pitch', 'Promote your offer by city'],
    ['chat_bubble', 'Client Chat', 'Talk directly before and after booking'],
    ['payments', 'Payments', 'Cash, card, and online payment options'],
  ];

  const features = [
    ['verified', 'Verified Companies', 'Only admin-approved businesses appear to clients'],
    ['location_city', 'Pakistan Cities', 'Companies are listed city-wise for local discovery'],
    ['edit_calendar', 'Easy Request Flow', 'Choose company, service/product, date and notes'],
    ['groups', 'Assigned Staff ETA', 'Live tracking and status updates after assignment'],
    ['chat_bubble', 'In-app Chat', 'Chat with the company or platform support'],
    ['payments', 'Secure Payments', 'Pay with cash or card, your choice'],
    ['map', 'Live Tracking', 'Track accepted work in real time'],
    ['history', 'Booking History', 'View all your past bookings'],
  ];

  const steps = [
    ['1', 'Discover Companies', 'Search by city, category, service, product, or company name.', 'fact_check'],
    ['2', 'Send Request', 'Choose the company offer, add details, and chat if needed.', 'mobile_friendly'],
    ['3', 'Track, Pay & Review', 'Follow status updates, complete payment, and rate the company.', 'credit_card'],
  ];

  const reviews = [
    ['Muhammad Usman', 'Lahore', 'I found the right company in my city, compared their offer, and sent a request in minutes.'],
    ['Sana Ahmed', 'Karachi', 'A clean platform for discovering trusted Pakistani businesses with transparent pricing.'],
    ['Hassan Ali', 'Islamabad', 'The chat, tracking, payment, and review flow made the whole service request feel simple.'],
  ];

  const faqs = [
    'How do I send a request?',
    'Are the companies verified?',
    'What payment methods do you accept?',
    'Can companies list products and services?',
    'Can I reschedule or cancel my booking?',
    'How can I contact support?',
  ];

  return (
    <div className="client-landing min-h-screen text-[#0D1B2A]">
      <header className="client-site-header">
        <button onClick={() => navigate(ROUTES.home)} className="client-brand" aria-label="FleetOS home">
          <BrandMark />
          <span>FleetOS</span>
        </button>
        <nav className="client-nav-links" aria-label="Main navigation">
          <button onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}>How it works</button>
          <button onClick={() => navigate('/company/register')}>For Companies</button>
          <button onClick={() => navigate(ROUTES.about)}>About us</button>
          <button onClick={() => navigate(ROUTES.contact)}>Help</button>
        </nav>
        <div className="client-header-actions">
          <button onClick={() => navigate(ROUTES.login)} className="client-soft-btn">Login</button>
          <button onClick={() => navigate(ROUTES.companies)} className="client-dark-btn">Find companies</button>
        </div>
      </header>

      <main>
        <section className="client-hero-shell">
          <div className="client-hero-copy">
            <div className="client-pill"><span className="material-symbols-outlined">stars</span> Pakistan’s multi-company SaaS marketplace</div>
            <h1>Companies pitch. <br />Clients discover, request, and <em>book with confidence</em></h1>
            <p>FleetOS lets approved Pakistani companies list their products, services, add-ons, and offers city-wise while clients search, compare, chat, book, pay, track, and review in one connected portal.</p>
            <div className="client-cta-row">
              <button onClick={() => navigate(ROUTES.companies)} className="client-dark-btn client-large-btn">Find companies</button>
              <button onClick={() => navigate(ROUTES.companies)} className="client-outline-btn client-large-btn">Book service</button>
            </div>
            <div className="client-stats-row" aria-label="FleetOS stats">
              <span><b>1M+</b> Happy customers</span>
              <span><b>1,500+</b> Verified companies</span>
              <span><b>50+</b> Cities in Pakistan</span>
              <span><b>4.8★</b> Average rating</span>
            </div>
          </div>

          <div className="client-hero-visual" aria-label="FleetOS booking preview">
            <div className="client-float-card card-coral"><span className="material-symbols-outlined">verified_user</span><b>Verified</b><small>Trusted Companies</small></div>
            <div className="client-float-card card-lilac"><span className="client-avatar-dot">QA</span><b>Request Status</b><small>Accepted by company</small></div>
            <div className="client-float-card card-yellow"><span className="material-symbols-outlined">payments</span><b>Secure Payments</b><small>Cash or Card</small></div>
            <div className="client-float-card card-cream"><span className="material-symbols-outlined">location_on</span><b>Live Tracking</b><small>On the way</small></div>
            <div className="client-phone-mock">
              <div className="client-phone-top"><span>9:41</span><span>● ● ●</span></div>
              <p className="client-phone-muted">Good morning,</p>
              <h3>Ali Raza 👋</h3>
              <div className="client-location-chip"><span className="material-symbols-outlined">location_on</span>Lahore, Punjab</div>
              <div className="client-phone-search">What product or service do you need?</div>
              <div className="client-phone-grid">
                <span>Browse offers</span><span>Track request</span><span>Chat company</span>
              </div>
              <div className="client-booking-card">
                <div>
                  <b>Service Request</b>
                  <small>Company offer • Lahore</small>
                </div>
                <em>In progress</em>
              </div>
            </div>
          </div>
        </section>

        <section className="client-section client-service-strip">
          <div className="client-section-head compact">
            <h2>Popular marketplace tools</h2>
            <button onClick={() => navigate(ROUTES.companies)}>View companies <span>→</span></button>
          </div>
          <div className="client-service-row">
            {serviceCards.map(([icon, title, text]) => (
              <button key={title} onClick={() => navigate(`${ROUTES.companies}?q=${encodeURIComponent(title)}`)} className="client-service-card">
                <span className="material-symbols-outlined">{icon}</span>
                <b>{title}</b>
                <small>{text}</small>
              </button>
            ))}
          </div>
        </section>

        <section className="client-trusted-row" aria-label="Trusted brands">
          <p>Built for Pakistani companies and clients</p>
          <div>
            {['LAHORE', 'KARACHI', 'ISLAMABAD', 'MULTAN', 'PESHAWAR', 'QUETTA', 'FAISALABAD', 'SIALKOT'].map((brand) => <span key={brand}>{brand}</span>)}
          </div>
        </section>

        <section className="client-section client-app-section">
          <div>
            <h2>Everything clients need <br />to find <em>the right company</em></h2>
            <p>From discovery to chat, request tracking, payments, and reviews, every company-client interaction stays in one real-time flow.</p>
            <div className="client-store-row">
              <span>Download on the<br /><b>App Store</b></span>
              <span>Get it on<br /><b>Google Play</b></span>
            </div>
          </div>
          <div className="client-feature-grid">
            {features.map(([icon, title, text], idx) => (
              <article key={title} className={`client-mini-feature tone-${idx % 4}`}>
                <span className="material-symbols-outlined">{icon}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="client-dark-band">
          <h2>Why clients and companies choose FleetOS <br /><em>for trusted digital commerce</em></h2>
          <div className="client-dark-features">
            {[
              ['workspace_premium', 'Verified & Rated', 'We onboard admin-approved companies with real client reviews.'],
              ['receipt_long', 'Transparent Offers', 'Clients can see services, products, optional items, and prices before requesting.'],
              ['health_and_safety', 'Trust You Can Measure', 'Approvals, reviews, status updates, and payments keep the workflow accountable.'],
              ['support_agent', 'Support That Cares', 'Our support team is available before, during, and after a request.'],
            ].map(([icon, title, text]) => (
              <article key={title}>
                <span className="material-symbols-outlined">{icon}</span>
                <div><h3>{title}</h3><p>{text}</p></div>
              </article>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="client-section client-steps-section">
          <h2>How booking <em>works</em></h2>
          <p>Three simple steps to connect with the right company.</p>
          <div className="client-steps-grid">
            {steps.map(([num, title, text, icon]) => (
              <article key={title} className="client-step-card">
                <span className="client-step-num">{num}</span>
                <div><h3>{title}</h3><p>{text}</p></div>
                <span className="material-symbols-outlined">{icon}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="client-section client-reviews-section">
          <div className="client-section-head">
            <h2>Loved by clients across Pakistan</h2>
            <button onClick={() => navigate(ROUTES.reviews)}>View all reviews <span>→</span></button>
          </div>
          <div className="client-review-grid">
            {reviews.map(([name, city, quote]) => (
              <article key={name} className="client-review-card">
                <div className="client-stars">★★★★★ <span>4.9</span></div>
                <p>{quote}</p>
                <div><span className="client-avatar-dot">{name.split(' ').map((n) => n[0]).join('')}</span><b>{name}</b><small>{city}</small></div>
              </article>
            ))}
          </div>
        </section>

        <section className="client-section client-faq-section">
          <div className="client-section-head">
            <h2>Frequently asked <em>questions</em></h2>
            <button onClick={() => navigate(ROUTES.contact)}>View all <span>→</span></button>
          </div>
          <div className="client-faq-grid">
            {faqs.map((faq) => <button key={faq}>{faq}<span>＋</span></button>)}
          </div>
        </section>
      </main>

      <footer className="client-footer">
        <div>
          <button onClick={() => navigate(ROUTES.home)} className="client-brand"><BrandMark /><span>FleetOS</span></button>
          <p>Pakistan’s trusted SaaS platform for company discovery, service requests, products, payments, and reviews.</p>
        </div>
        <div>
          <h4>Company</h4>
          <button onClick={() => navigate(ROUTES.about)}>About us</button>
          <button onClick={() => navigate('/company/register')}>For Companies</button>
          <button onClick={() => navigate(ROUTES.contact)}>Contact us</button>
        </div>
        <div>
          <h4>Support</h4>
          <button onClick={() => navigate(ROUTES.contact)}>Help center</button>
          <button onClick={() => navigate(ROUTES.bookings)}>My bookings</button>
          <button onClick={() => navigate(ROUTES.companies)}>Find companies</button>
        </div>
        <div className="client-footer-app">
          <h4>Get the FleetOS app</h4>
          <p>Discover, request, chat, pay, and review on the go.</p>
          <button onClick={() => navigate(ROUTES.companies)} className="client-dark-btn">Start booking</button>
        </div>
      </footer>
    </div>
  );
}

export default Home;


