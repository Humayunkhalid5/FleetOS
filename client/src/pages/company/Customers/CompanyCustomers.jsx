import { useEffect, useMemo, useState } from 'react';
import api from '../../../services/api';
import CompanyShell from '../../../components/company/CompanyShell';

function formatMoney(value) {
  return `PKR ${Number(value || 0).toLocaleString('en-PK')}`;
}

function CompanyCustomers() {
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    api.get('/customers', { noCache: true })
      .then((data) => {
        if (mounted) setCustomers(Array.isArray(data?.customers) ? data.customers : []);
      })
      .catch((requestError) => {
        if (mounted) setError(requestError.message || 'Customers could not be loaded.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter((customer) => [customer.name, customer.email, customer.phone, customer.customerId]
      .some((value) => String(value || '').toLowerCase().includes(term)));
  }, [customers, search]);

  const removeCustomer = async (customer) => {
    if (!window.confirm(`Remove ${customer.name || 'this customer'} from the company directory?`)) return;
    setError('');
    try {
      await api.del(`/customers/${customer._id}`);
      setCustomers((current) => current.filter((item) => item._id !== customer._id));
    } catch (requestError) {
      setError(requestError.message || 'Customer could not be removed.');
    }
  };

  return (
    <CompanyShell
      title="Customers"
      subtitle="Review the clients connected to active and completed company work."
      search={search}
      onSearch={setSearch}
      actions={<span className="text-xs font-semibold text-slate-500">{customers.length} account{customers.length === 1 ? '' : 's'}</span>}
    >
      {error && <div role="alert" className="mb-5 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div>}

      <section className="overflow-hidden rounded-3xl bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)]">
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                <th className="px-6 py-4">Account</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Completed jobs</th>
                <th className="px-6 py-4">Total spend</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((customer) => (
                <tr key={customer._id} className="transition-colors hover:bg-slate-50/70">
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">{customer.customerId || customer._id}</td>
                  <td className="px-6 py-4 font-bold text-slate-900">{customer.name || 'Client'}</td>
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-700">{customer.email || 'No email'}</p>
                    <p className="mt-1 text-xs text-slate-500">{customer.phone || 'No phone'}</p>
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-700">{Number(customer.totalJobs || 0)}</td>
                  <td className="px-6 py-4 font-bold text-slate-900">{formatMoney(customer.totalSpent)}</td>
                  <td className="px-6 py-4"><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{customer.status || 'Active'}</span></td>
                  <td className="px-6 py-4 text-right">
                    <button type="button" onClick={() => removeCustomer(customer)} className="rounded-xl px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && filtered.length === 0 && (
          <div className="px-6 py-16 text-center">
            <span className="material-symbols-outlined text-4xl text-slate-300">groups</span>
            <h2 className="mt-3 text-base font-bold text-slate-900">{search ? 'No matching customers' : 'No customers recorded'}</h2>
            <p className="mt-1 text-sm text-slate-500">{search ? 'Try a different name, email, phone, or account number.' : 'Clients appear here automatically as they place service requests.'}</p>
          </div>
        )}
        {loading && <div className="px-6 py-16 text-center text-sm font-semibold text-slate-500">Loading customers…</div>}
      </section>
    </CompanyShell>
  );
}

export default CompanyCustomers;
