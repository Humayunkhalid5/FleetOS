import { useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { ROUTES } from '../../../constants';

function CompanyRegister() {
  const navigate = useNavigate();
  const { register, error } = useAuth();
  const licenseInputRef = useRef(null);
  const logoInputRef = useRef(null);
  
  const [form, setForm] = useState({
    companyName: '',
    ownerName: '',
    registrationNumber: '',
    phone: '',
    city: '',
    address: '',
    email: '',
    password: '',
    agreeTerms: false
  });

  const [licenseFile, setLicenseFile] = useState(null);
  const [licenseDataUrl, setLicenseDataUrl] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [logoDataUrl, setLogoDataUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [submittedCompany, setSubmittedCompany] = useState(null);

  const update = (key) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm({ ...form, [key]: val });
  };

  const mimeFromFile = (file, fallback = 'application/octet-stream') => {
    const extension = String(file?.name || '').split('.').pop()?.toLowerCase();
    const byExtension = {
      pdf: 'application/pdf',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
      svg: 'image/svg+xml',
    };
    return file?.type || byExtension[extension] || fallback;
  };

  const normalizeDataUrlMime = (dataUrl, file) => {
    const mimeType = mimeFromFile(file);
    return String(dataUrl || '').replace(/^data:[^;,]*;base64,/, `data:${mimeType};base64,`);
  };

  const readUpload = (file, maxBytes) => new Promise((resolve, reject) => {
    if (!file) {
      resolve('');
      return;
    }
    if (file.size > maxBytes) {
      reject(new Error(`“${file.name}” exceeds the ${Math.round(maxBytes / 1024 / 1024)} MB limit.`));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(normalizeDataUrlMime(reader.result, file));
    reader.onerror = () => reject(new Error(`Could not read “${file.name}”.`));
    reader.readAsDataURL(file);
  });

  const handleLicenseChange = (e) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      setFormError('');
      setLicenseFile(file);
      setLicenseDataUrl('');
      readUpload(file, 5 * 1024 * 1024)
        .then(setLicenseDataUrl)
        .catch((uploadError) => {
          setLicenseFile(null);
          setFormError(uploadError.message);
        });
    } else {
      setLicenseFile(null);
      setLicenseDataUrl('');
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      setFormError('');
      setLogoFile(file);
      setLogoDataUrl('');
      readUpload(file, 1.5 * 1024 * 1024)
        .then(setLogoDataUrl)
        .catch((uploadError) => {
          setLogoFile(null);
          setFormError(uploadError.message);
        });
    } else {
      setLogoFile(null);
      setLogoDataUrl('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!form.agreeTerms) {
      setFormError('You must agree to the Terms of Service and Data Protection Agreement.');
      return;
    }
    const selectedLogoFile = logoFile || logoInputRef.current?.files?.[0] || null;
    const selectedLicenseFile = licenseFile || licenseInputRef.current?.files?.[0] || null;

    if (!selectedLogoFile || !selectedLicenseFile) {
      setFormError('Company logo and business license are required for Admin verification.');
      return;
    }

    setSubmitting(true);
    try {
      const [readyLogoDataUrl, readyLicenseDataUrl] = await Promise.all([
        logoDataUrl ? Promise.resolve(logoDataUrl) : readUpload(selectedLogoFile, 1.5 * 1024 * 1024),
        licenseDataUrl ? Promise.resolve(licenseDataUrl) : readUpload(selectedLicenseFile, 5 * 1024 * 1024),
      ]);
      if (!readyLogoDataUrl || !readyLicenseDataUrl) {
        throw new Error('Please choose both company logo and business license again, then submit.');
      }
      setLogoDataUrl(readyLogoDataUrl);
      setLicenseDataUrl(readyLicenseDataUrl);

      const targetName = form.companyName || form.ownerName;
      const regPayload = {
        name: targetName,
        email: form.email,
        password: form.password,
        phone: form.phone,
        address: form.address,
        role: 'company',
        companyName: form.companyName || targetName,
        registrationNumber: form.registrationNumber,
        city: form.city.trim(),
        logo: readyLogoDataUrl,
        businessLicense: { name: selectedLicenseFile.name, data: readyLicenseDataUrl },
      };

      const res = await register(regPayload);

      if (res) {
        setSubmittedCompany({
          name: res.companyName || regPayload.companyName,
          email: regPayload.email,
          status: res.approvalStatus || 'pending',
        });
      }
    } catch (err) {
      setFormError(err.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedCompany) {
    return (
      <div className="bg-surface-container-low min-h-screen flex items-center justify-center px-4 py-10">
        <section className="w-full max-w-xl rounded-3xl border border-outline-variant bg-white p-8 text-center shadow-xl">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <span className="material-symbols-outlined text-4xl">hourglass_top</span>
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-secondary">Registration submitted</p>
          <h1 className="mt-3 text-3xl font-black text-primary">Your company is waiting for Super Admin approval</h1>
          <p className="mt-4 text-sm leading-6 text-on-surface-variant">
            {submittedCompany.name} has been saved in MongoDB with your logo and business license. It will appear to clients after the Super Admin approves it.
          </p>
          <div className="mt-6 rounded-2xl bg-surface-container-low p-4 text-left text-sm">
            <p><span className="font-bold">Company:</span> {submittedCompany.name}</p>
            <p className="mt-1"><span className="font-bold">Email:</span> {submittedCompany.email}</p>
            <p className="mt-1"><span className="font-bold">Status:</span> {submittedCompany.status}</p>
          </div>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button onClick={() => navigate(ROUTES.home)} className="rounded-xl border border-outline-variant px-5 py-3 text-sm font-bold text-on-surface hover:bg-surface-container-low">
              Go to public site
            </button>
            <button onClick={() => navigate(ROUTES.companyDashboard)} className="rounded-xl bg-secondary px-5 py-3 text-sm font-bold text-on-secondary hover:bg-secondary-container">
              Check approval status
            </button>
          </div>
        </section>
      </div>
    );
  }

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
            <h2 className="text-on-primary font-bold text-3xl">Secure onboarding for Pakistani companies</h2>
            <p className="text-on-primary-container text-base">Join FleetOS to pitch your products, services, add-ons, and offers to clients by city. Your company profile, documents, requests, chats, payments, and reviews stay connected through one SaaS portal.</p>
            <div className="pt-6 space-y-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-on-tertiary-container" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                <span className="text-on-primary text-xs font-semibold">Admin approval before client visibility</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-on-tertiary-container" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                <span className="text-on-primary text-xs font-semibold">Products, services, inventory, and bookings in MongoDB</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-on-tertiary-container" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                <span className="text-on-primary text-xs font-semibold">One portal for requests, chat, payments, and reviews</span>
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
              <p className="text-on-surface-variant text-sm">Create your company profile so clients can discover your products, services, and offers after Super Admin approval.</p>
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
                      placeholder="e.g. Lahore Home Solutions"
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
                      placeholder="SECP / NTN / business registration no."
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
                      placeholder="+92 300 1234567"
                      value={form.phone}
                      onChange={update('phone')}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-on-surface text-xs font-semibold uppercase">Service City</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">location_city</span>
                    <input
                      required
                      type="text"
                      className="w-full pl-10 pr-3 py-2 rounded border border-outline-variant bg-surface-bright text-sm outline-none focus:border-secondary focus:ring-1 focus:ring-secondary"
                      placeholder="Lahore"
                      value={form.city}
                      onChange={update('city')}
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
                      placeholder="Street, area, city, province"
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
                      placeholder="admin@yourcompany.pk"
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
                  <p className="text-[11px] leading-4 text-on-surface-variant">
                    Use 10+ characters with uppercase, lowercase, number, and symbol. Example: CompanyTest1!
                  </p>
                </div>
              </div>

              {/* File Upload Bento Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => licenseInputRef.current?.click()}
                  className={`p-4 rounded-lg border-2 border-dashed border-outline-variant bg-surface-container flex flex-col items-center justify-center text-center cursor-pointer hover:bg-surface-container-high transition-colors ${licenseFile ? 'bg-secondary/10 border-secondary' : ''}`}
                >
                  <span className="material-symbols-outlined text-secondary mb-1 text-2xl" data-icon="description">description</span>
                  <span className="text-on-surface text-xs font-semibold">Business License</span>
                  <span className="text-on-surface-variant text-xs mt-1">
                    {licenseFile ? licenseFile.name : 'PDF, JPG (Max 5MB)'}
                  </span>
                  {licenseFile && <span className="mt-2 rounded-full bg-secondary/10 px-3 py-1 text-[11px] font-bold text-secondary">License selected</span>}
                </button>
                <input
                  ref={licenseInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/png,image/jpeg"
                  className="sr-only"
                  onChange={handleLicenseChange}
                />

                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className={`p-4 rounded-lg border-2 border-dashed border-outline-variant bg-surface-container flex flex-col items-center justify-center text-center cursor-pointer hover:bg-surface-container-high transition-colors ${logoFile ? 'bg-secondary/10 border-secondary' : ''}`}
                >
                  {logoDataUrl ? <img src={logoDataUrl} alt="Logo preview" className="w-10 h-10 object-contain rounded-lg mb-1 bg-white" /> : <span className="material-symbols-outlined text-secondary mb-1 text-2xl" data-icon="add_photo_alternate">add_photo_alternate</span>}
                  <span className="text-on-surface text-xs font-semibold">Company Logo</span>
                  <span className="text-on-surface-variant text-xs mt-1">
                    {logoFile ? logoFile.name : 'PNG, JPG, WEBP, SVG'}
                  </span>
                  {logoFile && <span className="mt-2 rounded-full bg-secondary/10 px-3 py-1 text-[11px] font-bold text-secondary">Logo selected</span>}
                </button>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml"
                  className="sr-only"
                  onChange={handleLogoChange}
                />
              </div>

              {/* CTA Section */}
              <div className="pt-4 border-t border-outline-variant mt-6">
                <label
                  htmlFor="agreeTerms"
                  onClick={(event) => { event.preventDefault(); setForm((current) => ({ ...current, agreeTerms: !current.agreeTerms })); }}
                  onKeyDown={(event) => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); setForm((current) => ({ ...current, agreeTerms: !current.agreeTerms })); } }}
                  tabIndex={0}
                  role="checkbox"
                  aria-checked={form.agreeTerms}
                  className={`flex items-start gap-3 mb-6 rounded-xl p-3 cursor-pointer select-none transition-colors ${form.agreeTerms ? 'bg-secondary/10' : 'hover:bg-surface-container'}`}
                >
                  <input 
                    type="checkbox"
                    id="agreeTerms"
                    className="sr-only"
                    checked={form.agreeTerms}
                    onChange={update('agreeTerms')}
                    readOnly
                  />
                  <span className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${form.agreeTerms ? 'bg-secondary border-secondary text-white' : 'bg-white border-outline text-transparent'}`}>
                    <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                  </span>
                  <span className="text-on-surface-variant text-xs leading-5">
                    I acknowledge that the information provided is legally binding. {form.companyName || 'Your Company'} agrees to the <a className="text-secondary underline font-semibold" href="#" onClick={(e) => { e.preventDefault(); e.stopPropagation(); alert('FleetOS Data Protection Agreement — uploaded license, logo, company profile, product/service details, and client workflow data are used only for verification, discovery, bookings, payments, and support.'); }}>Data Protection Agreement</a> and <a className="text-secondary underline font-semibold" href="#" onClick={(e) => { e.preventDefault(); e.stopPropagation(); alert('FleetOS Terms of Service — Companies must provide accurate details, publish honest products/services, maintain professional conduct, and honor accepted client requests.'); }}>Terms of Service</a>.
                  </span>
                </label>
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



