import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { useFeedback } from '../../../hooks/useFeedback';
import { ROUTES } from '../../../constants';
import AuthShell from '../../../components/public/AuthShell';
import SocialSignIn from '../../../components/public/SocialSignIn';
import { Alert, Spinner } from '../../../components/ui';

const demoAccounts = [
  ['Customer', 'customer@fleetos.local', 'FleetCustomer1!'],
  ['Company', 'company@fleetos.local', 'FleetCompany1!'],
];

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, error } = useAuth();
  const { toast } = useFeedback();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const oauthError = new URLSearchParams(location.search).get('oauth_error') || '';
  const from = location.state?.from;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    const nextUser = await login(email, password);
    setSubmitting(false);
    if (!nextUser) return;
    const home = nextUser.role === 'company' ? ROUTES.companyDashboard : ROUTES.companies;
    const target = from && from.startsWith(nextUser.role === 'company' ? '/company' : '/customer') ? from : home;
    navigate(target, { replace: true });
  };

  return (
    <AuthShell title="Sign in to FleetOS" subtitle="Customers and company teams use the same sign-in. We'll open the right workspace for you.">
      <form onSubmit={handleSubmit} className="grid gap-4" noValidate={false}>
        <label className="field">
          <span className="label">Email</span>
          <span className="input-icon">
            <span className="material-symbols-outlined">mail</span>
            <input className="input" type="email" autoComplete="email" required placeholder="you@company.com" value={email} onChange={(event) => setEmail(event.target.value)} />
          </span>
        </label>
        <label className="field">
          <span className="flex items-center justify-between">
            <span className="label">Password</span>
            <button type="button" className="text-[12.5px] font-semibold text-brand-fg hover:underline" onClick={() => toast.info('Ask your FleetOS administrator to set a new password for your account. You can then change it any time from your profile.', { title: 'Reset password' })}>Forgot password?</button>
          </span>
          <span className="input-icon relative">
            <span className="material-symbols-outlined">lock</span>
            <input className="input pr-11" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required placeholder="Your password" value={password} onChange={(event) => setPassword(event.target.value)} />
            <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-subtle hover:bg-sunken hover:text-ink" aria-label={showPassword ? 'Hide password' : 'Show password'}>
              <span className="material-symbols-outlined text-[19px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
            </button>
          </span>
        </label>

        <Alert>{error || oauthError}</Alert>

        <button type="submit" disabled={submitting} className="btn btn-primary btn-lg mt-1 w-full">
          {submitting ? <><Spinner /> Signing in</> : 'Sign in'}
        </button>
      </form>

      <SocialSignIn />

      {import.meta.env.DEV && (
        <div className="well mt-6 p-4">
          <p className="text-[12.5px] font-semibold text-muted">Development accounts</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {demoAccounts.map(([label, demoEmail, demoPassword]) => (
              <button key={label} type="button" className="btn btn-secondary btn-sm" onClick={() => { setEmail(demoEmail); setPassword(demoPassword); }}>
                <span className="material-symbols-outlined">{label === 'Company' ? 'domain' : 'person'}</span>{label}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="mt-8 text-[14px] text-muted">
        New to FleetOS? <Link to={ROUTES.register} className="link">Create a customer account</Link> or <Link to="/company/register" className="link">register a company</Link>.
      </p>
    </AuthShell>
  );
}

export default Login;
