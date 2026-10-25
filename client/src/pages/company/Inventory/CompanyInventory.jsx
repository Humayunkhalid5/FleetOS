import { useMemo, useState } from 'react';
import api from '../../../services/api';
import { useLiveQuery, setQueryData } from '../../../hooks/useLiveQuery';
import { usePageChrome } from '../../../hooks/usePageChrome';
import { useFeedback } from '../../../hooks/useFeedback';
import { useWorkspace } from '../../../components/company/workspace';
import { Alert, EmptyState, Modal, SkeletonRows, Spinner, StatCard, StatusBadge } from '../../../components/ui';
import { downloadCsv, formatCurrency } from '../../../utils/helpers';

const blank = (category = '') => ({ name: '', sku: '', category, qty: 0, threshold: 5, unitCost: 0, unitPrice: 0, unit: 'Units' });
const stockStatus = (item) => (Number(item.qty ?? item.quantity) <= 0 ? 'Out of stock' : Number(item.qty ?? item.quantity) <= Number(item.threshold ?? item.reorderLevel) ? 'Low stock' : 'In stock');

export default function CompanyInventory() {
  const { workspace } = useWorkspace();
  const { confirm, toast } = useFeedback();
  const label = workspace.inventoryLabel || 'Inventory';
  const { data, error, loading, refresh } = useLiveQuery('/inventory', { events: ['workspace:updated', 'booking:created'] });
  const items = useMemo(() => data?.inventory || [], [data]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [onlyLow, setOnlyLow] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const categories = [...new Set([...(workspace.inventoryCategories || []), ...items.map((item) => item.category)].filter(Boolean))];

  const q = query.trim().toLowerCase();
  const list = items.filter((item) => (!category || item.category === category) && (!onlyLow || stockStatus(item) !== 'In stock') && (!q || [item.name, item.sku, item.category].some((value) => String(value || '').toLowerCase().includes(q))));
  const low = items.filter((item) => stockStatus(item) !== 'In stock').length;
  const value = items.reduce((sum, item) => sum + Number(item.qty || 0) * Number(item.unitCost || 0), 0);

  const open = (item = null) => { setEditing(item || 'new'); setForm(item ? { ...blank(), ...item } : blank(categories[0])); setFormError(''); };
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.type === 'number' ? Number(event.target.value) : event.target.value }));

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError('');
    const payload = { name: form.name, sku: form.sku || undefined, category: form.category, qty: form.qty, threshold: form.threshold, unitCost: form.unitCost, unitPrice: form.unitPrice, unit: form.unit };
    try {
      if (editing === 'new') await api.post('/inventory', payload); else await api.put(`/inventory/${editing._id}`, payload);
      toast.success(`${form.name} saved`);
      setEditing(null);
    } catch (requestError) { setFormError(requestError.message); }
    finally { setSaving(false); }
  };

  const adjust = async (item, delta) => {
    const qty = Math.max(0, Number(item.qty || 0) + delta);
    setQueryData('/inventory', (current) => current && { ...current, inventory: current.inventory.map((entry) => (entry._id === item._id ? { ...entry, qty, quantity: qty } : entry)) });
    try { await api.put(`/inventory/${item._id}`, { qty }); }
    catch (requestError) { toast.error(requestError.message); refresh(); }
  };

  const remove = async (item) => {
    const ok = await confirm({ title: `Delete ${item.name}?`, message: 'It will no longer be offered as an add-on during booking.', confirmLabel: 'Delete', tone: 'danger' });
    if (!ok) return;
    try { await api.del(`/inventory/${item._id}`); toast.success(`${item.name} deleted`); }
    catch (requestError) { toast.error(requestError.message); }
  };

  const exportCsv = () => downloadCsv('fleetos-inventory.csv', [['SKU', 'Name', 'Category', 'Quantity', 'Reorder level', 'Unit cost', 'Customer price', 'Status'], ...items.map((item) => [item.sku, item.name, item.category, item.qty, item.threshold, item.unitCost, item.unitPrice, stockStatus(item)])]);

  usePageChrome({
    title: label,
    subtitle: 'Stock your team uses and add-ons customers can choose when booking.',
    search: query,
    onSearch: setQuery,
    actions: <>
      <button type="button" className="btn btn-secondary" onClick={exportCsv}><span className="material-symbols-outlined">download</span>Export</button>
      <button type="button" className="btn btn-primary" onClick={() => open()}><span className="material-symbols-outlined">add</span>Add item</button>
    </>,
  });

  return (
    <div className="grid gap-5">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3">
        <StatCard icon="inventory_2" label="Items" value={items.length} tone="brand" />
        <StatCard icon="warning" label="Low or out of stock" value={low} tone={low ? 'warning' : 'success'} onClick={() => setOnlyLow((current) => !current)} hint={onlyLow ? 'Showing only these — click to show all' : 'Click to filter'} />
        <StatCard icon="account_balance" label="Stock value (cost)" value={formatCurrency(value)} tone="info" />
      </div>

      <div className="hide-scrollbar edge-fade flex gap-2 overflow-x-auto">
        <button type="button" className="chip" aria-pressed={!category} onClick={() => setCategory('')}>All categories</button>
        {categories.map((entry) => <button key={entry} type="button" className="chip" aria-pressed={category === entry} onClick={() => setCategory(entry)}>{entry}</button>)}
      </div>

      <Alert onRetry={refresh}>{error && !data ? error.message : ''}</Alert>
      <section className="card overflow-hidden">
        {loading ? <div className="p-5"><SkeletonRows rows={5} /></div> : list.length ? (
          <div className="overflow-x-auto">
            <table className="table min-w-[900px]">
              <thead><tr><th>Item</th><th>Category</th><th>Stock</th><th>Status</th><th className="text-right">Cost</th><th className="text-right">Customer price</th><th className="text-right">Actions</th></tr></thead>
              <tbody>
                {list.map((item) => (
                  <tr key={item._id}>
                    <td><p className="font-semibold">{item.name}</p><p className="font-mono text-[11.5px] text-subtle">{item.sku}</p></td>
                    <td className="text-muted">{item.category}</td>
                    <td>
                      <div className="inline-flex items-center gap-1 rounded-xl border border-line p-0.5">
                        <button type="button" className="btn btn-ghost btn-icon btn-sm h-7 w-7" disabled={!Number(item.qty)} onClick={() => adjust(item, -1)} aria-label="Decrease"><span className="material-symbols-outlined">remove</span></button>
                        <span className="min-w-[44px] text-center text-[13.5px] font-semibold tabular-nums">{item.qty} <span className="text-[11px] font-normal text-subtle">{item.unit}</span></span>
                        <button type="button" className="btn btn-ghost btn-icon btn-sm h-7 w-7" onClick={() => adjust(item, 1)} aria-label="Increase"><span className="material-symbols-outlined">add</span></button>
                      </div>
                    </td>
                    <td><StatusBadge status={stockStatus(item)} /></td>
                    <td className="text-right tabular-nums text-muted">{formatCurrency(item.unitCost)}</td>
                    <td className="whitespace-nowrap text-right font-semibold tabular-nums">{formatCurrency(item.unitPrice)}</td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => open(item)} aria-label={`Edit ${item.name}`}><span className="material-symbols-outlined">edit</span></button>
                        <button type="button" className="btn btn-ghost btn-icon btn-sm hover:text-danger-fg" onClick={() => remove(item)} aria-label={`Delete ${item.name}`}><span className="material-symbols-outlined">delete</span></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState icon="inventory_2" title={q || category || onlyLow ? 'Nothing matches' : 'No items yet'} action={!q && !category && !onlyLow && <button type="button" className="btn btn-primary" onClick={() => open()}>Add item</button>}>Items with a customer price can be added to bookings as extras.</EmptyState>}
      </section>

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} size="lg" title={editing === 'new' ? 'New item' : `Edit ${form.name}`}
        footer={<><button type="button" className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button><button type="submit" form="inventory-form" className="btn btn-primary" disabled={saving}>{saving ? <><Spinner /> Saving</> : 'Save'}</button></>}>
        <form id="inventory-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <label className="field sm:col-span-2"><span className="label">Item name</span><input className="input" required value={form.name} onChange={update('name')} /></label>
          <label className="field"><span className="label">Category</span><input className="input" required list="inventory-categories" value={form.category} onChange={update('category')} /><datalist id="inventory-categories">{categories.map((entry) => <option key={entry} value={entry} />)}</datalist><span className="hint">Matching a service category shows it as an add-on for that service.</span></label>
          <label className="field"><span className="label">SKU <span className="font-normal text-subtle">(optional)</span></span><input className="input font-mono uppercase" value={form.sku} onChange={update('sku')} placeholder="Auto-generated" /></label>
          <label className="field"><span className="label">Quantity</span><input className="input" type="number" min="0" required value={form.qty} onChange={update('qty')} /></label>
          <label className="field"><span className="label">Low-stock alert at</span><input className="input" type="number" min="0" required value={form.threshold} onChange={update('threshold')} /></label>
          <label className="field"><span className="label">Unit cost (PKR)</span><input className="input" type="number" min="0" required value={form.unitCost} onChange={update('unitCost')} /></label>
          <label className="field"><span className="label">Customer price (PKR)</span><input className="input" type="number" min="0" required value={form.unitPrice} onChange={update('unitPrice')} /></label>
          <label className="field"><span className="label">Unit</span><input className="input" value={form.unit} onChange={update('unit')} placeholder="Units, litres, boxes…" /></label>
          <div className="sm:col-span-2"><Alert>{formError}</Alert></div>
        </form>
      </Modal>
    </div>
  );
}
