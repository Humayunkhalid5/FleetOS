import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ROUTES } from '../../../constants';
import api from '../../../services/api';

function CompanyDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const response = await api.get(`/companies/${id}`);
        setCompany(response.company);
      } catch (err) {
        setError(err.message || 'Company not found');
      } finally {
        setLoading(false);
      }
    };
    fetchCompany();
  }, [id]);

  const addToPlan = (service, price) => {
    navigate(ROUTES.customizeBooking, { state: { companyId: id, companyName: displayName, service, price } });
  };

  if (loading) {
    return <div className="p-xl text-center text-on-surface-variant font-body-md min-h-screen bg-background">Loading company details...</div>;
  }

  if (error || !company) {
    return (
      <div className="p-xl text-center text-error font-body-md min-h-screen bg-background">
        {error || 'Company not found'}
        <div className="mt-md">
          <button onClick={() => navigate(-1)} className="px-lg py-sm bg-primary text-on-primary rounded-lg font-nav-item">Go Back</button>
        </div>
      </div>
    );
  }

  const displayName = company.name || 'SwiftFleet Solutions';
  const rating = company.rating || 4.8;
  const reviewCount = company.reviewCount || 0;
  const heroImage = company.heroImage || 'https://lh3.googleusercontent.com/aida-public/AB6AXuBJeE45UL8UKuT4uGWd_lq3pK7QrZpG2J0KfyRilPUzEtjE0ywgMikI3S-pfNgsj7iuyifnGWB96e_KmWs_31IWMLC5eS2Ek3CoWOlYkA9UjXVd-A3NEQJb6kVP6DPnzS467WC65sWffsTkbka4VQeH0GCArJKfDNTug_ExYgKbmWdasqD1LJ3cbGnkJDATYMYGCB4FR-F8eLBmWG4gfjNzc7jZobG_NVPHlY0rPSbMQ0XVGzYW87Xwpw';
  const logo = company.logo || 'https://lh3.googleusercontent.com/aida-public/AB6AXuAjMDOQd3UrvrebrUcxX624kDq0FEAmqmVNdcG58u-9v18fx30yrnUAG8G4Ov5a7aitulaNFUI8OpyyA7dbK0LpatGOA9H1iDNhj154uoZ0ZRQ98hatThYWFI1V61HpwQrivZRYx3UUK2rXbDnWxgYmvcG82itzN6G3SaXdfnGqNHcAgZ__eJ-kYo7O9nabbf6BZODCYe6pnAKz1PNSBu_39u3u10eAP7e184NtsWVttuZU3DxVFpebjA';
  const services = company.services || [];
  const technicians = company.technicians || [];
  const contactNumber = company.phone || '+92 300 0000000';
  const contactHref = `tel:${contactNumber.replace(/\s+/g, '')}`;

  return (
    <div className="text-on-surface">
      {/* Top Navigation Bar */}
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-lg h-16 bg-surface shadow-sm transition-colors duration-200 ease-in-out">
        <div className="flex items-center gap-md">
          <button onClick={() => navigate(-1)} className="material-symbols-outlined text-primary hover:bg-surface-container-low p-2 rounded-full transition-colors">arrow_back</button>
          <span className="font-headline-md text-headline-md font-bold text-primary">FleetOS</span>
        </div>
        <div className="flex items-center gap-md">
          <button
            onClick={() => {
              const shareData = { title: `${displayName} | FleetOS`, url: window.location.href };
              if (navigator.share) navigator.share(shareData).catch(() => {});
              else navigator.clipboard?.writeText(window.location.href);
            }}
            className="material-symbols-outlined text-on-surface-variant hover:bg-surface-container-low p-2 rounded-full transition-colors"
          >share</button>
          <button
            onClick={() => {
              const favBtn = document.getElementById('company-favorite');
              if (!favBtn) return;
              const isFav = favBtn.dataset.fav === 'true';
              favBtn.dataset.fav = String(!isFav);
              favBtn.classList.toggle('text-error', !isFav);
              favBtn.classList.toggle('fill-icon', !isFav);
              favBtn.style.fontVariationSettings = !isFav ? "'FILL' 1" : "'FILL' 0";
            }}
            id="company-favorite"
            className="material-symbols-outlined text-on-surface-variant hover:bg-surface-container-low p-2 rounded-full transition-colors"
          >favorite</button>
        </div>
      </header>

      <main className="pt-16 pb-32 max-w-7xl mx-auto">
        {/* Hero Section */}
        <section className="relative w-full h-[400px] md:h-[500px] overflow-hidden">
          <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url('${heroImage}')` }}>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>

          <div className="absolute bottom-lg left-container-margin right-container-margin text-white">
            <div className="flex items-end gap-md">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-xl bg-white p-sm shadow-lg overflow-hidden flex-shrink-0 border-4 border-white/20">
                <img className="w-full h-full object-contain" alt="Company Logo" src={logo} />
              </div>
              <div className="mb-sm">
                <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg leading-tight">{displayName}</h1>
                <div className="flex items-center gap-sm mt-xs">
                  <div className="flex text-yellow-400">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span key={star} className="material-symbols-outlined" style={{ fontVariationSettings: star <= Math.round(rating) ? "'FILL' 1" : "'FILL' 0.5" }}>
                        {star <= Math.round(rating) ? 'star' : 'star_half'}
                      </span>
                    ))}
                  </div>
                  <span className="font-body-md text-body-md font-semibold">{rating.toFixed(1)}</span>
                  <span className="font-body-md text-body-md opacity-80">({reviewCount.toLocaleString()} Reviews)</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="px-container-margin py-xl grid grid-cols-1 lg:grid-cols-12 gap-xl">
          {/* Left Column: Details & Services */}
          <div className="lg:col-span-8 space-y-xl">
            {/* Description */}
            <article className="bg-white p-lg rounded-xl shadow-[0_4px_16px_0_rgba(11,29,45,0.12)]">
              <h2 className="font-headline-md text-headline-md text-primary mb-md">About the Company</h2>
              <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed">{company.description}</p>
              <div className="mt-md flex flex-wrap gap-sm">
                <span className="inline-flex items-center gap-xs rounded-full bg-primary-container px-sm py-xs text-sm text-on-primary-container">✓ Verified company</span>
                <span className="inline-flex items-center gap-xs rounded-full bg-surface-container px-sm py-xs text-sm text-on-surface-variant">📍 {company.location || 'Location available on request'}</span>
              </div>
            </article>

            {/* Services List */}
            <section className="bg-white p-lg rounded-xl shadow-[0_4px_16px_0_rgba(11,29,45,0.12)]">
              <div className="flex justify-between items-center mb-md">
                <h2 className="font-headline-md text-headline-md text-primary">Available Services</h2>
                <span className="material-symbols-outlined text-outline">tune</span>
              </div>
              <div className="divide-y divide-surface-container">
                {services.map((service) => (
                  <div key={service._id || service.name} className="py-md flex justify-between items-center hover:bg-surface-container-low transition-colors px-xs rounded-lg group">
                    <div className="flex items-start gap-md">
                      <div className="p-sm bg-secondary-container text-on-secondary-container rounded-lg">
                        <span className="material-symbols-outlined">{service.icon || 'build'}</span>
                      </div>
                      <div>
                        <p className="font-body-lg text-body-lg font-bold">{service.name}</p>
                        <p className="font-body-md text-body-md text-on-surface-variant">{service.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-body-lg text-body-lg font-bold text-primary">${service.price.toFixed(2)}</p>
                      <button onClick={() => addToPlan(service.name, service.price)} className="text-primary font-nav-item text-nav-item flex items-center gap-xs opacity-0 group-hover:opacity-100 transition-opacity">Add <span className="material-symbols-outlined text-sm">add_circle</span></button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Technicians Section */}
            <section>
              <h2 className="font-headline-md text-headline-md text-primary mb-md">Company-managed technicians</h2>
              <div className="flex overflow-x-auto hide-scrollbar gap-md pb-md">
                {technicians.map((tech) => (
                  <div key={tech._id || tech.name} className="flex-shrink-0 w-64 bg-white rounded-xl shadow-sm border border-surface-container overflow-hidden p-md text-center">
                    <div className="w-20 h-20 mx-auto rounded-full overflow-hidden mb-sm border-2 border-primary-fixed">
                      <img className="w-full h-full object-cover" alt="Technician" src={tech.avatar} />
                    </div>
                    <h3 className="font-body-lg text-body-lg font-bold">{tech.name}</h3>
                    <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-sm">{tech.role}</p>
                    <div className="flex items-center justify-center gap-xs text-primary mb-sm">
                      <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      <span className="font-body-md text-body-md font-bold">{tech.rating}</span>
                    </div>
                    <button onClick={() => navigate(ROUTES.customizeBooking, { state: { companyId: id, companyName: displayName, service: services[0]?.name || 'Service Request', price: services[0]?.price || 120 } })} className="w-full py-2 bg-surface-container-low text-primary font-nav-item text-nav-item rounded-lg hover:bg-primary-container hover:text-white transition-colors">Request Through Company</button>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right Column: Gallery & Quick Stats */}
          <aside className="lg:col-span-4 space-y-xl">
            {/* Project Gallery */}
            <section className="bg-white p-lg rounded-xl shadow-[0_4px_16px_0_rgba(11,29,45,0.12)]">
              <h2 className="font-headline-md text-headline-md text-primary mb-md">Past Projects</h2>
              <div className="grid grid-cols-2 gap-sm">
                {company.gallery && company.gallery.length > 0 ? company.gallery.map((img, i) => (
                  <div key={i} className={`${i === 0 || i === 3 ? 'col-span-2' : ''} ${i === 0 ? 'h-40' : i === 3 ? 'h-32' : 'h-28'} rounded-lg overflow-hidden bg-surface-container relative group`}>
                    <img className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt={`Project ${i + 1}`} src={img} />
                  </div>
                )) : (
                  <div className="col-span-2 h-40 rounded-lg overflow-hidden bg-surface-container relative group">
                    <div className="w-full h-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant">
                      No project photos yet
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Contact Card */}
            <section className="bg-primary-container text-on-primary-container p-lg rounded-xl shadow-lg space-y-md">
              <h3 className="font-headline-md text-headline-md">Contact the company</h3>
              <div className="flex gap-sm">
                <button onClick={() => navigate(`${ROUTES.chat}/${id}`)} className="flex-1 rounded-lg bg-surface-container-lowest px-md py-sm font-nav-item text-nav-item text-primary">💬 Chat</button>
                <a href={contactHref} className="flex-1 rounded-lg bg-surface-container-lowest px-md py-sm font-nav-item text-nav-item text-primary text-center">📞 Call</a>
              </div>
              <p className="font-body-md text-body-md">Phone: {contactNumber}</p>
            </section>

            {/* Information Card */}
            <section className="bg-primary-container text-on-primary-container p-lg rounded-xl shadow-lg space-y-md">
              <h3 className="font-headline-md text-headline-md">Service Promise</h3>
              <ul className="space-y-sm">
                <li className="flex items-center gap-sm font-body-md text-body-md">
                  <span className="material-symbols-outlined">verified</span>
                  <span>Certified Master Technicians</span>
                </li>
                <li className="flex items-center gap-sm font-body-md text-body-md">
                  <span className="material-symbols-outlined">schedule</span>
                  <span>Same-day turnaround for inspections</span>
                </li>
                <li className="flex items-center gap-sm font-body-md text-body-md">
                  <span className="material-symbols-outlined">location_on</span>
                  <span>Mobile service available (20 mile radius)</span>
                </li>
                <li className="flex items-center gap-sm font-body-md text-body-md">
                  <span className="material-symbols-outlined">history</span>
                  <span>Digital service history provided</span>
                </li>
              </ul>
            </section>
          </aside>
        </div>
      </main>

      {/* Sticky Footer Booking */}
      <footer className="fixed bottom-0 w-full z-50 bg-white/70 backdrop-blur-md px-container-margin py-md shadow-[0_-4px_16px_0_rgba(11,29,45,0.08)] flex justify-between items-center max-w-none">
        <div className="hidden md:block">
          <p className="font-label-sm text-label-sm text-on-surface-variant uppercase">Estimated Total</p>
          <p className="font-headline-md text-headline-md text-primary font-bold">$0.00</p>
        </div>
        <div className="flex gap-md w-full md:w-auto">
          <button onClick={() => services[0] && addToPlan(services[0].name, services[0].price)} className="flex-1 md:flex-none px-xl py-3 border border-outline rounded-xl font-nav-item text-nav-item text-on-surface hover:bg-surface-container-low transition-all">
            Add To Plan
          </button>
          <button
            onClick={() => navigate(ROUTES.customizeBooking, { state: { companyId: id, companyName: displayName } })}
            className="flex-[2] md:flex-none px-xl py-3 bg-primary text-white rounded-xl font-nav-item text-nav-item font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all"
          >
            Submit Service Request
          </button>
        </div>
      </footer>
    </div>
  );
}

export default CompanyDetails;

