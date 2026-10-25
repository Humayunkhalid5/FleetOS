import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { ROUTES } from '../../../constants';
import AuthShell from '../../../components/public/AuthShell';
import SocialSignIn from '../../../components/public/SocialSignIn';
import { Alert, Spinner } from '../../../components/ui';

function Register() {
  const navigate = useNavigate();
  const { register, error } = useAuth();
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', address: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const nextUser = await register({ name: form.fullName, email: form.email, phone: form.phone, address: form.address, password: form.password, role: 'customer' });
      if (nextUser) navigate(ROUTES.companies, { replace: true });
    } catch {
      // The auth context exposes the API error below.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell title="Create your customer account" subtitle="Book verified companies, follow every job live and keep receipts in one place.">
      <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-sunken p-1" role="tablist" aria-label="Account type">
        <button type="button" role="tab" aria-selected="true" className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-surface text-[13.5px] font-semibold text-ink shadow-xs">
          <span className="material-symbols-outlined text-[18px]">person</span>Customer
        </button>
        <Link to="/company/register" role="tab" aria-selected="false" className="inline-flex h-9 items-center justify-center gap-2 rounded-lg text-[13.5px] font-medium text-muted hover:text-ink">
          <span className="material-symbols-outlined text-[18px]">domain</span>Company
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4">
        <label className="field">
          <span className="label">Full name</span>
          <input className="input" autoComplete="name" required placeholder="Ali Shahzad" value={form.fullName} onChange={update('fullName')} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="field">
            <span className="label">Email</span>
            <input className="input" type="email" autoComplete="email" required placeholder="you@example.com" value={form.email} onChange={update('email')} />
          </label>
          <label className="field">
            <span className="label">Phone</span>
            <input className="input" type="tel" autoComplete="tel" required placeholder="+92 300 1234567" value={form.phone} onChange={update('phone')} />
          </label>
        </div>
        <label className="field">
          <span className="label">Password</span>
          <span className="relative">
            <input className="input pr-11" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required minLength={8} placeholder="At least 8 characters" value={form.password} onChange={update('password')} />
            <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-subtle hover:bg-sunken hover:text-ink" aria-label={showPassword ? 'Hide password' : 'Show password'}>
              <span className="material-symbols-outlined text-[19px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
            </button>
          </span>
        </label>
        <label className="field">
          <span className="label">Service address</span>
          <textarea className="textarea min-h-[76px] resize-none" required rows={2} placeholder="House, street, area, city" value={form.address} onChange={update('address')} />
          <span className="hint">Used as the default location for your bookings. You can change it per booking.</span>
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl p-1 text-[13.5px] text-muted">
          <input type="checkbox" className="checkbox mt-0.5" required checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} />
          <span>I agree to the FleetOS Terms of Service and Privacy Policy.</span>
        </label>

        <Alert>{error}</Alert>

        <button type="submit" disabled={submitting || !acceptedTerms} className="btn btn-primary btn-lg w-full">
          {submitting ? <><Spinner /> Creating account</> : 'Create account'}
        </button>
      </form>
      <SocialSignIn label="or sign up with" />

      <p className="mt-8 text-[14px] text-muted">Already have an account? <Link to={ROUTES.login} className="link">Sign in</Link></p>
    </AuthShell>
  );
}

export default Register;
