import { useMemo, useState } from 'react';
import api from '../../../services/api';
import { useLiveQuery } from '../../../hooks/useLiveQuery';
import { usePageChrome } from '../../../hooks/usePageChrome';
import { useFeedback } from '../../../hooks/useFeedback';
import { useWorkspace } from '../../../components/company/workspace';
import { Alert, EmptyState, Modal, SkeletonRows, Spinner, StatusBadge, Tabs } from '../../../components/ui';
import { formatCurrency } from '../../../utils/helpers';

const BASE_CATEGORIES = ['Installation', 'Repair & Support', 'Home Service', 'Business Service', 'Digital Service', 'Professional Service', 'Retail Product'];
const blank = (category = '') => ({ name: '', category, price: '', durationMinutes: 60, status: 'Active', description: '', kind: 'service', unit: '' });
const UNITS = ['per visit', 'per job', 'per hour', 'per session', 'per item', 'per pack', 'per kg', 'per litre', 'per person', 'per month', 'per project'];

export default function CompanyServices() {
  const { workspace } = useWorkspace();
  const { confirm, toast } = useFeedback();
  const label = workspace.offeringLabel || 'Services';
  const { data, error, loading, refresh } = useLiveQuery('/services', { events: ['workspace:updated'] });
  const services = useMemo(() => data?.services || [], [data]);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('all');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [picked, setPicked] = useState(() => new Set());
  const [adding, setAdding] = useState(false);
  const { data: templateData } = useLiveQuery(suggestOpen || !services.length ? '/services/templates' : null, { events: ['workspace:updated'] });
  const templates = templateData?.templates || [];
  const fresh = templates.filter((row) => !row.added);
  const categories = [...new Set([...BASE_CATEGORIES, ...(workspace.inventoryCategories || []), ...services.map((service) => service.category)].filter(Boolean))];

  const q = query.trim().toLowerCase();
  const list = services.filter((service) => (tab === 'all' || service.status === tab) && (!q || [service.name, service.category, service.description].some((value) => String(value || '').toLowerCase().includes(q))));

  const open = (service = null) => { setEditing(service || 'new'); setForm(service ? { ...service } : blank(categories[0])); setFormError(''); };
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.type === 'number' ? (event.target.value === '' ? '' : Number(event.target.value)) : event.target.value }));

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError('');
    const payload = { name: form.name, category: form.category, price: Number(form.price), durationMinutes: Number(form.durationMinutes), status: form.status, description: form.description, kind: form.kind || 'service', unit: form.unit || '' };
    try {
      if (editing === 'new') await api.post('/services', payload); else await api.put(`/services/${editing._id}`, payload);
      toast.success(`${form.name} ${editing === 'new' ? 'published' : 'saved'}`);
      setEditing(null);
    } catch (requestError) { setFormError(requestError.message); }
    finally { setSaving(false); }
  };

  const toggle = async (service) => {
    const status = service.status === 'Active' ? 'Inactive' : 'Active';
    try { await api.put(`/services/${service._id}`, { status }); toast.success(status === 'Active' ? `${service.name} is visible to customers` : `${service.name} is hidden from customers`); }
    catch (requestError) { toast.error(requestError.message); }
  };

  const openSuggestions = () => { setPicked(new Set()); setSuggestOpen(true); };
  const addSuggestions = async (names) => {
    setAdding(true);
    try {
      const { services: created } = await api.post('/services/templates', names ? { names } : {});
      toast.success(`${created.length} item${created.length === 1 ? '' : 's'} added to your ${label.toLowerCase()}`);
      setSuggestOpen(false);
    } catch (requestError) { toast.error(requestError.message); }
    finally { setAdding(false); }
  };

  const remove = async (service) => {
    const ok = await confirm({ title: `Delete ${service.name}?`, message: 'Customers can no longer book it. Existing bookings keep their recorded price.', confirmLabel: 'Delete', tone: 'danger' });
    if (!ok) return;
    try { await api.del(`/services/${service._id}`); toast.success(`${service.name} deleted`); }
    catch (requestError) { toast.error(requestError.message); }
  };

  usePageChrome({
    title: label,
    subtitle: 'What customers can find and book on your profile.',
    search: query,
    onSearch: setQuery,
    actions: <>
      <button type="button" className="btn btn-secondary" onClick={openSuggestions}><span className="material-symbols-outlined">auto_awesome</span>Suggested</button>
      <button type="button" className="btn btn-primary" onClick={() => open()}><span className="material-symbols-outlined">add</span>Add new</button>
    </>,
  });

  return (
    <div className="grid gap-5">
      <Tabs value={tab} onChange={setTab} tabs={[['all', 'All', services.length], ['Active', 'Published', services.filter((service) => service.status === 'Active').length], ['Inactive', 'Hidden', services.filter((service) => service.status !== 'Active').length]]} />
      <Alert onRetry={refresh}>{error && !data ? error.message : ''}</Alert>
      <section className="card overflow-hidden">
        {loading ? <div className="p-5"><SkeletonRows rows={5} /></div> : list.length ? (
          <div className="overflow-x-auto">
            <table className="table min-w-[820px]">
              <thead><tr><th>Name</th><th>Type</th><th>Category</th><th>Duration</th><th>Visibility</th><th className="text-right">Price</th><th className="text-right">Actions</th></tr></thead>
              <tbody>
                {list.map((service) => (
                  <tr key={service._id}>
                    <td><p className="font-semibold">{service.name}</p><p className="max-w-md truncate text-[12.5px] text-subtle">{service.description || 'No description'}</p></td>
                    <td><span className={`badge ${service.kind === 'product' ? 'badge-violet' : 'badge-info'}`}><span className="material-symbols-outlined">{service.kind === 'product' ? 'inventory_2' : 'handyman'}</span>{service.kind === 'product' ? 'Product' : 'Service'}</span></td>
                    <td className="text-muted">{service.category}</td>
                    <td className="text-muted">{service.kind === 'product' ? '—' : `${service.durationMinutes} min`}</td>
                    <td><StatusBadge status={service.status === 'Active' ? 'Active' : 'Inactive'} /></td>
                    <td className="whitespace-nowrap text-right"><span className="font-semibold tabular-nums">{formatCurrency(service.price)}</span>{service.unit && <span className="block text-[11.5px] text-subtle">{service.unit}</span>}</td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => toggle(service)}>{service.status === 'Active' ? 'Hide' : 'Publish'}</button>
                        <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => open(service)} aria-label={`Edit ${service.name}`}><span className="material-symbols-outlined">edit</span></button>
                        <button type="button" className="btn btn-ghost btn-icon btn-sm hover:text-danger-fg" onClick={() => remove(service)} aria-label={`Delete ${service.name}`}><span className="material-symbols-outlined">delete</span></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState icon="storefront" title={q ? 'No matches' : `Publish your ${label.toLowerCase()}`} action={!q && <div className="flex flex-wrap justify-center gap-2">{fresh.length > 0 && <button type="button" className="btn btn-primary" disabled={adding} onClick={() => addSuggestions()}><span className="material-symbols-outlined">auto_awesome</span>Add {fresh.length} suggested for {templateData?.category || 'your business'}</button>}<button type="button" className="btn btn-secondary" onClick={() => open()}>Add my own</button></div>}>Customers can only book or order what you publish here.</EmptyState>}
      </section>

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing === 'new' ? `New ${label.toLowerCase().replace(/s$/, '')}` : `Edit ${form.name}`} description="Shown on your public profile and in the booking flow."
        footer={<><button type="button" className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button><button type="submit" form="service-form" className="btn btn-primary" disabled={saving}>{saving ? <><Spinner /> Saving</> : 'Save'}</button></>}>
        <form id="service-form" onSubmit={save} className="grid gap-4">
          <fieldset className="grid grid-cols-2 gap-2">
            {[['service', 'handyman', 'Service', 'Booked per job, visit or session'], ['product', 'inventory_2', 'Product', 'Ordered in quantities']].map(([value, icon, title, hint]) => (
              <button key={value} type="button" aria-pressed={(form.kind || 'service') === value} onClick={() => setForm((current) => ({ ...current, kind: value, unit: current.unit || (value === 'product' ? 'per item' : 'per visit') }))} className={`flex items-start gap-2.5 rounded-xl border p-3 text-left ${(form.kind || 'service') === value ? 'border-brand bg-brand-soft/50 ring-1 ring-brand' : 'border-line hover:border-line-strong'}`}>
                <span className="material-symbols-outlined text-brand-fg">{icon}</span><span><span className="block text-[13.5px] font-semibold">{title}</span><span className="block text-[12px] text-muted">{hint}</span></span>
              </button>
            ))}
          </fieldset>
          <label className="field"><span className="label">Name</span><input className="input" required value={form.name} onChange={update('name')} placeholder={form.kind === 'product' ? 'e.g. PlayStation 5 Slim, Chicken biryani (family)' : 'e.g. Pipe leak repair, Haircut & styling'} /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="field"><span className="label">Category</span><input className="input" required list="service-categories" value={form.category} onChange={update('category')} /><datalist id="service-categories">{categories.map((value) => <option key={value} value={value} />)}</datalist><span className="hint">Customers filter the marketplace by category.</span></label>
            <label className="field"><span className="label">Price (PKR)</span><input className="input" type="number" min="0" required value={form.price} onChange={update('price')} /></label>
            <label className="field"><span className="label">Price unit</span><input className="input" list="price-units" value={form.unit || ''} onChange={update('unit')} placeholder="per item" /><datalist id="price-units">{UNITS.map((value) => <option key={value} value={value} />)}</datalist></label>
            <label className="field"><span className="label">{form.kind === 'product' ? 'Preparation time (minutes)' : 'Duration (minutes)'}</span><input className="input" type="number" min="15" step="5" required value={form.durationMinutes} onChange={update('durationMinutes')} /></label>
            <label className="field"><span className="label">Visibility</span><select className="select" value={form.status} onChange={update('status')}><option value="Active">Published</option><option value="Inactive">Hidden</option></select></label>
          </div>
          <label className="field"><span className="label">Description</span><textarea className="textarea" rows={3} maxLength={800} value={form.description} onChange={update('description')} placeholder="What's included, what customers should prepare." /></label>
          <Alert>{formError}</Alert>
        </form>
      </Modal>

      <Modal open={suggestOpen} onClose={() => setSuggestOpen(false)} title={`Suggested for ${templateData?.category || 'your business'}`} description="Common offerings for your business type. Add them and edit prices any time." size="lg"
        footer={<><button type="button" className="btn btn-secondary" onClick={() => setSuggestOpen(false)}>Close</button><button type="button" className="btn btn-primary" disabled={adding || !picked.size} onClick={() => addSuggestions([...picked])}>{adding ? <><Spinner /> Adding</> : `Add ${picked.size || ''} selected`}</button></>}>
        {templates.length ? (
          <ul className="divide-y divide-line rounded-2xl border border-line">
            {templates.map((row) => (
              <li key={row.name}>
                <label className={`flex items-start gap-3 px-4 py-3 ${row.added ? 'opacity-60' : 'cursor-pointer hover:bg-sunken/50'}`}>
                  <input type="checkbox" className="checkbox mt-1" disabled={row.added} checked={row.added || picked.has(row.name)} onChange={(event) => setPicked((current) => { const next = new Set(current); if (event.target.checked) next.add(row.name); else next.delete(row.name); return next; })} />
                  <span className="min-w-0 flex-1"><span className="block text-[14px] font-semibold">{row.name}</span><span className="block text-[12.5px] text-muted">{row.description}</span></span>
                  <span className="text-right"><span className="block whitespace-nowrap text-[14px] font-semibold tabular-nums">{row.price ? formatCurrency(row.price) : 'Free'}</span><span className="block text-[11.5px] text-subtle">{row.added ? 'Already added' : `${row.kind === 'product' ? 'Product' : 'Service'} · ${row.unit}`}</span></span>
                </label>
              </li>
            ))}
          </ul>
        ) : <SkeletonRows rows={4} />}
      </Modal>
    </div>
  );
}
