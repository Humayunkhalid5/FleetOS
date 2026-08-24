import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../constants';

function About() {
  const navigate = useNavigate();

  const stats = [
    { value: '246', label: 'Pakistan Cities' },
    { value: '120k', label: 'Requests Managed' },
    { value: '4.8★', label: 'Average Rating' },
    { value: '2.4k', label: 'Verified Companies' },
  ];

  const values = [
    { icon: 'verified', title: 'Reliability', desc: 'Admin-approved companies, client reviews, and accountable workflows.' },
    { icon: 'visibility', title: 'Transparency', desc: 'Clear products, services, optional items, prices, and request status.' },
    { icon: 'support_agent', title: 'Support', desc: 'Dedicated platform support for companies and clients.' },
  ];

  return (
    <div className="bg-background text-on-surface min-h-screen pb-16">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-lg h-16 bg-surface shadow-sm transition-colors duration-200 ease-in-out">
        <div className="flex items-center gap-md">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-surface-container-low transition-colors">
            <span className="material-symbols-outlined text-primary">arrow_back</span>
          </button>
          <h1 className="font-headline-md text-headline-md font-bold text-primary">About FleetOS</h1>
        </div>
      </header>

      <main className="pt-24 px-container-margin max-w-4xl mx-auto space-y-lg">
        {/* Intro */}
        <section className="relative overflow-hidden rounded-xl bg-primary-container text-on-primary-container p-xl">
          <h2 className="font-headline-lg text-headline-lg font-bold mb-sm">Empowering companies and clients</h2>
          <p className="font-body-lg text-body-lg max-w-xl">
            FleetOS is a SaaS marketplace where approved companies can pitch products and services while clients discover, request, chat, track, pay, and review — all in one platform.
          </p>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-md">
          {stats.map((s) => (
            <div key={s.label} className="bg-surface-container-lowest p-lg rounded-xl shadow-elevation-1 border border-surface-container-low text-center">
              <p className="font-headline-lg text-headline-lg text-primary font-bold">{s.value}</p>
              <p className="font-label-sm text-label-sm text-on-surface-variant">{s.label}</p>
            </div>
          ))}
        </section>

        {/* Values */}
        <section className="space-y-md">
          <h3 className="font-headline-md text-headline-md text-on-surface">What we stand for</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
            {values.map((v) => (
              <div key={v.title} className="bg-surface-container-lowest p-lg rounded-xl shadow-elevation-1 border border-surface-container-low">
                <div className="w-12 h-12 rounded-xl bg-secondary-container text-on-secondary-container flex items-center justify-center mb-md">
                  <span className="material-symbols-outlined">{v.icon}</span>
                </div>
                <h4 className="font-headline-md text-headline-md text-on-surface mb-xs">{v.title}</h4>
                <p className="font-body-md text-body-md text-on-surface-variant">{v.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="bg-primary text-on-primary p-xl rounded-xl shadow-lg flex flex-col md:flex-row items-center justify-between gap-lg">
          <div>
            <h3 className="font-headline-lg-mobile text-headline-lg-mobile font-bold mb-xs">Want to learn more?</h3>
            <p className="font-body-lg text-body-lg opacity-80">Reach out to our team — we&apos;re happy to help.</p>
          </div>
          <button onClick={() => navigate(ROUTES.contact)} className="px-xl py-md bg-surface-container-lowest text-primary font-bold rounded-lg shadow-md hover:scale-105 transition-transform active:scale-95 shrink-0">
            Contact Us
          </button>
        </section>
      </main>
    </div>
  );
}

export default About;

