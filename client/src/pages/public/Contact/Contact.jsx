import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../constants';

function Contact() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', subject: 'General Inquiry', message: '' });
  const [sent, setSent] = useState(false);

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    setSent(true);
  };

  const infoCards = [
    { icon: 'call', label: 'Phone', value: '+1 (555) 123-4567' },
    { icon: 'mail', label: 'Email', value: 'support@fleetos.com' },
    { icon: 'location_on', label: 'Office', value: '882 Modern Way, Tech Park, San Francisco, CA' },
  ];

  return (
    <div className="bg-background text-on-surface min-h-screen pb-16">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-lg h-16 bg-surface shadow-sm transition-colors duration-200 ease-in-out">
        <div className="flex items-center gap-md">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-surface-container-low transition-colors">
            <span className="material-symbols-outlined text-primary">arrow_back</span>
          </button>
          <h1 className="font-headline-md text-headline-md font-bold text-primary">Contact Us</h1>
        </div>
      </header>

      <main className="pt-24 px-container-margin max-w-4xl mx-auto space-y-lg">
        {/* Info Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-md">
          {infoCards.map((c) => (
            <div key={c.label} className="bg-surface-container-lowest p-lg rounded-xl shadow-elevation-1 border border-surface-container-low">
              <div className="w-12 h-12 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center mb-md">
                <span className="material-symbols-outlined">{c.icon}</span>
              </div>
              <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">{c.label}</p>
              <p className="font-nav-item text-nav-item text-on-surface mt-xs">{c.value}</p>
            </div>
          ))}
        </section>

        {/* Form / Success */}
        <section className="bg-surface-container-lowest p-lg rounded-xl shadow-elevation-1 border border-surface-container-low">
          {sent ? (
            <div className="flex flex-col items-center text-center py-xl">
              <div className="w-20 h-20 rounded-full bg-tertiary-container text-on-tertiary-container flex items-center justify-center mb-md">
                <span className="material-symbols-outlined text-4xl">check_circle</span>
              </div>
              <h3 className="font-headline-lg-mobile text-headline-lg-mobile font-bold text-on-surface mb-xs">Message Sent!</h3>
              <p className="font-body-md text-body-md text-on-surface-variant">Our team will get back to you within 24 hours.</p>
              <button onClick={() => navigate(ROUTES.home)} className="mt-lg px-xl py-md bg-primary text-on-primary font-bold rounded-lg shadow-md hover:bg-primary-container transition-colors">
                Back to Home
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-md">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                <div className="space-y-xs">
                  <label className="font-label-sm text-label-sm text-on-surface-variant" htmlFor="name">Your Name</label>
                  <input id="name" required placeholder="John Doe" value={form.name} onChange={update('name')} className="w-full py-md px-md bg-surface-container-low border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
                </div>
                <div className="space-y-xs">
                  <label className="font-label-sm text-label-sm text-on-surface-variant" htmlFor="email">Email Address</label>
                  <input id="email" required type="email" placeholder="john@company.com" value={form.email} onChange={update('email')} className="w-full py-md px-md bg-surface-container-low border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
                </div>
              </div>

              <div className="space-y-xs">
                <label className="font-label-sm text-label-sm text-on-surface-variant" htmlFor="subject">Subject</label>
                <select id="subject" value={form.subject} onChange={update('subject')} className="w-full py-md px-md bg-surface-container-low border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all">
                  <option>General Inquiry</option>
                  <option>Billing Support</option>
                  <option>Technician Booking</option>
                  <option>Partnership</option>
                </select>
              </div>

              <div className="space-y-xs">
                <label className="font-label-sm text-label-sm text-on-surface-variant" htmlFor="message">Message</label>
                <textarea id="message" required rows="4" placeholder="How can we help?" value={form.message} onChange={update('message')} className="w-full py-md px-md bg-surface-container-low border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none"></textarea>
              </div>

              <button type="submit" className="w-full py-md bg-primary text-on-primary font-headline-md text-headline-md rounded-xl shadow-lg hover:bg-primary-container active:scale-[0.98] transition-all">
                Send Message
              </button>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}

export default Contact;

