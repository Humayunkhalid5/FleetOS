import { useMemo, useState } from 'react';
import api from '../../../services/api';
import { useLiveQuery } from '../../../hooks/useLiveQuery';
import { usePageChrome } from '../../../hooks/usePageChrome';
import { useFeedback } from '../../../hooks/useFeedback';
import { Alert, Avatar, EmptyState, Modal, SkeletonRows, Spinner, StatCard, StatusBadge } from '../../../components/ui';
import { downloadCsv, formatCurrency, formatDate } from '../../../utils/helpers';

const blank = () => ({ name: '', email: '', phone: '', address: '', status: 'Active' });

export default function CompanyCustomers() {
  const { confirm, toast } = useFeedback();
  const { data, error, loading, refresh } = useLiveQuery('/customers', { events: ['booking:created', 'booking:updated'] });
  const customers = useMemo(() => data?.customers || [], [data]);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const q = search.trim().toLowerCase();
  const list = q ? customers.filter((customer) => [customer.name, customer.email, customer.phone, customer.customerId].some((value) => String(value || '').toLowerCase().includes(q))) : customers;
  const revenue = customers.reduce((sum, customer) => sum + Number(customer.totalSpent || 0), 0);
  const repeat = customers.filter((customer) => Number(customer.totalBookings || 0) > 1).length;

  const open = (customer = null) => { setEditing(customer || 'new'); setForm(customer ? { ...blank(), ...customer } : blank()); setFormError(''); };
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError('');
    const payload = { name: form.name, email: form.email, phone: form.phone, address: form.address, status: form.status };
    try {
      if (editing === 'new') await api.post('/customers', payload); else await api.put(`/customers/${editing._id}`, payload);
      toast.success(`${form.name} saved`);
      setEditing(null);
    } catch (requestError) { setFormError(requestError.message); }
    finally { setSaving(false); }
  };
  const remove = async (customer) => {
    const ok = await confirm({ title: `Remove ${customer.name}?`, message: 'This removes them from your directory. Their bookings and payments are kept.', confirmLabel: 'Remove', tone: 'danger' });
    if (!ok) return;
    try { await api.del(`/customers/${customer._id}`); toast.success(`${customer.name} removed`); }
    catch (requestError) { toast.error(requestError.message); }
  };
  const exportCsv = () => downloadCsv('fleetos-customers.csv', [['Account', 'Name', 'Email', 'Phone', 'Bookings', 'Completed', 'Spent (PKR)', 'Last booking', 'Status'], ...customers.map((customer) => [customer.customerId, customer.name, customer.email, customer.phone, customer.totalBookings || 0, customer.totalJobs || 0, customer.totalSpent || 0, formatDate(customer.lastBookingAt), customer.status])]);

  usePageChrome({
    title: 'Customers',
    subtitle: 'Everyone who has booked with you, with live job and spend totals.',
    search,
    onSearch: setSearch,
    actions: <>
      <button type="button" className="btn btn-secondary" onClick={exportCsv}><span className="material-symbols-outlined">download</span>Export</button>
      <button type="button" className="btn btn-primary" onClick={() => open()}><span className="material-symbols-outlined">person_add</span>Add customer</button>
    </>,
  });

  return (
    <div className="grid gap-5">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3">
        <StatCard icon="groups" label="Customers" value={customers.length} tone="brand" />
        <StatCard icon="repeat" label="Repeat customers" value={repeat} hint={customers.length ? `${Math.round((repeat / customers.length) * 100)}% of all customers` : ''} tone="violet" />
        <StatCard icon="payments" label="Lifetime revenue" value={formatCurrency(revenue)} tone="success" />
      </div>
      <Alert onRetry={refresh}>{error && !data ? error.message : ''}</Alert>
      <section className="card overflow-hidden">
        {loading ? <div className="p-5"><SkeletonRows rows={5} /></div> : list.length ? (
          <div className="overflow-x-auto">
            <table className="table min-w-[900px]">
              <thead><tr><th>Customer</th><th>Contact</th><th className="text-right">Bookings</th><th className="text-right">Completed</th><th className="text-right">Spent</th><th>Last booking</th><th>Status</th><th /></tr></thead>
              <tbody>
                {list.map((customer) => (
                  <tr key={customer._id}>
                    <td><div className="flex items-center gap-3"><Avatar name={customer.name} size={34} /><div><p className="font-semibold">{customer.name}</p><p className="font-mono text-[11.5px] text-subtle">{customer.customerId}</p></div></div></td>
                    <td><p>{customer.email || '—'}</p><p className="text-[12px] text-subtle">{customer.phone || 'No phone'}</p></td>
                    <td className="text-right tabular-nums">{customer.totalBookings || 0}</td>
                    <td className="text-right tabular-nums">{customer.totalJobs || 0}</td>
                    <td className="whitespace-nowrap text-right font-semibold tabular-nums">{formatCurrency(customer.totalSpent)}</td>
                    <td className="text-muted">{formatDate(customer.lastBookingAt)}</td>
                    <td><StatusBadge status={customer.status || 'Active'} /></td>
                    <td><div className="flex justify-end gap-1"><button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => open(customer)} aria-label={`Edit ${customer.name}`}><span className="material-symbols-outlined">edit</span></button><button type="button" className="btn btn-ghost btn-icon btn-sm hover:text-danger-fg" onClick={() => remove(customer)} aria-label={`Remove ${customer.name}`}><span className="material-symbols-outlined">delete</span></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState icon="groups" title={q ? 'No matching customers' : 'No customers yet'}>{q ? 'Try a name, email, phone or account number.' : 'Customers are added automatically when they book, or you can add one yourself.'}</EmptyState>}
      </section>

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing === 'new' ? 'Add customer' : `Edit ${form.name}`}
        footer={<><button type="button" className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button><button type="submit" form="customer-form" className="btn btn-primary" disabled={saving}>{saving ? <><Spinner /> Saving</> : 'Save'}</button></>}>
        <form id="customer-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <label className="field sm:col-span-2"><span className="label">Full name</span><input className="input" required value={form.name} onChange={update('name')} /></label>
          <label className="field"><span className="label">Email</span><input className="input" type="email" value={form.email} onChange={update('email')} /></label>
          <label className="field"><span className="label">Phone</span><input className="input" type="tel" value={form.phone} onChange={update('phone')} /></label>
          <label className="field sm:col-span-2"><span className="label">Address</span><input className="input" value={form.address} onChange={update('address')} /></label>
          <label className="field"><span className="label">Status</span><select className="select" value={form.status} onChange={update('status')}><option>Active</option><option>Inactive</option></select></label>
          <div className="sm:col-span-2"><Alert>{formError}</Alert></div>
        </form>
      </Modal>
    </div>
  );
}
