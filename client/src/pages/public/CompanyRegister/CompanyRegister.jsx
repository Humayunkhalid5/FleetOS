import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { ROUTES } from '../../../constants';

function CompanyRegister() {
  const navigate = useNavigate();
  const { register, error } = useAuth();
  
  const [form, setForm] = useState({
    companyName: '',
    ownerName: '',
    registrationNumber: '',
    phone: '',
    address: '',
    email: '',
    password: '',
    agreeTerms: false
  });

  const [licenseFile, setLicenseFile] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [logoDataUrl, setLogoDataUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const update = (key) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm({ ...form, [key]: val });
  };

  const handleLicenseChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setLicenseFile(e.target.files[0]);
    }
  };

  const handleLogoChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoDataUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!form.agreeTerms) {
      setFormError('You must agree to the Terms of Service and Data Protection Agreement.');
      return;
    }

    setSubmitting(true);
    try {
      const targetName = form.companyName || form.ownerName;
      const targetSlug = targetName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const addressParts = (form.address || '').split(',');
      const detectedCity = addressParts.length >= 2 ? addressParts[addressParts.length - 2].trim() : (addressParts[0] || '').trim();

      const regPayload = {
        name: targetName,
        email: form.email,
        password: form.password,
        phone: form.phone,
        address: form.address,
        role: 'company',
        companyName: form.companyName || targetName,
        companyId: targetSlug,
        registrationNumber: form.registrationNumber,
        city: detectedCity,
        logo: logoDataUrl,
      };

      const res = await register(regPayload);

      // Save to local storage cache as well
      try {
        const stored = JSON.parse(localStorage.getItem('fleetos-registered-companies') || '[]');
        const exists = stored.some((c) => c.slug === targetSlug || c.name === targetName);
        if (!exists) {
          stored.push({
            _id: res?._id || `comp-${Date.now()}`,
            name: targetName,
            slug: targetSlug,
            description: 'Registered SaaS Fleet & Maintenance Provider',
            phone: form.phone,
            email: form.email,
            location: form.address,
            city: detectedCity,
            logo: logoDataUrl,
            rating: 0,
            reviewCount: 0,
            services: [],
            technicians: []
          });
          localStorage.setItem('fleetos-registered-companies', JSON.stringify(stored));
        }
      } catch (err) {}

      if (res) {
        navigate(ROUTES.companyDashboard);
      }
    } catch (err) {
      setFormError(err.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col font-sans">
      {/* TopAppBar */}
      <header className="bg-background dark:bg-inverse-surface border-b border-outline-variant dark:border-outline flex justify-between items-center w-full px-4 md:px-8 h-16 sticky top-0 z-50">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate(ROUTES.home)}>
          <span className="material-symbols-outlined text-secondary" data-icon="shield">shield</span>
          <h1 className="text-xl font-bold text-primary dark:text-primary-fixed">FleetOS</h1>
        </div>
        <div className="hidden md:flex items-center gap-6">
          <nav className="flex gap-4">
            <Link className="text-on-surface-variant text-xs font-semibold hover:bg-surface-container-high transition-colors px-3 py-1 rounded" to={ROUTES.home}>Solutions</Link>
            <Link className="text-on-surface-variant text-xs font-semibold hover:bg-surface-container-high transition-colors px-3 py-1 rounded" to={ROUTES.about}>About</Link>
            <Link className="text-on-surface-variant text-xs font-semibold hover:bg-surface-container-high transition-colors px-3 py-1 rounded" to={ROUTES.contact}>Contact</Link>
          </nav>
          <button className="bg-secondary text-on-secondary px-4 py-2 rounded-lg text-xs font-semibold active:scale-95 transition-transform">Support</button>
        </div>
        <div className="md:hidden">
          <span className="material-symbols-outlined text-on-surface-variant">menu</span>
        </div>
      </header>

      <main className="flex-grow flex flex-col lg:flex-row">
        {/* Visual Column (Desktop) */}
        <div className="hidden lg:flex w-5/12 bg-primary-container relative overflow-hidden flex-col justify-center p-8">
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <div 
              className="w-full h-full bg-cover bg-center" 
              style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBNYZiqGfBxXyCZA2zCKQwBEEFN4Ugw-mV8Zyo3mV1d9PbePvEng78CvrmNYwVK9bVD4Cd_mDCrKzUcLTP2xpZo_XHfOJmdUEXcnd1SkVTqicqN2B6ViSCKLt0UuOAy-MQ-YYFe2Dltr61HJ_5upuqQ2rmhaiKBLwP7lKxKOurn7VQ42cnjGuyfgZgvCqDgLPPH8E7USFss-_gDsINkoq8-Qk-grgsYH63UlBD_AVNozEz3Ee9TDtccag')" }}
            ></div>
          </div>
          <div className="relative z-10 space-y-6 max-w-md">
            <div className="bg-secondary-container/20 w-16 h-16 rounded-xl flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-secondary text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
            </div>
            <h2 className="text-on-primary font-bold text-3xl">Secure Onboarding for Global Fleets</h2>
            <p className="text-on-primary-container text-base">Join thousands of B2B enterprises managing critical logistics with precision. Your data is protected by industry-standard encryption and comprehensive privacy protocols.</p>
            <div className="pt-6 space-y-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-on-tertiary-container" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                <span className="text-on-primary text-xs font-semibold">ISO 27001 Certified Security</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-on-tertiary-container" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                <span className="text-on-primary text-xs font-semibold">Real-time Data Privacy Shields</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-on-tertiary-container" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                <span className="text-on-primary text-xs font-semibold">Priority B2B Account Manager</span>
              </div>
            </div>
          </div>
        </div>

        {/* Registration Form Column */}
        <div className="flex-grow flex flex-col justify-center items-center py-8 px-4 md:px-8 bg-surface-container-low">
          <div className="w-full max-w-2xl bg-surface-container-lowest p-6 md:p-8 rounded-xl border border-outline-variant shadow-sm">
            {/* Form Header */}
            <div className="mb-6 text-center md:text-left">
              <h3 className="text-on-surface text-xl font-bold mb-1">Register Company</h3>
              <p className="text-on-surface-variant text-sm">Initialize your organization's administrative console within FleetOS.</p>
            </div>

            {(error || formError) && (
              <div className="mb-4 p-3 bg-error-container text-on-error-container text-xs rounded-lg flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">error</span>
                <span>{formError || error}</span>
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Company Identity */}
                <div className="space-y-1">
                  <label className="block text-on-surface text-xs font-semibold uppercase">Company Name</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg" data-icon="business">business</span>
                    <input 
                      required
                      type="text"
                      className="w-full pl-10 pr-3 py-2 rounded border border-outline-variant bg-surface-bright text-sm outline-none focus:border-secondary focus:ring-1 focus:ring-secondary"
                      placeholder="e.g. Nexus Logistics"
                      value={form.companyName}
                      onChange={update('companyName')}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-on-surface text-xs font-semibold uppercase">Owner / Manager Name</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg" data-icon="person">person</span>
                    <input 
                      required
                      type="text"
                      className="w-full pl-10 pr-3 py-2 rounded border border-outline-variant bg-surface-bright text-sm outline-none focus:border-secondary focus:ring-1 focus:ring-secondary"
                      placeholder="Full legal name"
                      value={form.ownerName}
                      onChange={update('ownerName')}
                    />
                  </div>
                </div>

                {/* Registration & Phone */}
                <div className="space-y-1">
                  <label className="block text-on-surface text-xs font-semibold uppercase">Registration Number</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg" data-icon="badge">badge</span>
                    <input 
                      required
                      type="text"
                      className="w-full pl-10 pr-3 py-2 rounded border border-outline-variant bg-surface-bright text-sm outline-none focus:border-secondary focus:ring-1 focus:ring-secondary"
                      placeholder="Tax ID / EIN"
                      value={form.registrationNumber}
                      onChange={update('registrationNumber')}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-on-surface text-xs font-semibold uppercase">Business Phone</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg" data-icon="call">call</span>
                    <input 
                      required
                      type="tel"
                      className="w-full pl-10 pr-3 py-2 rounded border border-outline-variant bg-surface-bright text-sm outline-none focus:border-secondary focus:ring-1 focus:ring-secondary"
                      placeholder="+1 (555) 000-0000"
                      value={form.phone}
                      onChange={update('phone')}
                    />
                  </div>
                </div>

                {/* Full Width Address */}
                <div className="md:col-span-2 space-y-1">
                  <label className="block text-on-surface text-xs font-semibold uppercase">Business Address</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-3 text-outline text-lg" data-icon="location_on">location_on</span>
                    <textarea 
                      required
                      rows="2"
                      className="w-full pl-10 pr-3 py-2 rounded border border-outline-variant bg-surface-bright text-sm outline-none focus:border-secondary focus:ring-1 focus:ring-secondary resize-none"
                      placeholder="Street, Suite, City, State, ZIP"
                      value={form.address}
                      onChange={update('address')}
                    ></textarea>
                  </div>
                </div>

                {/* Auth Details */}
                <div className="space-y-1">
                  <label className="block text-on-surface text-xs font-semibold uppercase">Admin Email</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg" data-icon="mail">mail</span>
                    <input 
                      required
                      type="email"
                      className="w-full pl-10 pr-3 py-2 rounded border border-outline-variant bg-surface-bright text-sm outline-none focus:border-secondary focus:ring-1 focus:ring-secondary"
                      placeholder="admin@nexuslogistics.com"
                      value={form.email}
                      onChange={update('email')}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-on-surface text-xs font-semibold uppercase">Password</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg" data-icon="lock">lock</span>
                    <input 
                      required
                      type="password"
                      className="w-full pl-10 pr-3 py-2 rounded border border-outline-variant bg-surface-bright text-sm outline-none focus:border-secondary focus:ring-1 focus:ring-secondary"
                      placeholder="••••••••"
                      value={form.password}
                      onChange={update('password')}
                    />
                  </div>
                </div>
              </div>

              {/* File Upload Bento Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <label className={`p-4 rounded-lg border-2 border-dashed border-outline-variant bg-surface-container flex flex-col items-center justify-center text-center cursor-pointer hover:bg-surface-container-high transition-colors ${licenseFile ? 'bg-secondary/10 border-secondary' : ''}`}>
                  <span className="material-symbols-outlined text-secondary mb-1 text-2xl" data-icon="description">description</span>
                  <span className="text-on-surface text-xs font-semibold">Business License</span>
                  <span className="text-on-surface-variant text-xs mt-1">
                    {licenseFile ? licenseFile.name : 'PDF, JPG (Max 5MB)'}
                  </span>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleLicenseChange} />
                </label>

                <label className={`p-4 rounded-lg border-2 border-dashed border-outline-variant bg-surface-container flex flex-col items-center justify-center text-center cursor-pointer hover:bg-surface-container-high transition-colors ${logoFile ? 'bg-secondary/10 border-secondary' : ''}`}>
                  <span className="material-symbols-outlined text-secondary mb-1 text-2xl" data-icon="add_photo_alternate">add_photo_alternate</span>
                  <span className="text-on-surface text-xs font-semibold">Company Logo</span>
                  <span className="text-on-surface-variant text-xs mt-1">
                    {logoFile ? logoFile.name : 'PNG, SVG (1:1 Ratio)'}
                  </span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                </label>
              </div>

              {/* CTA Section */}
              <div className="pt-4 border-t border-outline-variant mt-6">
                <div className="flex items-start gap-3 mb-6">
                  <input 
                    type="checkbox"
                    id="agreeTerms"
                    className="mt-1 rounded border-outline text-secondary focus:ring-secondary"
                    checked={form.agreeTerms}
                    onChange={update('agreeTerms')}
                  />
                  <label htmlFor="agreeTerms" className="text-on-surface-variant text-xs">
                    I acknowledge that the information provided is legally binding. {form.companyName || 'Your Company'} agrees to the <a className="text-secondary underline" href="#" onClick={(e) => e.preventDefault()}>Data Protection Agreement</a> and <a className="text-secondary underline" href="#" onClick={(e) => e.preventDefault()}>Terms of Service</a>.
                  </label>
                </div>

                <button 
                  type="submit" 
                  disabled={submitting}
                  className="w-full bg-secondary text-on-secondary py-3 rounded-lg font-bold text-base shadow-md hover:bg-secondary-container transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <span className="material-symbols-outlined animate-spin" data-icon="progress_activity">progress_activity</span>
                      Processing Registration...
                    </>
                  ) : (
                    <>
                      Register Company
                      <span className="material-symbols-outlined" data-icon="arrow_forward">arrow_forward</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-6 text-center">
              <p className="text-on-surface-variant text-xs">
                Already registered? <Link className="text-secondary font-semibold hover:underline" to={ROUTES.login}>Sign In to Dashboard</Link>
              </p>
            </div>
          </div>

          {/* Trust Badges */}
          <div className="mt-6 flex flex-wrap justify-center gap-6 opacity-60">
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm" data-icon="encrypted">encrypted</span>
              <span className="text-xs font-semibold">SSL Secure</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm" data-icon="gpp_good">gpp_good</span>
              <span className="text-xs font-semibold">GDPR Compliant</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm" data-icon="cloud_done">cloud_done</span>
              <span className="text-xs font-semibold">Data Encrypted</span>
            </div>
          </div>
        </div>
      </main>

      {/* Simple Footer */}
      <footer className="py-4 px-4 md:px-8 border-t border-outline-variant bg-surface-container-low flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
        <div className="text-on-surface-variant font-semibold">© 2024 FleetOS Infrastructure Ltd. All rights reserved.</div>
        <div className="flex gap-6">
          <Link className="text-on-surface-variant font-semibold hover:text-secondary" to={ROUTES.about}>Privacy Policy</Link>
          <Link className="text-on-surface-variant font-semibold hover:text-secondary" to={ROUTES.contact}>Compliance</Link>
          <Link className="text-on-surface-variant font-semibold hover:text-secondary" to={ROUTES.home}>System Status</Link>
        </div>
      </footer>
    </div>
  );
}

export default CompanyRegister;
