import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../../services/api';
import { Alert, Spinner } from '../../../components/ui';

const topics = ['Sales & demo', 'Company onboarding', 'Booking help', 'Billing', 'Partnership', 'General inquiry'];

const channels = [
  ['mail', 'Email', 'support@fleetos.com', 'mailto:support@fleetos.com'],
  ['call', 'Phone', '+92 42 3578 1234', 'tel:+924235781234'],
  ['location_on', 'Office', 'Gulberg III, Lahore, Pakistan', null],
];

function Contact() {
  const [form, setForm] = useState({ name: '', email: '', topic: topics[0], message: '' });
  const [state, setState] = useState({ sending: false, sent: false, error: '' });
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setState({ sending: true, sent: false, error: '' });
    try {
      await api.post('/support', { ...form, subject: `${form.topic} — ${form.name}` });
      setState({ sending: false, sent: true, error: '' });
    } catch (requestError) {
      setState({ sending: false, sent: false, error: requestError.message });
    }
  };

  return (
    <div className="mx-auto grid max-w-[1200px] gap-12 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-[.85fr_1.15fr]">
      <div>
        <h1 className="text-[40px] font-extrabold leading-[1.05] tracking-[-0.04em]">Talk to the FleetOS team</h1>
        <p className="mt-4 max-w-[46ch] text-[16px] leading-7 text-muted">Questions about onboarding your company, a booking, or a demo for your operations team — send a message and it goes straight to our support queue.</p>
        <ul className="mt-10 grid gap-4">
          {channels.map(([icon, label, value, href]) => (
            <li key={label} className="flex items-center gap-4">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-soft text-brand-fg"><span className="material-symbols-outlined">{icon}</span></span>
              <div>
                <p className="text-[12.5px] text-subtle">{label}</p>
                {href ? <a href={href} className="inline-flex min-h-[32px] items-center font-semibold text-ink hover:text-brand-fg">{value}</a> : <p className="font-semibold text-ink">{value}</p>}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <section className="card card-pad md:p-8">
        {state.sent ? (
          <div className="grid justify-items-center py-12 text-center animate-rise-in">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-success-soft text-success-fg"><span className="material-symbols-outlined icon-fill text-[28px]">check_circle</span></span>
            <h2 className="mt-5 text-xl font-bold">Message sent</h2>
            <p className="mt-2 max-w-sm text-[14px] text-muted">Thanks, {form.name.split(' ')[0]}. We reply to {form.email} within one business day.</p>
            <div className="mt-6 flex gap-2">
              <button type="button" className="btn btn-secondary" onClick={() => { setForm({ name: '', email: '', topic: topics[0], message: '' }); setState({ sending: false, sent: false, error: '' }); }}>Send another</button>
              <Link to="/" className="btn btn-primary">Back to home</Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="field"><span className="label">Your name</span><input className="input" required autoComplete="name" value={form.name} onChange={update('name')} placeholder="Full name" /></label>
              <label className="field"><span className="label">Email</span><input className="input" type="email" required autoComplete="email" value={form.email} onChange={update('email')} placeholder="you@company.com" /></label>
            </div>
            <fieldset className="field">
              <legend className="label mb-1.5">Topic</legend>
              <div className="flex flex-wrap gap-2">
                {topics.map((topic) => <button type="button" key={topic} aria-pressed={form.topic === topic} onClick={() => setForm((current) => ({ ...current, topic }))} className="chip">{topic}</button>)}
              </div>
            </fieldset>
            <label className="field"><span className="label">Message</span><textarea className="textarea min-h-[150px]" required minLength={10} value={form.message} onChange={update('message')} placeholder="How can we help?" /></label>
            <Alert>{state.error}</Alert>
            <button type="submit" disabled={state.sending} className="btn btn-primary btn-lg w-full sm:w-auto sm:justify-self-end">{state.sending ? <><Spinner /> Sending</> : 'Send message'}</button>
          </form>
        )}
      </section>
    </div>
  );
}

export default Contact;
