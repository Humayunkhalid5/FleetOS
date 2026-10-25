import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { useLiveQuery } from '../../../hooks/useLiveQuery';
import { ROUTES } from '../../../constants';
import AuthShell from '../../../components/public/AuthShell';
import { Alert, Spinner } from '../../../components/ui';
import { LogoMark } from '../../../components/ui/Logo';

const STEPS = [
  ['domain', 'Company', 'What your business does and where'],
  ['person', 'Owner account', 'How your team signs in'],
  ['verified_user', 'Verification', 'Documents the Super Admin reviews'],
];

const MAX_LICENSE = 5 * 1024 * 1024;
const MAX_LOGO = 1.5 * 1024 * 1024;

function mimeFromFile(file, fallback = 'application/octet-stream') {
  const extension = String(file?.name || '').split('.').pop()?.toLowerCase();
  const byExtension = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', svg: 'image/svg+xml' };
  return file?.type || byExtension[extension] || fallback;
}

function readUpload(file, maxBytes) {
  return new Promise((resolve, reject) => {
    if (!file) { resolve(''); return; }
    if (file.size > maxBytes) { reject(new Error(`“${file.name}” is larger than ${Math.round((maxBytes / 1024 / 1024) * 10) / 10} MB.`)); return; }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || '').replace(/^data:[^;,]*;base64,/, `data:${mimeFromFile(file)};base64,`));
    reader.onerror = () => reject(new Error(`Could not read “${file.name}”.`));
    reader.readAsDataURL(file);
  });
}

function UploadBox({ icon, title, hint, accept, file, preview, onChange, inputRef }) {
  return (
    <button type="button" onClick={() => inputRef.current?.click()} className={`group flex w-full items-center gap-4 rounded-2xl border border-dashed p-4 text-left transition-colors ${file ? 'border-success-line bg-success-soft/50' : 'border-line-strong hover:border-brand hover:bg-brand-soft/40'}`}>
      <span className={`grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl ${file ? 'bg-surface' : 'bg-sunken text-subtle group-hover:text-brand-fg'}`}>
        {preview ? <img src={preview} alt="" className="h-full w-full object-cover" /> : <span className="material-symbols-outlined">{file ? 'task' : icon}</span>}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold text-ink">{title}</span>
        <span className="block truncate text-[12.5px] text-muted">{file ? file.name : hint}</span>
      </span>
      <span className="btn btn-secondary btn-sm pointer-events-none">{file ? 'Replace' : 'Choose file'}</span>
      <input ref={inputRef} type="file" accept={accept} className="sr-only" onChange={onChange} tabIndex={-1} />
    </button>
  );
}

function CompanyRegister() {
  const navigate = useNavigate();
  const { register, error } = useAuth();
  const licenseInputRef = useRef(null);
  const logoInputRef = useRef(null);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ companyName: '', ownerName: '', registrationNumber: '', phone: '', city: '', businessCategory: '', description: '', address: '', email: '', password: '', agreeTerms: false });
  const [licenseFile, setLicenseFile] = useState(null);
  const [licenseDataUrl, setLicenseDataUrl] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [logoDataUrl, setLogoDataUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [submitted, setSubmitted] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const { data: catalogue, error: catalogueError } = useLiveQuery('/cities');
  const cities = useMemo(() => catalogue?.cities || [], [catalogue]);
  const categories = catalogue?.businessCategories || [];
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }));

  const selectFile = (kind) => (event) => {
    const file = event.target.files?.[0] || null;
    const [setFile, setData, max] = kind === 'logo' ? [setLogoFile, setLogoDataUrl, MAX_LOGO] : [setLicenseFile, setLicenseDataUrl, MAX_LICENSE];
    setFormError('');
    setFile(file);
    setData('');
    if (!file) return;
    readUpload(file, max).then(setData).catch((uploadError) => { setFile(null); setFormError(uploadError.message); });
  };

  const stepValid = [
    form.companyName.trim() && form.city && form.businessCategory && form.description.trim() && form.address.trim(),
    form.ownerName.trim() && form.email.trim() && form.phone.trim() && form.password.length >= 8,
    logoFile && licenseFile && form.agreeTerms,
  ];

  const next = (event) => {
    event.preventDefault();
    if (!event.currentTarget.reportValidity?.()) return;
    if (!stepValid[step]) { setFormError('Complete the required fields to continue.'); return; }
    setFormError('');
    setStep((value) => Math.min(value + 1, STEPS.length - 1));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    if (!logoFile || !licenseFile) { setFormError('Add your company logo and business license for verification.'); return; }
    if (!form.agreeTerms) { setFormError('Accept the Terms of Service and Data Protection Agreement to continue.'); return; }
    setSubmitting(true);
    try {
      const [logo, license] = await Promise.all([logoDataUrl || readUpload(logoFile, MAX_LOGO), licenseDataUrl || readUpload(licenseFile, MAX_LICENSE)]);
      const companyName = form.companyName.trim() || form.ownerName.trim();
      const user = await register({
        name: form.ownerName.trim() || companyName,
        email: form.email,
        password: form.password,
        phone: form.phone,
        address: form.address,
        role: 'company',
        companyName,
        registrationNumber: form.registrationNumber,
        city: form.city.trim(),
        businessCategory: form.businessCategory,
        description: form.description.trim(),
        logo,
        businessLicense: { name: licenseFile.name, data: license },
      });
      if (user) setSubmitted({ name: user.companyName || companyName, email: form.email, status: user.approvalStatus || 'pending' });
    } catch (requestError) {
      setFormError(requestError.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="grid min-h-[calc(100vh-64px)] place-items-center px-4 py-10">
        <section className="card w-full max-w-lg p-8 text-center animate-rise-in">
          <div className="mx-auto mb-6 w-fit"><LogoMark size={44} animated /></div>
          <h1 className="text-2xl font-bold">Registration received</h1>
          <p className="mx-auto mt-3 max-w-sm text-[14px] text-muted">{submitted.name} is now with a Super Admin for review. Your workspace opens automatically as soon as it is approved.</p>
          <div className="well mt-6 grid gap-1 p-4 text-left text-[13.5px]">
            <p><span className="text-subtle">Company</span> <span className="float-right font-semibold">{submitted.name}</span></p>
            <p><span className="text-subtle">Owner email</span> <span className="float-right font-semibold">{submitted.email}</span></p>
            <p><span className="text-subtle">Status</span> <span className="badge badge-warning float-right"><span className="material-symbols-outlined">hourglass_top</span>{submitted.status}</span></p>
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link to="/" className="btn btn-secondary">Back to website</Link>
            <button type="button" onClick={() => navigate(ROUTES.companyDashboard)} className="btn btn-primary">Open my workspace</button>
          </div>
        </section>
      </div>
    );
  }

  const last = step === STEPS.length - 1;

  return (
    <AuthShell wide title="Register your company" subtitle="Three short steps. An admin reviews each company before it is listed.">
      <ol className="mb-8 grid grid-cols-3 gap-2" aria-label="Registration steps">
        {STEPS.map(([, label, hint], index) => (
          <li key={label}>
            <button type="button" disabled={index > step} onClick={() => setStep(index)} className={`w-full rounded-2xl border p-3 text-left transition-colors ${index === step ? 'border-brand bg-brand-soft/50' : index < step ? 'border-line bg-surface' : 'border-line bg-surface opacity-60'}`} aria-current={index === step ? 'step' : undefined}>
              <span className="flex items-center gap-2">
                <span className={`grid h-6 w-6 place-items-center rounded-full text-[12px] font-bold ${index < step ? 'bg-success text-white' : index === step ? 'bg-brand text-white' : 'bg-sunken text-subtle'}`}>
                  {index < step ? <span className="material-symbols-outlined text-[15px]">check</span> : index + 1}
                </span>
                <span className="text-[13.5px] font-semibold text-ink">{label}</span>
              </span>
              <span className="mt-1 hidden text-[12px] text-muted sm:block">{hint}</span>
            </button>
          </li>
        ))}
      </ol>

      <form onSubmit={last ? handleSubmit : next} className="card card-pad grid gap-5" noValidate={false}>
        {step === 0 && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="field"><span className="label">Company name</span><input className="input" required value={form.companyName} onChange={update('companyName')} placeholder="e.g. Lahore Game Zone, Glow Salon, QuickFix Plumbing" /></label>
              <label className="field"><span className="label">Registration / NTN number <span className="font-normal text-subtle">(optional)</span></span><input className="input" value={form.registrationNumber} onChange={update('registrationNumber')} placeholder="e.g. 1234567-8" /></label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="field">
                <span className="label">Business category</span>
                <select className="select" required value={form.businessCategory} onChange={update('businessCategory')}>
                  <option value="">Select what your business does</option>
                  {categories.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
                </select>
                <span className="hint">{categories.find((category) => category.value === form.businessCategory)?.description || 'Sets your modules, labels and how customers get your service.'}</span>
              </label>
              <label className="field">
                <span className="label">Main city</span>
                <select className="select" required value={form.city} onChange={update('city')}>
                  <option value="">Select a city</option>
                  {cities.map((city) => <option key={`${city.name}-${city.province}`} value={city.name}>{city.name} — {city.province}</option>)}
                </select>
              </label>
            </div>
            <label className="field"><span className="label">Office address</span><input className="input" required value={form.address} onChange={update('address')} placeholder="Building, street, area" /></label>
            <label className="field">
              <span className="label">What you offer</span>
              <textarea className="textarea" required rows={3} value={form.description} onChange={update('description')} placeholder="Describe your services, products and the areas you cover. Customers search this text." />
            </label>
          </>
        )}

        {step === 1 && (
          <>
            <label className="field"><span className="label">Owner full name</span><input className="input" required autoComplete="name" value={form.ownerName} onChange={update('ownerName')} placeholder="Full name" /></label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="field"><span className="label">Work email</span><input className="input" type="email" required autoComplete="email" value={form.email} onChange={update('email')} placeholder="owner@company.pk" /></label>
              <label className="field"><span className="label">Phone</span><input className="input" type="tel" required autoComplete="tel" value={form.phone} onChange={update('phone')} placeholder="+92 300 1234567" /></label>
            </div>
            <label className="field">
              <span className="label">Password</span>
              <span className="relative">
                <input className="input pr-11" type={showPassword ? 'text' : 'password'} required minLength={8} autoComplete="new-password" value={form.password} onChange={update('password')} placeholder="At least 8 characters" />
                <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-subtle hover:bg-sunken hover:text-ink" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  <span className="material-symbols-outlined text-[19px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </span>
            </label>
          </>
        )}

        {step === 2 && (
          <>
            <UploadBox icon="description" title="Business license" hint="PDF, JPG or PNG · up to 5 MB" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/png,image/jpeg" file={licenseFile} inputRef={licenseInputRef} onChange={selectFile('license')} />
            <UploadBox icon="add_photo_alternate" title="Company logo" hint="PNG, JPG, WEBP or SVG · up to 1.5 MB" accept=".png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml" file={logoFile} preview={logoDataUrl} inputRef={logoInputRef} onChange={selectFile('logo')} />
            <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-sunken/60 p-4 text-[13.5px] text-muted">
              <input type="checkbox" className="checkbox mt-0.5" checked={form.agreeTerms} onChange={update('agreeTerms')} />
              <span>I confirm these details are accurate and {form.companyName || 'my company'} agrees to the FleetOS Terms of Service and Data Protection Agreement. Documents are used only for verification.</span>
            </label>
          </>
        )}

        <Alert>{formError || error || (catalogueError && 'The city list could not be loaded. Check your connection — it will retry automatically.')}</Alert>

        <div className="flex items-center justify-between gap-3 border-t border-line pt-5">
          {step > 0 ? <button type="button" className="btn btn-ghost" onClick={() => setStep((value) => value - 1)}><span className="material-symbols-outlined">arrow_back</span>Back</button> : <Link to={ROUTES.login} className="text-[13.5px] text-muted">Already registered? <span className="link">Sign in</span></Link>}
          <button type="submit" disabled={submitting} className="btn btn-primary">
            {submitting ? <><Spinner /> Submitting</> : last ? 'Submit for verification' : 'Continue'}
          </button>
        </div>
      </form>
    </AuthShell>
  );
}

export default CompanyRegister;
