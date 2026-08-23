import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../constants';

const BrandMark = () => (
  <span className="client-logo-mark" aria-hidden="true">
    <span className="material-symbols-outlined">local_shipping</span>
  </span>
);

function Home() {
  const navigate = useNavigate();

  const serviceCards = [
    ['directions_car', 'Car Service', 'General service & maintenance'],
    ['oil_barrel', 'Oil Change', 'Oil & filter replacement'],
    ['radio_button_checked', 'Brake Service', 'Brake check & replacement'],
    ['ac_unit', 'AC Service', 'Cooling & AC maintenance'],
    ['battery_charging_full', 'Battery Service', 'Battery check & replacement'],
    ['settings', 'Tyre Service', 'Tyre check, rotation & alignment'],
  ];

  const features = [
    ['verified', 'Verified Companies', 'Only trusted and approved workshops'],
    ['location_city', 'All Major Cities', 'Service available in 50+ cities across Pakistan'],
    ['edit_calendar', 'Easy Service Request', 'Choose service, date and time that suits you'],
    ['engineering', 'Technician ETA', 'Live tracking and estimated arrival time'],
    ['chat_bubble', 'In-app Chat', 'Chat with workshop or support'],
    ['payments', 'Secure Payments', 'Pay with cash or card, your choice'],
    ['map', 'Live Tracking', 'Track technician in real time'],
    ['history', 'Booking History', 'View all your past bookings'],
  ];

  const steps = [
    ['1', 'Choose & Book', 'Select your service, pick a verified company, and choose date & time.', 'fact_check'],
    ['2', 'We Come to You', 'Technician confirms and arrives at your location on time.', 'mobile_friendly'],
    ['3', 'Service & Pay', 'Service completed, pay securely, and rate your experience.', 'credit_card'],
  ];

  const reviews = [
    ['Muhammad Usman', 'Lahore', 'Super easy to book and the technician arrived on time. Very professional service!'],
    ['Sana Ahmed', 'Karachi', 'Finally a reliable service app in Pakistan. Transparent pricing and great support.'],
    ['Hassan Ali', 'Islamabad', 'Excellent experience from booking to service. Highly recommended!'],
  ];

  const faqs = [
    'How do I book a service?',
    'Are the companies verified?',
    'What payment methods do you accept?',
    'Do you offer doorstep service?',
    'Can I reschedule or cancel my booking?',
    'How can I contact support?',
  ];

  return (
    <div className="client-landing min-h-screen text-[#171511]">
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
            <div className="client-pill"><span className="material-symbols-outlined">stars</span> Pakistan’s trusted vehicle service platform</div>
            <h1>Professional vehicle service, <br />booked <em>without the hassle</em></h1>
            <p>Find approved service companies across Pakistan, compare options by city, book the right service, and track every step from request to technician arrival.</p>
            <div className="client-cta-row">
              <button onClick={() => navigate(ROUTES.companies)} className="client-dark-btn client-large-btn">Find companies</button>
              <button onClick={() => navigate(ROUTES.companies)} className="client-outline-btn client-large-btn">Book service</button>
            </div>
            <div className="client-stats-row" aria-label="FleetOS stats">
              <span><b>1M+</b> Happy customers</span>
              <span><b>1,500+</b> Verified workshops</span>
              <span><b>50+</b> Cities in Pakistan</span>
              <span><b>4.8★</b> Average rating</span>
            </div>
          </div>

          <div className="client-hero-visual" aria-label="FleetOS booking preview">
            <div className="client-float-card card-coral"><span className="material-symbols-outlined">verified_user</span><b>Verified</b><small>Trusted Workshops</small></div>
            <div className="client-float-card card-lilac"><span className="client-avatar-dot">MR</span><b>Technician ETA</b><small>18 min away</small></div>
            <div className="client-float-card card-yellow"><span className="material-symbols-outlined">payments</span><b>Secure Payments</b><small>Cash or Card</small></div>
            <div className="client-float-card card-cream"><span className="material-symbols-outlined">location_on</span><b>Live Tracking</b><small>On the way</small></div>
            <div className="client-phone-mock">
              <div className="client-phone-top"><span>9:41</span><span>● ● ●</span></div>
              <p className="client-phone-muted">Good morning,</p>
              <h3>Ali Raza 👋</h3>
              <div className="client-location-chip"><span className="material-symbols-outlined">location_on</span>Lahore, Punjab</div>
              <div className="client-phone-search">What service do you need?</div>
              <div className="client-phone-grid">
                <span>Book a service</span><span>Track vehicle</span><span>Chat company</span>
              </div>
              <div className="client-booking-card">
                <div>
                  <b>Oil Change</b>
                  <small>Toyota Corolla • LHR 1234</small>
                </div>
                <em>In progress</em>
              </div>
            </div>
          </div>
        </section>

        <section className="client-section client-service-strip">
          <div className="client-section-head compact">
            <h2>Popular services</h2>
            <button onClick={() => navigate(ROUTES.companies)}>View all services <span>→</span></button>
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
          <p>Trusted by thousands across Pakistan</p>
          <div>
            {['SUZUKI', 'TOYOTA', 'HONDA', 'KIA', 'HYUNDAI', 'MG', 'NISSAN', 'DAIHATSU'].map((brand) => <span key={brand}>{brand}</span>)}
          </div>
        </section>

        <section className="client-section client-app-section">
          <div>
            <h2>Everything clients need <br />for <em>vehicle service</em></h2>
            <p>From booking to payments, track everything in one real-time flow. Transparent, simple, and reliable.</p>
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
          <h2>Why clients choose FleetOS <br /><em>for reliable service</em></h2>
          <div className="client-dark-features">
            {[
              ['workspace_premium', 'Verified & Rated', 'We onboard only verified workshops with real customer reviews.'],
              ['receipt_long', 'Transparent Pricing', 'See prices before you book. No hidden charges, no surprises.'],
              ['health_and_safety', 'Quality You Can Trust', 'Genuine parts, professional technicians, and service you can rely on.'],
              ['support_agent', 'Support That Cares', 'Our support team is always here before, during, and after your service.'],
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
          <p>Three simple steps to get your vehicle serviced.</p>
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
            <h2>Loved by drivers across Pakistan</h2>
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
          <p>Pakistan’s most trusted platform for vehicle service booking.</p>
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
          <button onClick={() => navigate(ROUTES.companies)}>Find service</button>
        </div>
        <div className="client-footer-app">
          <h4>Get the FleetOS app</h4>
          <p>Book, track, and manage your service on the go.</p>
          <button onClick={() => navigate(ROUTES.companies)} className="client-dark-btn">Start booking</button>
        </div>
      </footer>
    </div>
  );
}

export default Home;


