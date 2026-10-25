import { Link } from 'react-router-dom';
import { ROUTES } from '../../../constants';

const principles = [
  ['verified', 'Reviewed companies', 'An admin checks each company’s documents before it shows up in search.'],
  ['receipt_long', 'One booking record', 'Customers, companies and admins all see the same booking details.'],
  ['bolt', 'Live updates', 'Status changes, messages and payments show up without reloading the page.'],
  ['tune', 'Fits the business', 'Each workspace uses the modules and names that suit its industry.'],
];

const surfaces = [
  ['Customer portal', 'Discover approved companies, book with clear pricing, follow staff live, pay and review.'],
  ['Company workspace', 'Requests, Smart Dispatch, staff, inventory, services, customers, chat, reviews and analytics.'],
  ['Super Admin console', 'Company verification, platform metrics, jobs, payments, support and audit history.'],
];

function About() {
  return (
    <div>
      <section className="mx-auto max-w-[1200px] px-4 pb-16 pt-16 sm:px-6 md:pt-24">
        <p className="text-[13px] font-semibold text-brand-fg">About FleetOS</p>
        <h1 className="mt-3 max-w-[18ch] text-[40px] font-extrabold leading-[1.05] tracking-[-0.04em] sm:text-[54px]">Run service jobs from booking to payment.</h1>
        <p className="mt-6 max-w-[60ch] text-[17px] leading-7 text-muted">
          FleetOS helps customers book local service companies and helps those companies manage requests, staff, stock and payments in one place.
        </p>
      </section>

      <section className="border-y border-line bg-surface/70">
        <div className="mx-auto grid max-w-[1200px] gap-px bg-line px-0 sm:grid-cols-2 lg:grid-cols-4">
          {principles.map(([icon, title, text]) => (
            <div key={title} className="bg-surface p-8">
              <span className="material-symbols-outlined text-[26px] text-brand-fg">{icon}</span>
              <h2 className="mt-5 text-[17px] font-semibold">{title}</h2>
              <p className="mt-2 text-[14px] leading-6 text-muted">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-[1200px] gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[.9fr_1.1fr]">
        <div>
          <h2 className="text-[30px] font-bold leading-tight tracking-tight">Three portals</h2>
          <p className="mt-3 text-[16px] text-muted">Customers, companies and admins each get their own screens, all working from the same data.</p>
        </div>
        <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
          {surfaces.map(([title, text]) => (
            <li key={title} className="flex gap-5 p-6">
              <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-brand" />
              <div>
                <p className="text-[15px] font-semibold">{title}</p>
                <p className="mt-1 text-[14px] text-muted">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-[1200px] px-4 pb-20 sm:px-6">
        <div className="card flex flex-col items-start justify-between gap-6 p-8 md:flex-row md:items-center">
          <div>
            <h2 className="text-[22px] font-bold">See FleetOS with your own operations</h2>
            <p className="mt-1 text-[14.5px] text-muted">Tell us how your team works today and we'll set up a walkthrough.</p>
          </div>
          <div className="flex gap-2">
            <Link to={ROUTES.contact} className="btn btn-primary">Contact sales</Link>
            <Link to="/company/register" className="btn btn-secondary">Register a company</Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default About;
