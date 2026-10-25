import { Suspense, lazy, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../../constants';
import LiveJobCard from '../../../components/public/LiveJobCard';
import Reveal from '../../../components/ui/Reveal';

// The 3D city is decoration: if its chunk fails to load, the page still renders.
const HeroScene = lazy(() => import('../../../components/public/HeroScene').catch(() => ({ default: () => null })));

// The 3D city is decoration and its chunk pulls in Three.js, so it is fetched
// only after the hero text has painted. The first screen arrives faster on a
// phone; the scene then fades in on its own.
function DeferredScene({ shift }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(() => setReady(true), { timeout: 1200 });
      return () => window.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(() => setReady(true), 200);
    return () => window.clearTimeout(id);
  }, []);
  if (!ready) return null;
  return <Suspense fallback={null}><HeroScene shift={shift} /></Suspense>;
}

const industries = [
  ['home_repair_service', 'Home services & repair', 'Plumbing · Electrical · AC · Cleaning', 'field-services'],
  ['sports_esports', 'Gaming & electronics', 'Consoles · Games · Phones · Repairs', 'electronics-gaming'],
  ['storefront', 'Local shops & retail', 'Groceries · General store · Home goods', 'retail-products'],
  ['restaurant', 'Restaurants & food', 'Delivery · Pickup · Table reservations', 'food-hospitality'],
  ['spa', 'Salons, spas & wellness', 'Haircut · Facial · Bridal makeup', 'health-beauty'],
  ['local_pharmacy', 'Clinics & pharmacies', 'Doctor visits · Lab tests · Medicines', 'healthcare'],
  ['car_repair', 'Auto repair & car care', 'Car service · Car wash · Roadside help', 'auto-services'],
  ['school', 'Tutoring & training', 'Home tuition · Online classes · Test prep', 'education'],
  ['local_shipping', 'Courier & moving', 'Parcels · House shifting · Freight', 'logistics'],
  ['celebration', 'Events & photography', 'Weddings · Decor · Sound & lights', 'events'],
  ['local_gas_station', 'Fuel & energy', 'LPG refills · Solar · Generators', 'oil-energy'],
  ['devices', 'Digital & IT services', 'Websites · IT support · CCTV', 'digital-technology'],
];

const customerSide = [
  ['travel_explore', 'Find approved companies', 'Search providers by city, area and service.'],
  ['tune', 'Book with a clear price', 'Pick a service, add materials and see the estimate before confirming.'],
  ['my_location', 'Follow the job live', 'Assigned staff, ETA and status on a map.'],
  ['reviews', 'Pay and review', 'Receipts, invoices and ratings linked to every booking.'],
];

const companySide = [
  ['inbox', 'One request inbox', 'Every new booking lands in one list, ready to assign.'],
  ['psychology', 'Smart Dispatch', 'Staff suggestions ranked by distance, workload and rating.'],
  ['inventory_2', 'Staff, stock and services', 'Manage your people, parts and price list in one place.'],
  ['monitoring', 'Revenue and analytics', 'Recorded payments, monthly trends and an assistant for daily questions.'],
];

const lifecycle = [
  ['schedule', 'Pending', 'The customer confirms a booking with a priced service.'],
  ['assignment_ind', 'Assigned', 'The company picks an available staff member.'],
  ['local_shipping', 'En Route', 'Staff head out and the customer sees the ETA.'],
  ['where_to_vote', 'Arrived', 'Arrival is added to the job timeline.'],
  ['construction', 'In Progress', 'Work starts; chat stays open on both sides.'],
  ['task_alt', 'Completed', 'The company closes the work order.'],
  ['payments', 'Paid', 'Payment is recorded and an invoice is issued.'],
  ['star', 'Reviewed', 'The customer rates the job on the company profile.'],
];

const faqs = [
  ['How does a customer send a request?', 'Choose an approved company, select its service or product, add requirements and confirm. The booking reaches the company workspace straight away.'],
  ['Are companies checked?', 'Companies are listed only after an admin reviews their documents and approves them. Access can be suspended at any time.'],
  ['Which payment methods are supported?', 'Companies record cash and invoice payments after the work is complete; card checkout can be enabled once a payment provider is configured.'],
  ['Can each company use its own terminology?', 'Yes. The business category chosen at registration sets the workspace modules and labels — a retailer sees Orders and Store staff, a field-service company sees Requests and Technicians.'],
  ['Can a booking be cancelled?', 'Customers can cancel Pending or Assigned jobs. Companies can cancel with a recorded reason, which both sides can see.'],
];

function Home() {
  const [openFaq, setOpenFaq] = useState(0);

  return (
    <div className="relative">
      {/* Hero */}
      <section className="relative isolate">
        <div className="hero-aurora" aria-hidden="true" />
        <div className="mx-auto grid max-w-[1200px] items-center gap-10 px-4 pb-16 pt-10 sm:px-6 md:pt-16 lg:grid-cols-[1fr_1.05fr] lg:gap-6 lg:pb-24">
          {/* min-w-0: the industry rail below is nowrap on phones, and without
              this the grid column would grow to the rail's full width and clip
              the hero instead of letting the rail scroll. */}
          <div className="animate-rise-in min-w-0">
            <h1 className="max-w-[15ch] text-[42px] font-extrabold leading-[1.03] tracking-[-0.045em] text-ink sm:text-[56px] lg:text-[62px]">
              Every service job, <span className="text-gradient">from request to receipt.</span>
            </h1>
            <p className="mt-6 max-w-[50ch] text-[17px] leading-7 text-muted">
              Find a trusted company near you, book what you need and follow the job until it is done. Companies get one workspace for requests, staff, stock and payments.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 max-sm:flex-col">
              <Link to={ROUTES.companies} className="btn btn-primary btn-lg">
                <span className="material-symbols-outlined">search</span>
                Find a company
              </Link>
              <Link to="/company/register" className="btn btn-secondary btn-lg">Register your company</Link>
            </div>
            <div className="mt-10">
              <p className="text-[12.5px] font-semibold text-subtle">Popular on FleetOS</p>
              <div className="rail-scroll hide-scrollbar mt-3 flex flex-wrap gap-2 max-sm:-mx-4 max-sm:flex-nowrap max-sm:overflow-x-auto max-sm:px-4 max-sm:pb-1">
                {industries.slice(0, 6).map(([icon, name, , value]) => (
                  <Link key={value} to={`${ROUTES.companies}?industry=${value}`} className="chip chip-lift">
                    <span className="material-symbols-outlined">{icon}</span>{name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
          <div className="hero-visual min-w-0">
            <div className="hero-visual__scene">
              <DeferredScene shift={0.13} />
              <span className="scene-hint"><span className="material-symbols-outlined">swipe</span>Drag to turn the city</span>
            </div>
            <LiveJobCard className="hero-visual__card" />
          </div>
        </div>
      </section>

      {/* Two portals */}
      <section className="band">
        <div className="mx-auto grid max-w-[1200px] gap-6 px-4 py-20 sm:px-6 lg:grid-cols-2">
          {[['For customers', 'Book a trusted company in minutes.', customerSide, ROUTES.register, 'Create a customer account'], ['For companies', 'Run operations without spreadsheets.', companySide, '/company/register', 'Register your company']].map(([kicker, title, items, to, cta], column) => (
            <Reveal key={kicker} delay={column * 120} className="card card-hover p-6 md:p-8">
              <p className="text-[13px] font-semibold text-brand-fg">{kicker}</p>
              <h2 className="mt-2 text-[26px] font-bold leading-tight tracking-tight">{title}</h2>
              <ul className="mt-8 grid gap-6">
                {items.map(([icon, heading, text]) => (
                  <li key={heading} className="flex gap-4">
                    <span className="icon-tile"><span className="material-symbols-outlined">{icon}</span></span>
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">{heading}</p>
                      <p className="mt-0.5 text-[14px] text-muted">{text}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <Link to={to} className="link mt-8 inline-flex items-center gap-1">{cta}<span className="material-symbols-outlined text-[18px]">arrow_forward</span></Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Lifecycle */}
      <section id="how-it-works" className="mx-auto max-w-[1200px] scroll-mt-20 px-4 py-20 sm:px-6">
        <Reveal className="max-w-2xl">
          <h2 className="text-[32px] font-bold leading-tight tracking-tight">How a job moves through FleetOS</h2>
          <p className="mt-3 text-[16px] text-muted">Eight steps, from the first request to the final review.</p>
        </Reveal>
        <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {lifecycle.map(([icon, status, text], index) => (
            <Reveal as="li" key={status} delay={(index % 4) * 70} className="card card-hover p-5">
              <div className="flex items-center justify-between">
                <span className="icon-tile"><span className="material-symbols-outlined">{icon}</span></span>
                <span className="font-mono text-[12px] text-subtle">{String(index + 1).padStart(2, '0')}</span>
              </div>
              <p className="mt-4 text-[15px] font-semibold text-ink">{status}</p>
              <p className="mt-1 text-[13.5px] text-muted">{text}</p>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* Industries */}
      <section className="mx-auto max-w-[1200px] px-4 pb-20 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
          <Reveal className="lg:sticky lg:top-24">
            <h2 className="text-[32px] font-bold leading-tight tracking-tight">One platform for every kind of business</h2>
            <p className="mt-3 text-[16px] text-muted">Shops, service providers, restaurants, clinics and more. Each business picks its type and gets the right workspace: products or services, delivery, pickup, home visits, appointments or online work.</p>
          </Reveal>
          <ul className="grid gap-3 sm:grid-cols-2">
            {industries.map(([icon, name, labels, value], index) => (
              <Reveal as="li" key={name} delay={(index % 2) * 80} className="card card-hover">
                <Link to={`${ROUTES.companies}?industry=${value}`} className="flex items-start gap-4 p-5">
                  <span className="icon-tile"><span className="material-symbols-outlined">{icon}</span></span>
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{name}</p>
                    <p className="mt-1 text-[13px] text-muted">{labels}</p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA band */}
      <section className="px-4 sm:px-6">
        <Reveal className="cta-band relative mx-auto max-w-[1152px] overflow-hidden rounded-[28px] px-6 py-14 text-white sm:px-12 md:py-16">
          <div className="relative grid gap-8 md:grid-cols-[1.4fr_1fr] md:items-center">
            <div>
              <h2 className="text-[30px] font-bold leading-tight tracking-tight text-white md:text-[36px]">Bring your company onto FleetOS</h2>
              <p className="mt-3 max-w-[48ch] text-[16px] text-white/75">Register, upload your business documents and start taking bookings once you are approved.</p>
            </div>
            <div className="flex flex-wrap gap-3 md:justify-end">
              <Link to="/company/register" className="btn btn-lg bg-white text-[#0D1B2A] hover:bg-white/90">Register your company</Link>
              <Link to={ROUTES.contact} className="btn btn-lg border border-white/25 text-white hover:bg-white/10">Talk to sales</Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* FAQ */}
      <section className="mx-auto grid max-w-[1200px] gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[.8fr_1.2fr]">
        <Reveal>
          <h2 className="text-[32px] font-bold leading-tight tracking-tight">Questions, answered</h2>
          <p className="mt-3 text-[16px] text-muted">Something else? <Link to={ROUTES.contact} className="link">Contact the FleetOS team</Link>.</p>
        </Reveal>
        <div className="card divide-y divide-line overflow-hidden">
          {faqs.map(([question, answer], index) => (
            <div key={question}>
              <button type="button" onClick={() => setOpenFaq(openFaq === index ? -1 : index)} aria-expanded={openFaq === index} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-[15px] font-semibold text-ink transition-colors hover:bg-sunken/50">
                {question}
                <span className={`material-symbols-outlined shrink-0 text-subtle transition-transform duration-200 ${openFaq === index ? 'rotate-45' : ''}`}>add</span>
              </button>
              <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${openFaq === index ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                <p className="overflow-hidden px-5 text-[14px] leading-6 text-muted"><span className="block pb-5">{answer}</span></p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default Home;
