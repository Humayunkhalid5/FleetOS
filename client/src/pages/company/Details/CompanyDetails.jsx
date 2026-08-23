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
  const [company, setCompany] = useState({ name: '', description: '', phone: '', location: '', city: '', province: '', areas: [], logo: '' });
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

  const pickLogo = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 1.5 * 1024 * 1024) return setMessage('Logo must be under 1.5 MB.');
    const reader = new FileReader();
    reader.onload = () => setCompany((current) => ({ ...current, logo: reader.result }));
    reader.onerror = () => setMessage('Unable to read this logo file.');
    reader.readAsDataURL(file);
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

      <div className="grid xl:grid-cols-[360px_minmax(0,1fr)] gap-6">
        <aside className="bg-white rounded-3xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] p-6 h-fit">
          <div className="aspect-square rounded-[2rem] bg-slate-50 border border-slate-100 overflow-hidden flex items-center justify-center text-slate-300">
            {company.logo ? <img src={company.logo} alt={`${company.name || 'Company'} logo`} className="h-full w-full object-cover" /> : <span className="material-symbols-outlined text-6xl">domain</span>}
          </div>
          <label className="mt-5 block cursor-pointer rounded-2xl border border-dashed border-blue-200 bg-blue-50/60 p-4 text-center hover:bg-blue-50 transition-colors">
            <span className="material-symbols-outlined text-blue-600">cloud_upload</span>
            <span className="block text-sm font-bold text-blue-700">Upload company picture/logo</span>
            <span className="block text-xs text-slate-500 mt-1">PNG, JPG, WEBP or SVG up to 1.5 MB</span>
            <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={pickLogo} className="sr-only" />
          </label>
          <div className="mt-6 rounded-2xl bg-slate-50 border border-slate-100 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Discovery preview</p>
            <h3 className="mt-3 text-lg font-bold text-slate-900">{company.name || 'Your company name'}</h3>
            <p className="text-sm text-slate-500 mt-1">{company.city || 'City'}, {company.province || 'Province'}</p>
            <p className="text-xs leading-5 text-slate-500 mt-3 line-clamp-4">{company.description || 'Add a short professional description so clients understand your services before booking.'}</p>
          </div>
        </aside>

        <form onSubmit={saveCompany} className="bg-white rounded-3xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] p-6 md:p-8 space-y-6">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Public company record</h2>
              <p className="text-sm text-slate-500 mt-1">These details are DB-backed and used in client discovery/location results.</p>
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
