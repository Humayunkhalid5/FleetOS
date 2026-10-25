import { useMemo, useRef, useState } from 'react';
import api from '../../../services/api';
import { useLiveQuery, revalidate } from '../../../hooks/useLiveQuery';
import { usePageChrome } from '../../../hooks/usePageChrome';
import { useFeedback } from '../../../hooks/useFeedback';
import { DASHBOARD_KEY } from '../../../components/company/workspace';
import { CompanyCover, CompanyLogo } from '../../../components/customer/CompanyCard';
import { Alert, Skeleton, Spinner } from '../../../components/ui';
import { companyRoute } from '../../../constants';
import { FULFILLMENT } from '../../../constants/fulfillment';

const FIELDS = ['name', 'description', 'phone', 'location', 'city', 'businessCategory', 'logo', 'heroImage'];

function readImage(file, maxBytes = 1.5 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'].includes(file.type)) { reject(new Error('Choose a PNG, JPG, WEBP or SVG image.')); return; }
    if (file.size > maxBytes) { reject(new Error('Images must be under 1.5 MB.')); return; }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read that image.'));
    reader.readAsDataURL(file);
  });
}

export default function CompanyDetails() {
  const { toast } = useFeedback();
  const { data, loading } = useLiveQuery(DASHBOARD_KEY, { events: ['workspace:updated'] });
  const { data: catalogue } = useLiveQuery('/cities');
  const company = data?.company;
  const [form, setForm] = useState(null);
  const [areas, setAreas] = useState([]);
  const [areaInput, setAreaInput] = useState('');
  const [ways, setWays] = useState([]);
  const [fee, setFee] = useState('0');
  const allowedFor = (value) => (catalogue?.businessCategories || []).find((entry) => entry.value === value)?.fulfillment || [];
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const logoRef = useRef(null);
  const coverRef = useRef(null);

  if (company && !form) {
    setForm(Object.fromEntries(FIELDS.map((key) => [key, company[key] || ''])));
    setAreas(company.areas || []);
    setWays(company.workspace?.fulfillment || []);
    setFee(String(company.deliveryFee ?? company.workspace?.deliveryFee ?? 0));
  }

  const dirty = useMemo(() => form && company && (FIELDS.some((key) => (form[key] || '') !== (company[key] || '')) || JSON.stringify(areas) !== JSON.stringify(company.areas || []) || JSON.stringify(ways) !== JSON.stringify(company.workspace?.fulfillment || []) || Number(fee || 0) !== Number(company.deliveryFee || 0)), [form, company, areas, ways, fee]);
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const pick = (key) => async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try { const value = await readImage(file); setForm((current) => ({ ...current, [key]: value })); }
    catch (readError) { toast.error(readError.message); }
  };
  const addArea = () => { const value = areaInput.trim(); if (value && !areas.includes(value)) setAreas((current) => [...current, value]); setAreaInput(''); };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.put('/company/settings', { ...form, areas, fulfillmentOptions: ways, deliveryFee: Number(fee || 0) });
      await revalidate(DASHBOARD_KEY);
      setForm(null);
      toast.success('Profile published — customers see the changes now.');
    } catch (requestError) { setError(requestError.message); }
    finally { setSaving(false); }
  };

  usePageChrome({ title: 'Business profile', subtitle: 'What customers see when they find, book and order from you.' });

  if (loading || !form) return <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]"><Skeleton className="h-[540px] rounded-2xl" /><Skeleton className="h-80 rounded-2xl" /></div>;

  const preview = { ...company, ...form, areas, services: company?.services || [] };

  return (
    <form onSubmit={save} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
      <div className="grid gap-6">
        <section className="card overflow-hidden">
          <div className="relative">
            <CompanyCover company={preview} className="h-40 w-full" />
            <button type="button" className="btn btn-secondary btn-sm absolute right-3 top-3" onClick={() => coverRef.current?.click()}><span className="material-symbols-outlined">image</span>Change cover</button>
            <input ref={coverRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="sr-only" onChange={pick('heroImage')} />
          </div>
          <div className="flex items-end gap-4 px-5 pb-5 sm:px-6">
            <button type="button" onClick={() => logoRef.current?.click()} className="group relative z-10 -mt-9 rounded-2xl" aria-label="Change logo">
              <CompanyLogo company={preview} size={76} className="rounded-2xl ring-4 ring-surface" />
              <span className="absolute inset-0 grid place-items-center rounded-2xl bg-navy/50 text-white opacity-0 transition-opacity group-hover:opacity-100"><span className="material-symbols-outlined">photo_camera</span></span>
            </button>
            <input ref={logoRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="sr-only" onChange={pick('logo')} />
            <p className="pb-1 text-[12.5px] text-subtle">Logo and cover: PNG, JPG, WEBP or SVG up to 1.5 MB.</p>
          </div>
        </section>

        <section className="card">
          <div className="card-header"><h2 className="card-title">Business details</h2></div>
          <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
            <label className="field sm:col-span-2"><span className="label">Company name</span><input className="input" required value={form.name} onChange={update('name')} /></label>
            <label className="field sm:col-span-2"><span className="label">Description</span><textarea className="textarea" rows={4} value={form.description} onChange={update('description')} placeholder="What you do, who you serve, and what makes you reliable." /><span className="hint">Customers search this text in the marketplace.</span></label>
            <label className="field">
              <span className="label">Business category</span>
              <select className="select" value={form.businessCategory} onChange={(event) => { update('businessCategory')(event); setWays(allowedFor(event.target.value)); }}>
                {(catalogue?.businessCategories || []).map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
              </select>
              <span className="hint">Changes the modules and labels in your workspace.</span>
            </label>
            <label className="field"><span className="label">Public phone</span><input className="input" type="tel" value={form.phone} onChange={update('phone')} /></label>
            <label className="field">
              <span className="label">City</span>
              <select className="select" value={form.city} onChange={update('city')}>
                {(catalogue?.cities || []).map((city) => <option key={`${city.name}-${city.province}`} value={city.name}>{city.name} — {city.province}</option>)}
              </select>
            </label>
            <label className="field"><span className="label">Office location</span><input className="input" value={form.location} onChange={update('location')} placeholder="Area, city" /></label>
            <div className="field sm:col-span-2">
              <span className="label">Areas you serve</span>
              <div className="flex gap-2">
                <input className="input" value={areaInput} onChange={(event) => setAreaInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addArea(); } }} placeholder="e.g. DHA Phase 5" />
                <button type="button" className="btn btn-secondary h-11" onClick={addArea}>Add</button>
              </div>
              {areas.length > 0 && <div className="mt-1 flex flex-wrap gap-1.5">{areas.map((area) => <button key={area} type="button" className="badge badge-brand" onClick={() => setAreas((current) => current.filter((value) => value !== area))}>{area}<span className="material-symbols-outlined">close</span></button>)}</div>}
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-header"><div><h2 className="card-title">How customers get it</h2><p className="text-[12.5px] text-subtle">Customers choose one of these when they book or order.</p></div></div>
          <div className="grid gap-4 p-5 sm:p-6">
            <div className="grid gap-2 sm:grid-cols-2">
              {allowedFor(form.businessCategory).map((type) => {
                const info = FULFILLMENT[type];
                const on = ways.includes(type);
                return (
                  <button key={type} type="button" aria-pressed={on} onClick={() => setWays((current) => (on ? (current.length > 1 ? current.filter((value) => value !== type) : current) : [...current, type]))} className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-colors ${on ? 'border-brand bg-brand-soft/50 ring-1 ring-brand' : 'border-line hover:border-line-strong'}`}>
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${on ? 'bg-brand text-white' : 'bg-sunken text-subtle'}`}><span className="material-symbols-outlined text-[19px]">{info.icon}</span></span>
                    <span><span className="block text-[14px] font-semibold">{info.label}</span><span className="block text-[12.5px] text-muted">{info.needsAddress ? `Customer gives an address${info.tracking ? '; tracked live' : ''}` : type === 'remote' ? 'Delivered online' : 'At your premises'}</span></span>
                    <span className={`material-symbols-outlined ml-auto ${on ? 'icon-fill text-brand-fg' : 'text-subtle'}`}>{on ? 'check_circle' : 'radio_button_unchecked'}</span>
                  </button>
                );
              })}
            </div>
            {ways.includes('delivery') && (
              <label className="field max-w-xs"><span className="label">Delivery fee (PKR)</span><input className="input" type="number" min="0" max="100000" step="10" value={fee} onChange={(event) => setFee(event.target.value)} /><span className="hint">Added to delivery orders. Use 0 for free delivery.</span></label>
            )}
          </div>
        </section>
        <Alert>{error}</Alert>
      </div>

      <aside className="grid gap-4 lg:sticky lg:top-24">
        <div className="card overflow-hidden">
          <div className="card-header"><h2 className="card-title">Customer preview</h2>{company?.slug && <a href={companyRoute(company.slug)} target="_blank" rel="noreferrer" className="link text-[12.5px]">Open</a>}</div>
          <div className="p-4">
            <div className="overflow-hidden rounded-2xl border border-line">
              <CompanyCover company={preview} className="h-24 w-full" />
              <div className="p-4 pt-0">
                <CompanyLogo company={preview} size={44} className="relative z-10 -mt-5 ring-4 ring-surface" />
                <p className="mt-2 truncate font-semibold">{form.name || 'Company name'}</p>
                <p className="truncate text-[12.5px] text-muted">{form.location || form.city}</p>
                <p className="mt-2 line-clamp-3 text-[13px] text-muted">{form.description || 'Add a description so customers know what you offer.'}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="card card-pad grid gap-2">
          <button type="submit" className="btn btn-primary w-full" disabled={!dirty || saving}>{saving ? <><Spinner /> Publishing</> : 'Publish changes'}</button>
          <button type="button" className="btn btn-ghost w-full" disabled={!dirty || saving} onClick={() => setForm(null)}>Discard</button>
          <p className="text-center text-[12px] text-subtle">{dirty ? 'You have unpublished changes.' : 'Everything is published.'}</p>
        </div>
      </aside>
    </form>
  );
}
