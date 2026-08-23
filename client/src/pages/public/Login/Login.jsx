import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { ROUTES } from '../../../constants';

function Login() {
  const navigate = useNavigate();
  const { login, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [socialLoading, setSocialLoading] = useState('');
  const [socialError] = useState(() => new URLSearchParams(window.location.search).get('oauth_error') || '');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const nextUser = await login(email, password);
    setSubmitting(false);
    if (nextUser) {
      if (nextUser.role === 'company') {
        navigate(ROUTES.companyDashboard);
      } else {
        navigate(ROUTES.companies);
      }
    }
  };

  const handleSocialLogin = (provider) => {
    setSocialLoading(provider);
    window.location.assign(`/api/auth/oauth/${provider}`);
  };

  return (
    <div className="bg-background min-h-screen flex items-center justify-center p-md relative overflow-hidden">
      {/* Animated Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary opacity-[0.03] rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 -right-48 w-[500px] h-[500px] bg-secondary-container opacity-[0.05] rounded-full blur-3xl"></div>
      </div>

      <main className="relative z-10 w-full max-w-md">
        <div className="bg-white/95 backdrop-blur-xl rounded-xl p-xl shadow-[0_4px_16px_0_rgba(11,29,45,0.12)] border border-surface-container-high">
          {/* Branding Header */}
          <div className="flex flex-col items-center mb-xl">
            <div className="flex items-center gap-sm mb-md">
              <div className="bg-primary p-xs rounded-lg shadow-lg shadow-primary/20">
                <span className="material-symbols-outlined text-on-primary text-[32px]">local_shipping</span>
              </div>
              <span className="font-headline-lg text-headline-lg text-primary tracking-tighter">FleetOS</span>
            </div>
            <h1 className="font-headline-md text-headline-md text-on-surface mb-xs">Welcome back to FleetOS</h1>
            <p className="font-body-md text-body-md text-on-surface-variant text-center">Efficiency and reliability at your fingertips.</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-lg">
            {/* Email Field */}
            <div className="space-y-sm">
              <label className="font-label-sm text-label-sm text-on-secondary-fixed-variant uppercase tracking-wider block" htmlFor="email">Email Address</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-[14px] flex items-center pointer-events-none w-6 justify-center">
                  <span className="material-symbols-outlined text-outline text-[20px] group-focus-within:text-primary transition-colors">mail</span>
                </div>
                <input
                  className="w-full pl-[52px] pr-md py-md bg-white border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-body-md text-on-surface placeholder:text-outline/50 placeholder:truncate"
                  id="email" name="email" placeholder="customer@fleetos.local" required type="email"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-sm">
              <div className="flex justify-between items-center">
                <label className="font-label-sm text-label-sm text-on-secondary-fixed-variant uppercase tracking-wider" htmlFor="password">Password</label>
                <a className="font-label-sm text-label-sm text-primary hover:underline transition-all cursor-pointer" onClick={(e) => { e.preventDefault(); alert('Password-reset email requires a configured mail provider and is not enabled locally.'); }}>Forgot Password?</a>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-[14px] flex items-center pointer-events-none w-6 justify-center">
                  <span className="material-symbols-outlined text-outline text-[20px] group-focus-within:text-primary transition-colors">lock</span>
                </div>
                <input
                  className="w-full pl-[52px] pr-12 py-md bg-white border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-body-md text-on-surface placeholder:text-outline/50"
                  id="password" name="password" placeholder="••••••••" required type={showPassword ? 'text' : 'password'}
                  value={password} onChange={(e) => setPassword(e.target.value)}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-md flex items-center text-outline hover:text-on-surface transition-colors">
                  <span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>

            {(error || socialError) && <p className="font-label-sm text-label-sm text-error">{error || socialError}</p>}

            {/* Remember Me Toggle */}
            <div className="flex items-center gap-sm">
              <input className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary" id="remember" type="checkbox" />
              <label className="font-body-md text-body-md text-on-surface-variant cursor-pointer" htmlFor="remember">Keep me logged in</label>
            </div>

            {/* Primary Action */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-primary text-on-primary py-md rounded-xl font-nav-item text-nav-item hover:bg-primary-container transition-all hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98] transform flex justify-center items-center gap-sm"
            >
              {submitting ? (
                <>
                  <span className="material-symbols-outlined animate-spin">progress_activity</span>
                  Signing in...
                </>
              ) : (
                <>
                  Login
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-xl">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-surface-container-highest"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-md font-label-sm text-label-sm text-outline uppercase tracking-widest">Or continue with</span>
            </div>
          </div>

          {/* Social Logins */}
          <div className="grid grid-cols-2 gap-md">
<button
              onClick={() => handleSocialLogin('google')}
              disabled={socialLoading === 'google'}
              className="flex items-center justify-center gap-sm py-md border border-outline-variant rounded-xl font-nav-item text-nav-item text-on-surface hover:bg-surface-container-low transition-all active:scale-[0.97] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {socialLoading === 'google' ? (
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
                </svg>
              )}
              Google
            </button>
            <button
              onClick={() => handleSocialLogin('linkedin')}
              disabled={socialLoading === 'linkedin'}
              className="flex items-center justify-center gap-sm py-md border border-outline-variant rounded-xl font-nav-item text-nav-item text-on-surface hover:bg-surface-container-low transition-all active:scale-[0.97] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {socialLoading === 'linkedin' ? (
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#0A66C2" d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V8.98h3.42v1.57h.05c.47-.9 1.64-1.85 3.37-1.85 3.61 0 4.27 2.37 4.27 5.46v6.29ZM5.32 7.41a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.1 20.45H3.54V8.98H7.1v11.47Z" />
                </svg>
              )}
              LinkedIn
            </button>
          </div>

          {/* Footer Link */}
          <div className="mt-xl text-center">
            <p className="font-body-md text-body-md text-on-surface-variant">
              Don't have an account?
              <a className="text-primary font-bold hover:underline transition-all cursor-pointer" onClick={(e) => { e.preventDefault(); navigate(ROUTES.register); }}> Sign Up</a>
            </p>
          </div>
        </div>

        {/* System Status Mini-Row */}
        <div className="mt-lg flex justify-between items-center px-sm">
          <div className="flex items-center gap-xs">
            <span className="w-2 h-2 bg-tertiary-container rounded-full animate-pulse"></span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">System Operational</span>
          </div>
          <div className="flex gap-md">
            <a className="font-label-sm text-label-sm text-outline hover:text-on-surface transition-colors cursor-pointer" onClick={(e) => { e.preventDefault(); alert('FleetOS Privacy Policy — Your data is protected with 256-bit SSL encryption and never sold to third parties.'); }}>Privacy</a>
            <a className="font-label-sm text-label-sm text-outline hover:text-on-surface transition-colors cursor-pointer" onClick={(e) => { e.preventDefault(); alert('FleetOS Terms of Service — By using FleetOS you agree to fair-use scheduling, transparent billing, and professional conduct.'); }}>Terms</a>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Login;

