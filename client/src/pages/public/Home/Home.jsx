import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../constants';

function Home() {
  const navigate = useNavigate();

  const categories = [
    { icon: 'plumbing', label: 'Plumbing' },
    { icon: 'electrical_services', label: 'Electrical' },
    { icon: 'cleaning_services', label: 'Cleaning' },
    { icon: 'hvac', label: 'HVAC' },
    { icon: 'pest_control', label: 'Pests' },
  ];

  const features = [
    { icon: 'bolt', title: 'Fast Booking', desc: 'Book trusted technicians in under a minute.' },
    { icon: 'radar', title: 'Live Tracking', desc: 'Follow your service vehicle in real time.' },
    { icon: 'verified_user', title: 'Certified Experts', desc: 'Vetted, background-checked professionals.' },
  ];

  return (
    <div className="bg-background text-on-surface min-h-screen pb-16">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-lg h-16 bg-surface shadow-sm transition-colors duration-200 ease-in-out">
        <div className="flex items-center gap-md">
          <span className="material-symbols-outlined text-primary text-[32px]">local_shipping</span>
          <h1 className="font-headline-md text-headline-md font-bold text-primary">FleetOS</h1>
        </div>
        <div className="flex items-center gap-sm">
          <button onClick={() => navigate(ROUTES.login)} className="px-lg py-sm font-nav-item text-nav-item text-on-surface hover:bg-surface-container-low rounded-lg transition-colors">
            Log In
          </button>
          <button onClick={() => navigate(ROUTES.register)} className="px-lg py-sm bg-primary text-on-primary font-nav-item text-nav-item font-bold rounded-lg shadow-md hover:bg-primary-container transition-colors">
            Sign Up
          </button>
        </div>
      </header>

      <main className="pt-24 px-container-margin max-w-7xl mx-auto space-y-xl">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-xl bg-primary-container text-on-primary-container">
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-lg p-xl">
            <div className="max-w-lg">
              <span className="font-label-sm uppercase tracking-wider mb-sm block">Welcome to FleetOS</span>
              <h2 className="font-headline-lg text-headline-lg font-bold mb-md">Fleet services, streamlined.</h2>
              <p className="font-body-lg text-body-lg mb-lg">Book maintenance, track technicians live, and manage your fleet from one dashboard.</p>
              <div className="flex gap-md">
                <button onClick={() => navigate(ROUTES.dashboard)} className="px-xl py-md bg-surface-container-lowest text-primary font-bold rounded-lg shadow-md hover:scale-105 transition-transform active:scale-95">
                  Get Started
                </button>
<button onClick={() => navigate(ROUTES.companies)} className="px-xl py-md border border-on-primary-container/30 rounded-lg font-bold hover:bg-on-primary-container/10 transition-colors">
                  Browse Companies
                </button>
              </div>
            </div>
            <div className="hidden md:block w-64 h-64 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-[96px]">local_shipping</span>
            </div>
          </div>
        </section>

        {/* Categories */}
        <section className="space-y-md">
          <div className="flex justify-between items-center">
            <h3 className="font-headline-md text-headline-md text-on-surface">Browse by Category</h3>
            <button onClick={() => navigate(ROUTES.dashboard)} className="text-primary font-nav-item hover:underline">View all</button>
          </div>
          <div className="flex gap-md overflow-x-auto hide-scrollbar -mx-container-margin px-container-margin pb-2">
            {categories.map((item) => (
<button key={item.label} onClick={() => navigate(ROUTES.companies)} className="flex flex-col items-center gap-sm shrink-0 group">
                <div className="w-16 h-16 rounded-2xl bg-secondary-container flex items-center justify-center group-hover:bg-primary-container transition-colors duration-200">
                  <span className="material-symbols-outlined text-on-secondary-fixed-variant group-hover:text-on-primary-container">{item.icon}</span>
                </div>
                <span className="font-body-md text-body-md text-on-surface-variant group-hover:text-primary group-hover:font-bold">{item.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-md">
          {features.map((f) => (
            <div key={f.title} className="bg-surface-container-lowest p-lg rounded-xl shadow-elevation-1 border border-surface-container-low">
              <div className="w-12 h-12 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center mb-md">
                <span className="material-symbols-outlined">{f.icon}</span>
              </div>
              <h4 className="font-headline-md text-headline-md text-on-surface mb-xs">{f.title}</h4>
              <p className="font-body-md text-body-md text-on-surface-variant">{f.desc}</p>
            </div>
          ))}
        </section>

        {/* CTA */}
        <section className="bg-primary text-on-primary p-xl rounded-xl shadow-lg flex flex-col md:flex-row items-center justify-between gap-lg">
          <div>
            <h3 className="font-headline-lg-mobile text-headline-lg-mobile font-bold mb-xs">Ready to get started?</h3>
            <p className="font-body-lg text-body-lg opacity-80">Create your free account and book your first service today.</p>
          </div>
          <button onClick={() => navigate(ROUTES.register)} className="px-xl py-md bg-surface-container-lowest text-primary font-bold rounded-lg shadow-md hover:scale-105 transition-transform active:scale-95 shrink-0">
            Create Account
          </button>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-xl border-t border-surface-container px-container-margin py-lg flex flex-col md:flex-row justify-between items-center gap-md text-center">
        <span className="font-label-sm text-label-sm text-on-surface-variant">© 2023 FleetOS. All rights reserved.</span>
        <div className="flex gap-lg">
          <button onClick={() => navigate(ROUTES.about)} className="font-label-sm text-label-sm text-outline hover:text-on-surface transition-colors">About</button>
          <button onClick={() => navigate(ROUTES.contact)} className="font-label-sm text-label-sm text-outline hover:text-on-surface transition-colors">Contact</button>
          <button onClick={() => navigate(ROUTES.login)} className="font-label-sm text-label-sm text-outline hover:text-on-surface transition-colors">Login</button>
        </div>
      </footer>
    </div>
  );
}

export default Home;

