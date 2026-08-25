import { useEffect, useMemo, useState } from 'react';
import CompanyShell from '../../../components/company/CompanyShell';
import api from '../../../services/api';

const fields = [
  ['name', 'Company name'],
  ['phone', 'Business phone'],
  ['city', 'City'],
  ['province', 'Province'],
  ['location', 'Business address'],
];

function CompanyDetails() {
  const [company, setCompany] = useState({ name: '', description: '', phone: '', location: '', city: '', province: '', areas: [], logo: '', heroImage: '' });
  const [areaText, setAreaText] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/company/dashboard', { noCache: true })
      .then((result) => {
        const record = result.company || {};
        setCompany({ areas: [], ...record });
        setAreaText(Array.isArray(record.areas) ? record.areas.join(', ') : '');
      })
      .catch((error) => setMessage(error.message));
  }, []);

  const previewAreas = useMemo(() => areaText.split(',').map((item) => item.trim()).filter(Boolean), [areaText]);

  const readImage = (file, onReady) => {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'].includes(file.type)) return setMessage('Please choose a PNG, JPG, WEBP, or SVG image.');
    if (file.size > 1.5 * 1024 * 1024) return setMessage('Image must be under 1.5 MB.');
    const reader = new FileReader();
    reader.onload = () => onReady(reader.result);
    reader.onerror = () => setMessage('Unable to read this image file.');
    reader.readAsDataURL(file);
  };

  const pickLogo = (event) => {
    const file = event.target.files?.[0];
    readImage(file, (result) => setCompany((current) => ({ ...current, logo: result, heroImage: current.heroImage || result })));
    event.target.value = '';
  };

  const pickCover = (event) => {
    const file = event.target.files?.[0];
    readImage(file, (result) => setCompany((current) => ({ ...current, heroImage: result })));
    event.target.value = '';
  };

  const saveCompany = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const payload = { ...company, areas: previewAreas };
      const result = await api.put('/company/settings', payload);
      setCompany({ areas: [], ...(result.company || payload) });
      setMessage('Company details saved. Clients will see the updated profile after refresh.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <CompanyShell title="Company Details" subtitle="Control the profile clients see when they discover and book your company.">
      {message && <div className="mb-6 p-4 rounded-2xl bg-blue-50 border border-blue-100 text-blue-700 text-sm font-semibold flex items-center gap-3"><span className="material-symbols-outlined">info</span>{message}</div>}

      <div className="grid xl:grid-cols-[310px_minmax(0,1fr)] gap-6">
        <aside className="bg-white rounded-3xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] p-5 h-fit">
          <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 flex items-center gap-3">
            <div className="h-[76px] w-[76px] shrink-0 rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden flex items-center justify-center text-slate-300">
              {company.logo ? <img src={company.logo} alt={`${company.name || 'Company'} logo`} className="h-full w-full object-contain p-2" /> : <span className="material-symbols-outlined text-3xl">domain</span>}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Company profile</p>
              <h2 className="mt-1 truncate text-base font-extrabold text-slate-900">{company.name || 'Your company'}</h2>
              <p className="mt-1 truncate text-xs font-medium text-slate-500">{company.city || 'Add city'}{company.province ? `, ${company.province}` : ''}</p>
            </div>
          </div>
          <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-blue-200 bg-blue-50/60 p-3 hover:bg-blue-50 transition-colors">
            <span className="material-symbols-outlined rounded-xl bg-white p-2 text-blue-600 shadow-sm">cloud_upload</span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-blue-700">Replace company logo</span>
              <span className="block text-xs text-slate-500 mt-0.5">PNG, JPG, WEBP or SVG · 1.5 MB max</span>
            </span>
            <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={pickLogo} className="sr-only" />
          </label>
          <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-[#778DA9]/40 bg-[#E0E1DD]/50 p-3 hover:bg-[#E0E1DD] transition-colors">
            <span className="material-symbols-outlined rounded-xl bg-white p-2 text-[#1B263B] shadow-sm">image</span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-[#1B263B]">Update client card cover</span>
              <span className="block text-xs text-slate-500 mt-0.5">Shown on your public company card</span>
            </span>
            <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={pickCover} className="sr-only" />
          </label>
          <div className="mt-5 rounded-2xl bg-slate-50 border border-slate-100 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Discovery preview</p>
            <div className="mt-3 h-28 rounded-2xl overflow-hidden bg-slate-200 flex items-center justify-center text-slate-400">
              {(company.heroImage || company.logo) ? <img src={company.heroImage || company.logo} alt="Client card preview" className="h-full w-full object-cover" /> : <span className="material-symbols-outlined">storefront</span>}
            </div>
            <h3 className="mt-3 text-lg font-bold text-slate-900">{company.name || 'Your company name'}</h3>
            <p className="text-sm text-slate-500 mt-1">{company.city || 'City'}, {company.province || 'Province'}</p>
            <p className="text-xs leading-5 text-slate-500 mt-3 line-clamp-4">{company.description || 'Add a short professional description so clients understand your services before booking.'}</p>
          </div>
        </aside>

        <form onSubmit={saveCompany} className="bg-white rounded-3xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] p-6 md:p-8 space-y-6">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Public company record</h2>
              <p className="text-sm text-slate-500 mt-1">These details are used in client discovery and location results.</p>
            </div>
            <button disabled={saving} className="px-5 py-2.5 bg-blue-600 text-white rounded-2xl text-sm font-bold hover:bg-blue-700 disabled:opacity-60 shadow-sm">{saving ? 'Saving...' : 'Save details'}</button>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {fields.map(([key, label]) => (
              <label key={key} className="grid gap-2 text-xs font-bold text-slate-500 uppercase tracking-wide">
                {label}
                <input value={company[key] || ''} onChange={(event) => setCompany({ ...company, [key]: event.target.value })} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10" />
              </label>
            ))}
          </div>

          <label className="grid gap-2 text-xs font-bold text-slate-500 uppercase tracking-wide">
            Service areas inside Pakistan
            <input value={areaText} onChange={(event) => setAreaText(event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10" placeholder="Lahore, Johar Town, Gulberg, DHA" />
          </label>

          <label className="grid gap-2 text-xs font-bold text-slate-500 uppercase tracking-wide">
            Company description
            <textarea value={company.description || ''} onChange={(event) => setCompany({ ...company, description: event.target.value })} rows="6" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium leading-6 text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10" />
          </label>

          <div className="flex flex-wrap gap-2">
            {(previewAreas.length ? previewAreas : ['Add service areas']).map((area) => <span key={area} className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">{area}</span>)}
          </div>
        </form>
      </div>
    </CompanyShell>
  );
}

export default CompanyDetails;

