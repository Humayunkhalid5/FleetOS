import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { ROUTES } from '../../../constants';

function Register() {
  const navigate = useNavigate();
  const { register, error } = useAuth();
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    address: '',
  });
  const [role, setRole] = useState('customer');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const toggleAcceptedTerms = () => setAcceptedTerms((current) => !current);

  const pwd = form.password;
  const checks = {
    length: pwd.length >= 10,
    lowercase: /[a-z]/.test(pwd),
    uppercase: /[A-Z]/.test(pwd),
    number: /[0-9]/.test(pwd),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const nextUser = await register({
        name: form.fullName,
        email: form.email,
        phone: form.phone,
        address: form.address,
        password: form.password,
        role: 'customer',
      });
      if (nextUser) navigate(ROUTES.dashboard);
    } catch {
      // The shared auth context renders the API error below.
    } finally {
      setSubmitting(false);
    }
  };

  const reqItem = (id, label) => (
    <li className={`flex items-center gap-xs font-body-md text-body-md ${checks[id] ? 'text-tertiary' : 'text-outline'}`}>
      <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: checks[id] ? "'FILL' 1" : "'FILL' 0" }}>check_circle</span>
      {label}
    </li>
  );

  return (
    <div className="bg-background text-on-surface font-body-md min-h-screen">
      <main className="flex min-h-screen items-center justify-center p-container-margin lg:p-xl relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-20 z-0"></div>
        <div className="z-10 w-full max-w-4xl grid md:grid-cols-2 bg-surface-container-lowest rounded-xl shadow-xl overflow-hidden">
          {/* Left Panel: Visual Branding & Context */}
          <div className="hidden md:flex flex-col justify-between p-xl bg-primary text-on-primary relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="h-full w-full" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
            </div>
            <div className="relative z-20">
              <div className="flex items-center gap-sm mb-lg">
                <span className="material-symbols-outlined text-[32px]">local_shipping</span>
                <h1 className="font-headline-lg text-headline-lg font-bold tracking-tight">FleetOS</h1>
              </div>
              <h2 className="font-headline-md text-headline-md mb-md">Streamline your fleet operations today.</h2>
              <p className="font-body-lg text-body-lg opacity-80">Join thousands of managers who rely on FleetOS for reliable service booking, real-time tracking, and automated payments.</p>
            </div>
            <div className="relative z-20">
              <div className="bg-primary-container p-md rounded-xl text-on-primary-container shadow-sm border border-on-primary/10">
                <p className="font-label-sm text-label-sm uppercase mb-xs opacity-70">Latest Update</p>
                <p className="font-body-md text-body-md font-medium">New: Advanced driver analytics and maintenance scheduling tools now available.</p>
              </div>
            </div>
            <div className="relative mt-xl h-48 rounded-lg overflow-hidden shadow-lg border border-white/10">
              <img
                className="w-full h-full object-cover"
                alt="Fleet dashboard"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDr1GtFdGImNZ5fl-gpSHZ0qWanX0egJDETDQ7K9rl6mtYPVx-ET3TiNn7IWm8k_NGfzTeaw6VLuhqUo6vkb1ygju96ZuxfKOtlZ31G9YZqiYQ3iKTwCwc_yEX6Z0CYy2t0Wns1vrOZ7ozpdULvAeoiY20s8wpg32Kn9dhOaLBhRZE5CEteB6VXeG73_EHUxiP1QAgoieIiPi-wuiYsVm-1hE0yIfnfiAXLL_MByRwdaDL_pIDINZ1Uww"
              />
            </div>
          </div>

          {/* Right Panel: Registration Form */}
          <div className="p-lg md:p-xl flex flex-col justify-center">
            <div className="mb-lg">
              <div className="flex justify-between items-end mb-sm">
                <h3 className="font-headline-md text-headline-md text-primary">Create Account</h3>
                <span className="font-label-sm text-label-sm text-outline">Step 1 of 1</span>
              </div>
              <div className="w-full h-1 bg-surface-container rounded-full">
                <div className="h-full w-full bg-primary rounded-full transition-all duration-500"></div>
              </div>
            </div>

            <form className="space-y-md" onSubmit={handleSubmit}>
              {/* Role Selection */}
              <div className="space-y-xs">
                <label className="font-label-sm text-label-sm text-on-surface-variant">Account Type</label>
                <div className="grid grid-cols-2 gap-sm p-1 bg-surface-container rounded-xl border border-outline-variant">
                  <button
                    type="button"
                    onClick={() => setRole('customer')}
                    className={`py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-xs ${
                      role === 'customer'
                        ? 'bg-white text-primary shadow-sm font-semibold'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">person</span>
                    Customer
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(ROUTES.companyRegister)}
                    className={`py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-xs ${
                      role === 'company'
                        ? 'bg-white text-primary shadow-sm font-semibold'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">storefront</span>
                    Dealer / Fleet Provider
                  </button>
                </div>
              </div>

              {/* Full Name */}
              <div className="space-y-xs">
                <label className="font-label-sm text-label-sm text-on-surface-variant" htmlFor="full_name">Full Name</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-[14px] flex items-center pointer-events-none w-6 justify-center">
                    <span className="material-symbols-outlined text-outline text-[20px] group-focus-within:text-primary transition-colors">person</span>
                  </div>
                  <input className="w-full pl-[52px] pr-md py-md bg-surface-container-low border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" id="full_name" placeholder="Alex Thompson" required type="text" value={form.fullName} onChange={update('fullName')} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                {/* Email */}
                <div className="space-y-xs">
                  <label className="font-label-sm text-label-sm text-on-surface-variant" htmlFor="email">Email Address</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-[14px] flex items-center pointer-events-none w-6 justify-center">
                      <span className="material-symbols-outlined text-outline text-[20px] group-focus-within:text-primary transition-colors">mail</span>
                    </div>
                    <input className="w-full pl-[52px] pr-md py-md bg-surface-container-low border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" id="email" placeholder="alex@company.com" required type="email" value={form.email} onChange={update('email')} />
                  </div>
                </div>
                {/* Phone */}
                <div className="space-y-xs">
                  <label className="font-label-sm text-label-sm text-on-surface-variant" htmlFor="phone">Phone Number</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-[14px] flex items-center pointer-events-none w-6 justify-center">
                      <span className="material-symbols-outlined text-outline text-[20px] group-focus-within:text-primary transition-colors">call</span>
                    </div>
                    <input className="w-full pl-[52px] pr-md py-md bg-surface-container-low border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" id="phone" placeholder="+1 (555) 000-0000" required type="tel" value={form.phone} onChange={update('phone')} />
                  </div>
                </div>
              </div>

              {error && <p className="font-label-sm text-label-sm text-error">{error}</p>}

              {/* Password */}
              <div className="space-y-xs">
                <label className="font-label-sm text-label-sm text-on-surface-variant" htmlFor="password">Password</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-[14px] flex items-center pointer-events-none w-6 justify-center">
                    <span className="material-symbols-outlined text-outline text-[20px] group-focus-within:text-primary transition-colors">lock</span>
                  </div>
                  <input className="w-full pl-[52px] pr-12 py-md bg-surface-container-low border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" id="password" placeholder="••••••••" required type={showPassword ? 'text' : 'password'} value={form.password} onChange={update('password')} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface">
                    <span className="material-symbols-outlined">{showPassword ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>

              {/* Password Requirements Checklist */}
              <div className="bg-surface-container p-md rounded-xl space-y-sm">
                <p className="font-label-sm text-label-sm text-on-surface-variant">Security Requirements:</p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-xs">
                  {reqItem('length', '10+ Characters')}
                  {reqItem('lowercase', 'One Lowercase')}
                  {reqItem('uppercase', 'One Uppercase')}
                  {reqItem('number', 'One Number')}
                  {reqItem('special', 'Special Character')}
                </ul>
              </div>

              {/* Address */}
              <div className="space-y-xs">
                <label className="font-label-sm text-label-sm text-on-surface-variant" htmlFor="address">Office Address</label>
                <div className="relative group">
                  <div className="absolute top-4 left-[14px] flex items-center pointer-events-none w-6 justify-center">
                    <span className="material-symbols-outlined text-outline text-[20px] group-focus-within:text-primary transition-colors">location_on</span>
                  </div>
                  <textarea className="w-full pl-[52px] pr-md py-md bg-surface-container-low border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none" id="address" placeholder="123 Logistics Way, Tech Park, CA" required rows="2" value={form.address} onChange={update('address')}></textarea>
                </div>
              </div>
              {/* Terms Checkbox */}
              <label
                htmlFor="terms"
                onClick={(event) => { event.preventDefault(); toggleAcceptedTerms(); }}
                onKeyDown={(event) => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); toggleAcceptedTerms(); } }}
                tabIndex={0}
                role="checkbox"
                aria-checked={acceptedTerms}
                className={`flex items-start gap-md py-sm px-sm rounded-xl cursor-pointer select-none transition-colors ${acceptedTerms ? 'bg-primary/5' : 'hover:bg-surface-container-low'}`}
              >
                <input
                  id="terms"
                  required
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(event) => setAcceptedTerms(event.target.checked)}
                  readOnly
                  className="sr-only"
                />
                <span className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${acceptedTerms ? 'bg-primary border-primary text-white' : 'bg-white border-outline-variant text-transparent'}`}>
                  <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                </span>
                <span className="font-body-md text-body-md text-on-surface-variant">
                  I agree to the <a className="text-primary hover:underline font-semibold" href="#" onClick={(e) => { e.preventDefault(); e.stopPropagation(); alert('FleetOS Terms of Service — By using FleetOS you agree to fair-use scheduling, transparent billing, and professional conduct.'); }}>Terms of Service</a> and <a className="text-primary hover:underline font-semibold" href="#" onClick={(e) => { e.preventDefault(); e.stopPropagation(); alert('FleetOS Privacy Policy — Your data is protected and never sold to third parties.'); }}>Privacy Policy</a>.
                </span>
              </label>
{/* Register Button */}
              <button type="submit" disabled={submitting} className="w-full py-md bg-primary text-on-primary font-headline-md text-headline-md rounded-xl shadow-lg hover:bg-primary-container active:scale-[0.98] transition-all flex items-center justify-center gap-sm">
                {submitting ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">progress_activity</span>
                    Processing...
                  </>
                ) : (
                  <>
                    Continue to Fleet Setup
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-lg text-center">
              <p className="font-body-md text-body-md text-outline">
                Already have an account?
                <a className="text-primary font-bold hover:underline cursor-pointer" onClick={(e) => { e.preventDefault(); navigate(ROUTES.login); }}> Log In</a>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Register;



