import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
// The admin app shares the client's dependency runtime (see package.json scripts).
import { io } from '../../client/node_modules/socket.io-client/dist/socket.io.esm.min.js';
import { DataTable, Empty, Icon, Logo, LogoMark, Modal, Skeleton, Status, ToastProvider, useToast } from './ui.jsx';

/* ------------------------------------------------------------------ setup */
const SECTIONS = [
  ['Platform', [
    ['overview', 'space_dashboard', 'Overview'],
    ['requests', 'approval', 'Registration requests'],
    ['companies', 'domain', 'Companies'],
    ['removal', 'gpp_maybe', 'Access & listing'],
  ]],
  ['Operations', [
    ['bookings', 'work', 'Jobs'],
    ['payments', 'payments', 'Finance'],
    ['reviews', 'star', 'Ratings & reviews'],
    ['users', 'group', 'Users'],
    ['support', 'support_agent', 'Support'],
  ]],
  ['System', [
    ['health', 'monitor_heart', 'System health'],
    ['reports', 'lab_profile', 'Reports'],
    ['settings', 'shield_person', 'Security settings'],
  ]],
];
const FLAT = SECTIONS.flatMap(([, items]) => items);
const DESCRIPTIONS = {
  overview: 'Platform activity across every company',
  requests: 'Review documents before a company goes live',
  companies: 'Every registered company and its approval state',
  removal: 'Control portal access and marketplace visibility',
  bookings: 'All jobs across the platform',
  payments: 'Recorded revenue and the payment ledger',
  reviews: 'Published customer feedback',
  users: 'Customer and company accounts',
  support: 'Messages from the public contact form and users',
  health: 'Database, API and live-update status',
  reports: 'Platform KPIs and full data exports',
  settings: 'Your Super Admin sign-in identity',
};
const IDS = new Set(FLAT.map(([id]) => id));
const ENDPOINT = { overview: '/overview', health: '/overview', reports: '/overview', requests: '/requests', companies: '/companies', removal: '/companies', bookings: '/bookings', payments: '/payments', reviews: '/reviews', users: '/users', support: '/support' };
const TOKEN_KEY = 'fleetos-admin-token';
const store = (method, key, value) => { try { return method === 'get' ? localStorage.getItem(key) : method === 'set' ? localStorage.setItem(key, value) : localStorage.removeItem(key); } catch { return null; } };

const apiBase = () => (import.meta.env.VITE_ADMIN_API_URL || import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
async function api(path, options = {}) {
  const base = apiBase();
  const url = base ? (base.endsWith('/api') ? `${base}/admin${path}` : `${base}/api/admin${path}`) : `/api/admin${path}`;
  let response;
  try {
    response = await fetch(url, { credentials: 'include', ...options, headers: { 'Content-Type': 'application/json', ...(store('get', TOKEN_KEY) ? { Authorization: `Bearer ${store('get', TOKEN_KEY)}` } : {}), ...(options.headers || {}) } });
  } catch { throw new Error('Cannot reach the FleetOS server.'); }
  const data = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) { const error = new Error(data?.message || `Request failed (${response.status})`); error.status = response.status; throw error; }
  return data;
}

const money = (value) => `PKR ${Number(value || 0).toLocaleString('en-PK')}`;
const date = (value) => (value ? new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—');
const initials = (name) => String(name || '?').split(' ').filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase();

function downloadCsv(kind, rows = [], columns) {
  if (!rows.length) return;
  const cols = columns || Object.keys(rows[0]).filter((key) => !['__v', 'businessLicense', 'logo', 'heroImage'].includes(key)).map((key) => [key, (row) => row[key]]);
  const csv = [cols.map(([label]) => label), ...rows.map((row) => cols.map(([, get]) => { const value = get(row); return typeof value === 'object' && value !== null ? JSON.stringify(value) : value; }))]
    .map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `fleetos-${kind}-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ------------------------------------------------------------------ theme */
function useTheme() {
  const [theme, setThemeState] = useState(() => document.documentElement.getAttribute('data-theme') || 'light');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#060B15' : '#F4F7FA');
  }, [theme]);
  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.classList.add('theme-transition');
    window.setTimeout(() => document.documentElement.classList.remove('theme-transition'), 400);
    store('set', 'fleetos-admin-theme', next);
    setThemeState(next);
  };
  return [theme, toggle];
}

/* ------------------------------------------------------------------ login */
const PASSWORD_RULES = [
  ['8+ characters', (value) => value.length >= 8],
  ['A letter', (value) => /[A-Za-z]/.test(value)],
  ['A number', (value) => /\d/.test(value)],
];

function PasswordInput({ label, value, onChange, autoComplete, autoFocus }) {
  const [shown, setShown] = useState(false);
  return (
    <label className="field">
      <span className="label">{label}</span>
      <span className="password">
        <input className="input" type={shown ? 'text' : 'password'} value={value} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} autoFocus={autoFocus} required />
        <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => setShown((current) => !current)} aria-label={shown ? 'Hide password' : 'Show password'}><Icon name={shown ? 'visibility_off' : 'visibility'} /></button>
      </span>
    </label>
  );
}

function Login({ onLogin }) {
  const toast = useToast();
  const [mode, setMode] = useState('signin');
  const [form, setForm] = useState({ email: '', password: '', newPassword: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);
  const set = (key) => (value) => setForm((current) => ({ ...current, [key]: typeof value === 'string' ? value : value.target.value }));
  const changing = mode === 'change';
  const mismatch = changing && form.confirmPassword && form.confirmPassword !== form.newPassword;

  const switchMode = (next) => { setMode(next); setError(''); setTried(false); setForm((current) => ({ ...current, password: '', newPassword: '', confirmPassword: '' })); };

  const submit = async (event) => {
    event.preventDefault();
    if (changing) {
      setTried(true);
      const missing = PASSWORD_RULES.filter(([, test]) => !test(form.newPassword)).map(([label]) => label.toLowerCase());
      if (missing.length) { setError(`The new password needs ${missing.join(', ')}.`); return; }
      if (form.newPassword !== form.confirmPassword) { setError('The new password and confirmation do not match.'); return; }
      if (form.newPassword === form.password) { setError('Choose a password different from the current one.'); return; }
    }
    setBusy(true);
    setError('');
    try {
      const result = changing
        ? await api('/auth/change-password', { method: 'POST', body: JSON.stringify({ email: form.email, currentPassword: form.password, newPassword: form.newPassword }) })
        : await api('/auth/login', { method: 'POST', body: JSON.stringify({ email: form.email, password: form.password }) });
      if (result.token) store('set', TOKEN_KEY, result.token);
      if (changing) toast('Password changed. Other admin sessions were signed out.');
      onLogin(result.user);
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  };

  return (
    <main className="login">
      <form className="login-form" onSubmit={submit} key={mode}>
        <Logo />
        <h1>{changing ? 'Change admin password' : 'Super Admin sign in'}</h1>
        <p>{changing ? 'Confirm your current password, then choose a new one. It is saved to the database and replaces the old one right away.' : 'Sign in to review companies, jobs and payments.'}</p>
        <label className="field"><span className="label">Email</span><input className="input" type="email" value={form.email} onChange={set('email')} autoComplete="username" required autoFocus /></label>
        <PasswordInput label={changing ? 'Current password' : 'Password'} value={form.password} onChange={set('password')} autoComplete="current-password" />
        {changing && (
          <>
            <PasswordInput label="New password" value={form.newPassword} onChange={set('newPassword')} autoComplete="new-password" />
            <ul className="rules" aria-label="Password rules">
              {PASSWORD_RULES.map(([label, test]) => <li key={label} className={test(form.newPassword) ? 'ok' : tried ? 'missing' : ''}><Icon name={test(form.newPassword) ? 'check_circle' : 'radio_button_unchecked'} />{label}</li>)}
            </ul>
            <PasswordInput label="Confirm new password" value={form.confirmPassword} onChange={set('confirmPassword')} autoComplete="new-password" />
            {mismatch && <p className="hint-error"><Icon name="error" />Passwords do not match</p>}
          </>
        )}
        {error && <p className="alert"><Icon name="error" />{error}</p>}
        <button className="btn btn-primary" style={{ height: 44 }} disabled={busy}>{busy ? 'Please wait…' : changing ? 'Change password' : 'Sign in'}</button>
        <button type="button" className="btn btn-ghost login-switch" onClick={() => switchMode(changing ? 'signin' : 'change')}>
          <Icon name={changing ? 'arrow_back' : 'key'} />{changing ? 'Back to sign in' : 'Change password'}
        </button>
      </form>
      <aside className="login-aside" aria-hidden="true">
        <div className="login-stack">
          {[['approval', 'Registration requests', 'tone-warning'], ['work', 'Jobs', 'tone-info'], ['payments', 'Finance', 'tone-success'], ['star', 'Ratings & reviews', 'tone-violet']].map(([icon, label, tone], index) => (
            <div key={label} className="login-tile" style={{ '--i': index }}>
              <span className={`metric-icon ${tone}`}><Icon name={icon} fill /></span>
              <b>{label}</b>
              <i />
            </div>
          ))}
        </div>
        <div>
          <LogoMark size={36} />
          <h2>FleetOS admin console</h2>
          <p>Companies, jobs, payments and support in one place.</p>
        </div>
      </aside>
    </main>
  );
}

/* --------------------------------------------------------------- sections */
function Metric({ icon, label, value, hint, tone = 'brand', onClick }) {
  return (
    <button type="button" className="card metric" onClick={onClick} style={{ textAlign: 'left', cursor: onClick ? 'pointer' : 'default', border: '1px solid rgb(var(--line))' }}>
      <span className="metric-top">{label}<span className={`metric-icon tone-${tone}`}><Icon name={icon} fill /></span></span>
      <span><b>{value}</b>{hint && <small style={{ display: 'block', marginTop: 4 }}>{hint}</small>}</span>
    </button>
  );
}

function Overview({ data, go, mutate }) {
  const metrics = data.metrics || {};
  const counts = data.bookingCounts || [];
  const maxCount = Math.max(1, ...counts.map((row) => row.count));
  const trend = (data.revenueTrend || []).map((row) => ({ label: new Date(row._id.year, row._id.month - 1).toLocaleDateString('en-PK', { month: 'short' }), value: row.amount }));
  const maxTrend = Math.max(1, ...trend.map((row) => row.value));
  return (
    <>
      <div className="metrics">
        <Metric icon="domain" label="Companies" value={metrics.companies || 0} hint={`${(data.pendingCompanies || []).length} awaiting review`} onClick={() => go('companies')} />
        <Metric icon="person" label="Customers" value={metrics.customers || 0} tone="violet" onClick={() => go('users')} />
        <Metric icon="work" label="Jobs" value={metrics.jobs || 0} hint={`${metrics.activeTechnicians || 0} staff active`} tone="info" onClick={() => go('bookings')} />
        <Metric icon="payments" label="Recorded revenue" value={money(metrics.revenue)} hint={`${metrics.payments || 0} payments`} tone="success" onClick={() => go('payments')} />
        <Metric icon="star" label="Average rating" value={Number(metrics.averageRating || 0).toFixed(1)} hint={`${metrics.reviews || 0} reviews · ${metrics.openSupport || 0} open tickets`} tone="warning" onClick={() => go('reviews')} />
      </div>
      <div className="grid-2">
        <section className="card">
          <header className="card-header"><div><h2>Revenue trend</h2><p>Recorded payments by month</p></div></header>
          {trend.length ? (
            <div className="chart">
              {trend.map((row) => <button key={row.label} type="button" aria-label={`${row.label}: ${money(row.value)}`}><i style={{ height: `${Math.max(3, (row.value / maxTrend) * 100)}%` }} /><em>{money(row.value)}</em><span>{row.label}</span></button>)}
            </div>
          ) : <Empty icon="monitoring" title="No payments recorded yet" />}
        </section>
        <section className="card">
          <header className="card-header"><div><h2>Waiting for approval</h2><p>Oldest first</p></div><button type="button" className="btn btn-secondary btn-sm" onClick={() => go('requests')}>Open queue</button></header>
          {(data.pendingCompanies || []).length ? (
            <ul className="list">
              {data.pendingCompanies.map((company) => (
                <li key={company._id}>
                  <span className="avatar">{initials(company.name)}</span>
                  <span className="grow"><b>{company.name}</b><small>{company.city} · {date(company.createdAt)}</small></span>
                  <button type="button" className="btn btn-success btn-sm" onClick={() => mutate(`/companies/${company._id}/status`, { status: 'approved', version: company.approvalVersion }, { title: `Approve ${company.name}?`, message: 'The company becomes visible to customers and its workspace opens immediately.', confirm: 'Approve' })}>Approve</button>
                </li>
              ))}
            </ul>
          ) : <Empty icon="task_alt" title="Queue is empty">New registrations will show up here.</Empty>}
        </section>
      </div>
      <div className="grid-2">
        <DataTable
          title="Recent jobs"
          headers={['Job', 'Company', 'Status', 'Total']}
          rows={data.recentBookings || []}
          renderRow={(booking) => <tr key={booking._id}><td><b>{booking.serviceSnapshot?.name}</b><small className="mono">{booking.reference}</small></td><td>{booking.company?.name}<small>{booking.customerName}</small></td><td><Status value={booking.status} /></td><td className="num">{money(booking.pricing?.finalTotal)}</td></tr>}
        />
        <section className="card">
          <header className="card-header"><div><h2>Job pipeline</h2><p>All companies</p></div></header>
          <div className="bars">
            {counts.length ? counts.map((row) => <div className="bar-row" key={row._id}><span>{row._id}</span><span className="bar-track"><i style={{ width: `${(row.count / maxCount) * 100}%` }} /></span><b>{row.count}</b></div>) : <Empty icon="work" title="No jobs yet" />}
          </div>
        </section>
      </div>
    </>
  );
}

function Requests({ data, mutate, openDocument }) {
  return (
    <DataTable
      title="Registration requests"
      subtitle="Review each company's license before approving."
      headers={['Company', 'Owner', 'City', 'Document', 'Submitted', 'Status', '']}
      rows={data.companies || []}
      searchKeys={(company) => [company.name, company.email, company.city, company.owner?.name]}
      empty="No registrations waiting"
      emptyIcon="task_alt"
      actions={<button type="button" className="btn btn-secondary btn-sm" onClick={() => downloadCsv('company-requests', data.companies)}><Icon name="download" />Export</button>}
      renderRow={(company) => (
        <tr key={company._id}>
          <td><b>{company.name}</b><small>{company.email}</small></td>
          <td>{company.owner?.name || '—'}<small>{company.owner?.email}</small></td>
          <td>{company.city || '—'}</td>
          <td><button type="button" className="btn btn-secondary btn-sm" onClick={() => openDocument(company)}><Icon name="description" />View license</button></td>
          <td className="date">{date(company.createdAt)}</td>
          <td><Status value={company.approvalStatus} /></td>
          <td>
            <div className="actions">
              <button type="button" className="btn btn-success btn-sm" onClick={() => mutate(`/companies/${company._id}/status`, { status: 'approved', version: company.approvalVersion }, { title: `Approve ${company.name}?`, message: 'The company becomes visible to customers and its workspace opens immediately.', confirm: 'Approve' })}>Approve</button>
              {company.approvalStatus !== 'rejected' && <button type="button" className="btn btn-danger btn-sm" onClick={() => mutate(`/companies/${company._id}/status`, { status: 'rejected', version: company.approvalVersion }, { title: `Reject ${company.name}?`, message: 'The owner is notified and their sessions are signed out.', confirm: 'Reject', danger: true })}>Reject</button>}
            </div>
          </td>
        </tr>
      )}
    />
  );
}

function Visibility({ company }) {
  return company.clientVisible ? <Status value="visible" /> : <span className="badge badge-neutral"><Icon name="visibility_off" />{company.approvalStatus === 'approved' ? (company.clientListed === false ? 'Unlisted' : 'Owner blocked') : 'Not approved'}</span>;
}

function Companies({ data, mutate }) {
  return (
    <DataTable
      title="Company registry"
      headers={['Company', 'Owner', 'City', 'Approval', 'Customer visibility', 'Rating', '']}
      rows={data.companies || []}
      searchKeys={(company) => [company.name, company.email, company.city, company.owner?.name, company.approvalStatus]}
      actions={<button type="button" className="btn btn-secondary btn-sm" onClick={() => downloadCsv('companies', data.companies)}><Icon name="download" />Export</button>}
      renderRow={(company) => (
        <tr key={company._id}>
          <td><b>{company.name}</b><small>{company.email}</small></td>
          <td>{company.owner?.name || '—'}<small>{company.owner?.email}</small></td>
          <td>{company.city}</td>
          <td><Status value={company.approvalStatus} /></td>
          <td><Visibility company={company} /></td>
          <td className="num">{Number(company.rating || 0).toFixed(1)} <span className="subtle">({company.reviewCount || 0})</span></td>
          <td><div className="actions">{company.approvalStatus === 'approved'
            ? <button type="button" className="btn btn-danger btn-sm" onClick={() => mutate(`/companies/${company._id}/status`, { status: 'suspended', version: company.approvalVersion }, { title: `Suspend ${company.name}?`, message: 'The company disappears from the marketplace and its team is signed out.', confirm: 'Suspend', danger: true })}>Suspend</button>
            : <button type="button" className="btn btn-success btn-sm" onClick={() => mutate(`/companies/${company._id}/status`, { status: 'approved', version: company.approvalVersion }, { title: `Approve ${company.name}?`, message: 'The company becomes visible to customers.', confirm: 'Approve' })}>Approve</button>}</div></td>
        </tr>
      )}
    />
  );
}

function Access({ data, mutate }) {
  return (
    <DataTable
      title="Access and marketplace listing"
      subtitle="Suspending blocks the owner's portal. Unlisting only hides the company from customers and keeps its records."
      headers={['Company', 'Owner account', 'Marketplace', 'Portal access', '']}
      rows={data.companies || []}
      searchKeys={(company) => [company.name, company.email, company.city, company.owner?.name]}
      renderRow={(company) => (
        <tr key={company._id}>
          <td><b>{company.name}</b><small>{company.city} · {company.email}</small></td>
          <td>{company.owner?.name || '—'}<small>{company.owner?.email}</small></td>
          <td><Visibility company={company} /></td>
          <td><Status value={company.owner?.status || 'suspended'} /></td>
          <td>
            <div className="actions">
              {company.owner?.status === 'active'
                ? <button type="button" className="btn btn-danger btn-sm" onClick={() => mutate(`/companies/${company._id}/status`, { status: 'suspended', version: company.approvalVersion }, { title: `Block ${company.name}'s portal?`, message: 'Their team is signed out and the company is hidden.', confirm: 'Block access', danger: true })}>Block access</button>
                : <button type="button" className="btn btn-success btn-sm" onClick={() => mutate(`/companies/${company._id}/status`, { status: 'approved', version: company.approvalVersion }, { title: `Restore ${company.name}?`, message: 'The owner can sign in again and the company is approved.', confirm: 'Restore access' })}>Restore access</button>}
              {company.clientListed !== false
                ? <button type="button" className="btn btn-secondary btn-sm" onClick={() => mutate(`/companies/${company._id}/listing`, { clientListed: false }, { title: `Unlist ${company.name}?`, message: 'Customers can no longer find or book this company. Its workspace keeps working.', confirm: 'Unlist' })}>Unlist</button>
                : <button type="button" className="btn btn-secondary btn-sm" onClick={() => mutate(`/companies/${company._id}/listing`, { clientListed: true }, { title: `List ${company.name}?`, message: 'The company becomes discoverable again.', confirm: 'List company' })}>List</button>}
            </div>
          </td>
        </tr>
      )}
    />
  );
}

function Bookings({ data }) {
  return (
    <DataTable
      title="All jobs"
      headers={['Reference', 'Company', 'Customer', 'Service', 'Status', 'Amount', 'Scheduled']}
      rows={(data.bookings || []).filter((booking) => booking.serviceSnapshot?.category !== 'Inquiry')}
      searchKeys={(booking) => [booking.reference, booking.company?.name, booking.customer?.name, booking.customerName, booking.serviceSnapshot?.name, booking.status]}
      actions={<button type="button" className="btn btn-secondary btn-sm" onClick={() => downloadCsv('jobs', data.bookings, [['Reference', (r) => r.reference], ['Company', (r) => r.company?.name], ['Customer', (r) => r.customer?.name || r.customerName], ['Service', (r) => r.serviceSnapshot?.name], ['Status', (r) => r.status], ['Amount', (r) => r.pricing?.finalTotal], ['Scheduled', (r) => r.scheduledAt]])}><Icon name="download" />Export</button>}
      renderRow={(booking) => <tr key={booking._id}><td className="mono">{booking.reference}</td><td>{booking.company?.name}</td><td>{booking.customer?.name || booking.customerName}<small>{booking.customer?.email}</small></td><td>{booking.serviceSnapshot?.name}</td><td><Status value={booking.status} /></td><td className="num">{money(booking.pricing?.finalTotal)}</td><td className="date">{date(booking.scheduledAt)}</td></tr>}
    />
  );
}

function Payments({ data }) {
  const totals = data.totals || {};
  const ledger = data.payments || [];
  return (
    <>
      <div className="metrics" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
        <Metric icon="payments" label="Recorded revenue" value={money(totals.revenue)} hint={`${totals.recorded || 0} recorded payments`} tone="success" />
        <Metric icon="receipt_long" label="Payments" value={totals.payments ?? ledger.length} hint="All statuses" />
        <Metric icon="domain" label="Earning companies" value={totals.companies ?? (data.companyRevenue || []).length} tone="info" />
      </div>
      <DataTable
        title="Revenue by company"
        subtitle={totals.companies > (data.companyRevenue || []).length ? `Top ${(data.companyRevenue || []).length} of ${totals.companies} earning companies` : undefined}
        headers={['Company', 'City', 'Payments', 'Revenue']}
        rows={data.companyRevenue || []}
        searchKeys={(row) => [row.company?.name, row.company?.city]}
        actions={<button type="button" className="btn btn-secondary btn-sm" onClick={() => downloadCsv('company-revenue', data.companyRevenue, [['Company', (r) => r.company?.name], ['City', (r) => r.company?.city], ['Payments', (r) => r.payments], ['Revenue', (r) => r.revenue]])}><Icon name="download" />Export</button>}
        renderRow={(row) => <tr key={row.companyId}><td><b>{row.company?.name}</b></td><td>{row.company?.city}</td><td className="num">{row.payments}</td><td className="num"><b>{money(row.revenue)}</b></td></tr>}
      />
      <DataTable
        title="Payment ledger"
        subtitle={totals.payments > ledger.length ? `Latest ${ledger.length} of ${totals.payments} payments` : undefined}
        headers={['Payment', 'Booking', 'Company', 'Customer', 'Method', 'Status', 'Amount', 'Recorded']}
        rows={data.payments || []}
        searchKeys={(payment) => [payment.reference, payment.booking?.reference, payment.company?.name, payment.customer?.name, payment.method]}
        renderRow={(payment) => <tr key={payment._id}><td className="mono">{payment.reference}</td><td className="mono">{payment.booking?.reference}</td><td>{payment.company?.name}</td><td>{payment.customer?.name}</td><td style={{ textTransform: 'capitalize' }}>{payment.method}</td><td><Status value={payment.status} /></td><td className="num">{money(payment.amount)}</td><td className="date">{date(payment.recordedAt)}</td></tr>}
      />
    </>
  );
}

function Reviews({ data }) {
  return (
    <DataTable
      title="Ratings and reviews"
      headers={['Rating', 'Company', 'Customer', 'Booking', 'Review', 'Status', 'Date']}
      rows={data.reviews || []}
      searchKeys={(review) => [review.company?.name, review.customer?.name, review.comment, review.booking?.reference]}
      actions={<button type="button" className="btn btn-secondary btn-sm" onClick={() => downloadCsv('reviews', data.reviews, [['Rating', (r) => r.rating], ['Company', (r) => r.company?.name], ['Customer', (r) => r.customer?.name], ['Review', (r) => r.comment], ['Date', (r) => r.createdAt]])}><Icon name="download" />Export</button>}
      renderRow={(review) => <tr key={review._id}><td><b className="num">★ {review.rating}</b></td><td>{review.company?.name}<small>{review.company?.city}</small></td><td>{review.customer?.name}<small>{review.customer?.email}</small></td><td className="mono">{review.booking?.reference || '—'}</td><td className="wrap">{review.comment}</td><td><Status value={review.published ? 'published' : 'hidden'} /></td><td className="date">{date(review.createdAt)}</td></tr>}
    />
  );
}

function SetPasswordModal({ account, onClose }) {
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { setPassword(''); setConfirm(''); setError(''); setShown(false); }, [account]);
  const generate = () => {
    const bytes = crypto.getRandomValues(new Uint8Array(9));
    const value = `Fleet-${btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, '').slice(0, 10)}!7`;
    setPassword(value); setConfirm(value); setShown(true);
  };
  const submit = async (event) => {
    event.preventDefault();
    if (password.length < 8) { setError('Use at least 8 characters.'); return; }
    if (password !== confirm) { setError('The passwords do not match.'); return; }
    setBusy(true); setError('');
    try {
      await api(`/users/${account._id}/password`, { method: 'PATCH', body: JSON.stringify({ password }) });
      toast(`New password saved for ${account.email}. Share it with them securely.`);
      onClose();
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  };
  return (
    <Modal open={Boolean(account)} onClose={onClose} title={`Set password for ${account?.name || ''}`} description={`${account?.email || ''} will be signed out everywhere and must use this new password.`}
      footer={<><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><button type="submit" form="set-password" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save password'}</button></>}>
      <form id="set-password" onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
        <label className="field"><span className="label">New password</span><span className="password"><input className="input" type={shown ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required autoFocus /><button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => setShown((value) => !value)} aria-label={shown ? 'Hide password' : 'Show password'}><Icon name={shown ? 'visibility_off' : 'visibility'} /></button></span></label>
        <label className="field"><span className="label">Confirm password</span><input className="input" type={shown ? 'text' : 'password'} value={confirm} onChange={(event) => setConfirm(event.target.value)} autoComplete="new-password" required /></label>
        <button type="button" className="btn btn-ghost btn-sm" style={{ justifySelf: 'start' }} onClick={generate}><Icon name="key" />Generate a strong password</button>
        {error && <p className="alert"><Icon name="error" />{error}</p>}
      </form>
    </Modal>
  );
}

function Users({ data, mutate }) {
  const [resetting, setResetting] = useState(null);
  return (
    <>
    <SetPasswordModal account={resetting} onClose={() => setResetting(null)} />
    <DataTable
      title="Customer and company users"
      headers={['User', 'Role', 'Company', 'Status', 'Last sign-in', '']}
      rows={data.users || []}
      searchKeys={(account) => [account.name, account.email, account.role, account.company?.name, account.status]}
      actions={<button type="button" className="btn btn-secondary btn-sm" onClick={() => downloadCsv('users', data.users, [['Name', (r) => r.name], ['Email', (r) => r.email], ['Role', (r) => r.role], ['Company', (r) => r.company?.name], ['Status', (r) => r.status], ['Last login', (r) => r.lastLoginAt]])}><Icon name="download" />Export</button>}
      renderRow={(account) => (
        <tr key={account._id}>
          <td><div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><span className="avatar">{initials(account.name)}</span><span><b>{account.name}</b><small>{account.email}</small></span></div></td>
          <td><Status value={account.role} /></td>
          <td>{account.company?.name || '—'}</td>
          <td><Status value={account.status} /></td>
          <td className="date">{date(account.lastLoginAt)}</td>
          <td><div className="actions">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setResetting(account)}><Icon name="key" />Set password</button>
            {account.status === 'active'
              ? <button type="button" className="btn btn-danger btn-sm" onClick={() => mutate(`/users/${account._id}/status`, { status: 'suspended' }, { title: `Suspend ${account.name}?`, message: 'They are signed out everywhere and cannot sign in until reactivated.', confirm: 'Suspend', danger: true })}>Suspend</button>
              : <button type="button" className="btn btn-success btn-sm" onClick={() => mutate(`/users/${account._id}/status`, { status: 'active' }, { title: `Reactivate ${account.name}?`, confirm: 'Reactivate' })}>Reactivate</button>}
          </div></td>
        </tr>
      )}
    />
    </>
  );
}

function Support({ data, mutate }) {
  const [open, setOpen] = useState(null);
  return (
    <>
      <DataTable
        title="Support requests"
        subtitle="From the website contact form and signed-in users."
        headers={['Subject', 'From', 'Message', 'Status', 'Received', '']}
        rows={data.requests || []}
        searchKeys={(request) => [request.subject, request.message, request.contactName, request.contactEmail, request.createdBy?.name]}
        empty="No support requests"
        emptyIcon="support_agent"
        renderRow={(request) => (
          <tr key={request._id}>
            <td><b>{request.subject}</b><small>{request.topic}</small></td>
            <td>{request.createdBy?.name || request.contactName || '—'}<small>{request.createdBy?.email || request.contactEmail}</small></td>
            <td className="wrap"><button type="button" className="btn btn-ghost btn-sm" style={{ height: 'auto', padding: 0, textAlign: 'left', whiteSpace: 'normal', fontWeight: 400 }} onClick={() => setOpen(request)}>{String(request.message).slice(0, 120)}{String(request.message).length > 120 ? '…' : ''}</button></td>
            <td><Status value={request.status} /></td>
            <td className="date">{date(request.createdAt)}</td>
            <td><div className="actions">
              {(request.createdBy?.email || request.contactEmail) && <a className="btn btn-secondary btn-sm" href={`mailto:${request.createdBy?.email || request.contactEmail}?subject=${encodeURIComponent(`Re: ${request.subject}`)}`}><Icon name="reply" />Reply</a>}
              <button type="button" className={`btn btn-sm ${request.status === 'open' ? 'btn-success' : 'btn-secondary'}`} onClick={() => mutate(`/support/${request._id}/status`, { status: request.status === 'open' ? 'resolved' : 'open' }, null)}>{request.status === 'open' ? 'Resolve' : 'Reopen'}</button>
            </div></td>
          </tr>
        )}
      />
      <Modal open={Boolean(open)} onClose={() => setOpen(null)} title={open?.subject} description={`${open?.createdBy?.name || open?.contactName || ''} · ${open?.createdBy?.email || open?.contactEmail || ''}`}>
        <p style={{ whiteSpace: 'pre-line', lineHeight: 1.7 }}>{open?.message}</p>
      </Modal>
    </>
  );
}

const duration = (seconds = 0) => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return days ? `${days}d ${hours}h` : hours ? `${hours}h ${minutes}m` : `${minutes}m`;
};

function Health({ data, connected }) {
  const mongoOk = data.mongo?.state === 'connected';
  const system = data.system || {};
  const metrics = data.metrics || {};
  const [latency, setLatency] = useState(null);
  // Round-trip time of an authenticated API call, re-measured every 15 seconds.
  useEffect(() => {
    let active = true;
    const ping = async () => {
      const started = performance.now();
      try { await api('/auth/me'); if (active) setLatency(Math.round(performance.now() - started)); } catch { if (active) setLatency(-1); }
    };
    ping();
    const id = window.setInterval(ping, 15000);
    return () => { active = false; window.clearInterval(id); };
  }, []);
  const apiOk = latency !== -1;
  return (
    <>
      <div className="grid-3">
        <section className={`card health ${mongoOk ? '' : 'bad'}`}><Icon name="database" fill /><h2>Database</h2><b>{mongoOk ? 'Connected' : data.mongo?.state || 'Unknown'}</b><span className="subtle">MongoDB · {data.mongo?.database || '—'}</span></section>
        <section className={`card health ${apiOk ? '' : 'bad'}`}><Icon name="api" fill /><h2>API</h2><b>{!apiOk ? 'Not responding' : latency === null ? 'Checking…' : `${latency} ms`}</b><span className="subtle">Authenticated round trip, checked every 15s</span></section>
        <section className={`card health ${connected ? '' : 'bad'}`}><Icon name="sensors" fill /><h2>Live updates</h2><b>{connected ? 'Streaming' : 'Reconnecting'}</b><span className="subtle">Socket.IO channel for this console</span></section>
      </div>
      <section className="card">
        <header className="card-header"><div><h2>Server</h2><p>Snapshot taken when this section was loaded</p></div></header>
        <dl className="facts">
          <div><dt>Uptime</dt><dd>{duration(system.uptimeSeconds)}</dd></div>
          <div><dt>Memory in use</dt><dd>{system.memoryMb ? `${system.memoryMb} MB` : '—'}</dd></div>
          <div><dt>Runtime</dt><dd>Node.js {String(system.node || '').replace(/^v/, '') || '—'}</dd></div>
          <div><dt>Environment</dt><dd style={{ textTransform: 'capitalize' }}>{system.environment || '—'}</dd></div>
          <div><dt>Staff active now</dt><dd>{metrics.activeTechnicians || 0}</dd></div>
          <div><dt>Open support tickets</dt><dd>{metrics.openSupport || 0}</dd></div>
        </dl>
      </section>
    </>
  );
}

const EXPORTS = [
  ['companies', 'domain', 'Companies', '/companies', 'companies', [['Name', (r) => r.name], ['City', (r) => r.city], ['Owner', (r) => r.owner?.name], ['Owner email', (r) => r.owner?.email], ['Approval', (r) => r.approvalStatus], ['Rating', (r) => r.rating], ['Created', (r) => r.createdAt]]],
  ['jobs', 'work', 'Jobs', '/bookings', 'bookings', [['Reference', (r) => r.reference], ['Company', (r) => r.company?.name], ['Customer', (r) => r.customerName], ['Service', (r) => r.serviceSnapshot?.name], ['Status', (r) => r.status], ['Total', (r) => r.pricing?.finalTotal], ['Scheduled', (r) => r.scheduledAt]]],
  ['payments', 'payments', 'Payments', '/payments', 'payments', [['Payment', (r) => r.reference], ['Booking', (r) => r.booking?.reference], ['Company', (r) => r.company?.name], ['Customer', (r) => r.customer?.name], ['Method', (r) => r.method], ['Status', (r) => r.status], ['Amount', (r) => r.amount], ['Recorded', (r) => r.recordedAt]]],
  ['reviews', 'star', 'Reviews', '/reviews', 'reviews', [['Rating', (r) => r.rating], ['Company', (r) => r.company?.name], ['Customer', (r) => r.customer?.name], ['Comment', (r) => r.comment], ['Published', (r) => r.published], ['Created', (r) => r.createdAt]]],
  ['users', 'group', 'Users', '/users', 'users', [['Name', (r) => r.name], ['Email', (r) => r.email], ['Role', (r) => r.role], ['Status', (r) => r.status], ['Last sign-in', (r) => r.lastLoginAt], ['Created', (r) => r.createdAt]]],
  ['support', 'support_agent', 'Support requests', '/support', 'requests', [['Name', (r) => r.contactName || r.createdBy?.name], ['Email', (r) => r.contactEmail || r.createdBy?.email], ['Topic', (r) => r.topic], ['Subject', (r) => r.subject], ['Message', (r) => r.message], ['Status', (r) => r.status], ['Created', (r) => r.createdAt]]],
];

function Reports({ data }) {
  const toast = useToast();
  const [busy, setBusy] = useState('');
  const metrics = data.metrics || {};
  const counts = [...(data.bookingCounts || [])].sort((a, b) => b.count - a.count);
  const totalJobs = counts.reduce((sum, row) => sum + row.count, 0);
  const done = counts.filter((row) => ['Completed', 'Paid'].includes(row._id)).reduce((sum, row) => sum + row.count, 0);
  const cancelled = counts.find((row) => row._id === 'Cancelled')?.count || 0;
  const companies = data.companyCounts || [];
  const totalCompanies = companies.reduce((sum, row) => sum + row.count, 0);
  const approved = companies.find((row) => row._id === 'approved')?.count || 0;
  // One decimal place so a near-total share never rounds up to 100%.
  const percent = (part, whole) => (whole ? `${Number(((part / whole) * 100).toFixed(1))}%` : '—');
  const months = (data.revenueTrend || []).map((row, index, list) => {
    const previous = list[index - 1]?.amount;
    return {
      label: new Date(row._id.year, row._id.month - 1).toLocaleDateString('en-PK', { month: 'long', year: 'numeric' }),
      amount: row.amount,
      change: previous ? Math.round(((row.amount - previous) / previous) * 100) : null,
    };
  }).reverse();

  const exportData = async ([kind, , label, path, key, columns]) => {
    setBusy(kind);
    try {
      const rows = (await api(path))[key] || [];
      if (!rows.length) toast(`No ${label.toLowerCase()} to export yet`, 'error');
      else { downloadCsv(kind, rows, columns); toast(`${label} exported (${rows.length} rows)`); }
    } catch (requestError) { toast(requestError.message, 'error'); }
    setBusy('');
  };

  return (
    <>
      <div className="metrics">
        <Metric icon="task_alt" label="Completion rate" value={percent(done, totalJobs)} hint={`${done} of ${totalJobs} jobs completed or paid`} tone="success" />
        <Metric icon="cancel" label="Cancellation rate" value={percent(cancelled, totalJobs)} hint={`${cancelled} cancelled jobs`} tone="danger" />
        <Metric icon="receipt_long" label="Average payment" value={money(metrics.payments ? Math.round(metrics.revenue / metrics.payments) : 0)} hint={`${metrics.payments || 0} recorded payments`} />
        <Metric icon="verified" label="Approval rate" value={percent(approved, totalCompanies)} hint={`${approved} of ${totalCompanies} companies approved`} tone="info" />
        <Metric icon="star" label="Average rating" value={Number(metrics.averageRating || 0).toFixed(1)} hint={`${metrics.reviews || 0} published reviews`} tone="warning" />
      </div>
      <div className="grid-2">
        <section className="card">
          <header className="card-header"><div><h2>Monthly revenue</h2><p>Recorded payments, last six months</p></div></header>
          <div className="table-wrap"><table>
            <thead><tr><th>Month</th><th style={{ textAlign: 'right' }}>Revenue</th><th style={{ textAlign: 'right' }}>vs previous</th></tr></thead>
            <tbody>{months.map((row) => (
              <tr key={row.label}>
                <td>{row.label}</td>
                <td className="num" style={{ textAlign: 'right' }}><b>{money(row.amount)}</b></td>
                <td className="num" style={{ textAlign: 'right' }}>{row.change === null ? <span className="subtle">—</span> : <span className={row.change >= 0 ? 'trend-up' : 'trend-down'}><Icon name={row.change >= 0 ? 'trending_up' : 'trending_down'} />{row.change >= 0 ? '+' : ''}{row.change}%</span>}</td>
              </tr>
            ))}</tbody>
          </table></div>
        </section>
        <section className="card">
          <header className="card-header"><div><h2>Job status breakdown</h2><p>Share of all {totalJobs} jobs</p></div></header>
          <div className="bars">
            {counts.length ? counts.map((row) => <div className="bar-row" key={row._id}><span>{row._id}</span><span className="bar-track"><i style={{ width: `${totalJobs ? (row.count / totalJobs) * 100 : 0}%` }} /></span><b>{percent(row.count, totalJobs)}</b></div>) : <Empty icon="work" title="No jobs yet" />}
          </div>
        </section>
      </div>
      <section className="card">
        <header className="card-header"><div><h2>Data exports</h2><p>Download the full current record set as CSV</p></div></header>
        <div className="exports">
          {EXPORTS.map((entry) => (
            <button key={entry[0]} type="button" className="export-tile" disabled={Boolean(busy)} onClick={() => exportData(entry)}>
              <span className="metric-icon tone-brand"><Icon name={entry[1]} fill /></span>
              <span><b>{entry[2]}</b><small>{busy === entry[0] ? 'Preparing…' : 'CSV file'}</small></span>
              <Icon name="download" />
            </button>
          ))}
        </div>
      </section>
    </>
  );
}

function Settings({ user, onUpdate }) {
  const toast = useToast();
  const [form, setForm] = useState({ email: user.email, currentPassword: '', newPassword: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await api('/settings', { method: 'PUT', body: JSON.stringify(form) });
      onUpdate(result.user);
      setForm((current) => ({ ...current, email: result.user.email, currentPassword: '', newPassword: '' }));
      toast('Security settings saved. Other admin sessions were signed out.');
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  };
  return (
    <section className="card" style={{ maxWidth: 640 }}>
      <header className="card-header"><div><h2>Admin identity and password</h2><p>Leave the password fields empty to keep the current password.</p></div></header>
      <form className="card-body" style={{ display: 'grid', gap: 14 }} onSubmit={submit}>
        <label className="field"><span className="label">Admin email</span><input className="input" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} autoComplete="username" required /></label>
        <label className="field"><span className="label">Current password</span><input className="input" type="password" value={form.currentPassword} onChange={(event) => setForm({ ...form, currentPassword: event.target.value })} autoComplete="current-password" required={Boolean(form.newPassword)} /></label>
        <label className="field"><span className="label">New password</span><input className="input" type="password" value={form.newPassword} onChange={(event) => setForm({ ...form, newPassword: event.target.value })} autoComplete="new-password" placeholder="8+ characters with a letter and a number" required={Boolean(form.currentPassword)} /></label>
        {error && <p className="alert"><Icon name="error" />{error}</p>}
        <div><button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save security settings'}</button></div>
      </form>
    </section>
  );
}

/* -------------------------------------------------------------------- app */
function Console({ user, setUser }) {
  const toast = useToast();
  const [theme, toggleTheme] = useTheme();
  const [section, setSection] = useState(() => { const hash = window.location.hash.slice(1); return IDS.has(hash) ? hash : 'overview'; });
  const [cache, setCache] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const [confirmState, setConfirmState] = useState(null);
  const [doc, setDoc] = useState(null);
  const [drawer, setDrawer] = useState(false);
  const sectionRef = useRef(section);
  sectionRef.current = section;

  const load = useCallback(async (id = sectionRef.current, quiet = false) => {
    const endpoint = ENDPOINT[id];
    if (!endpoint) return;
    if (!quiet) setLoading(true);
    try { const result = await api(endpoint); setCache((current) => ({ ...current, [endpoint]: result })); setError(''); }
    catch (requestError) {
      if (requestError.status === 401) { store('remove', TOKEN_KEY); setUser(null); return; }
      setError(requestError.message);
    } finally { if (!quiet) setLoading(false); }
  }, [setUser]);

  useEffect(() => {
    if (window.location.hash !== `#${section}`) window.history.replaceState(null, '', `#${section}`);
    load(section, Boolean(cache[ENDPOINT[section]]));
    setDrawer(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  useEffect(() => {
    const onHash = () => { const hash = window.location.hash.slice(1); if (IDS.has(hash)) setSection(hash); };
    const onFocus = () => load(sectionRef.current, true);
    window.addEventListener('hashchange', onHash);
    window.addEventListener('focus', onFocus);
    return () => { window.removeEventListener('hashchange', onHash); window.removeEventListener('focus', onFocus); };
  }, [load]);

  // Live: every platform event refreshes the open section (and the queue badge).
  useEffect(() => {
    const base = apiBase().replace(/\/api$/, '') || window.location.origin;
    const socket = io(base, { withCredentials: true, auth: { token: store('get', TOKEN_KEY) || '' }, transports: ['websocket', 'polling'] });
    let timer;
    const refresh = () => { window.clearTimeout(timer); timer = window.setTimeout(() => { load(sectionRef.current, true); if (sectionRef.current !== 'overview') load('overview', true); }, 200); };
    socket.on('connect', () => { setConnected(true); refresh(); });
    socket.on('disconnect', () => setConnected(false));
    socket.on('platform:updated', refresh);
    return () => { window.clearTimeout(timer); socket.disconnect(); };
  }, [load]);

  useEffect(() => { if (!cache['/overview']) load('overview', true); }, [cache, load]);

  const mutate = (path, body, prompt) => {
    const run = async () => {
      try {
        await api(path, { method: 'PATCH', body: JSON.stringify(body) });
        toast(prompt?.confirm ? `${prompt.confirm} — done` : 'Saved');
        setConfirmState(null);
        await load(sectionRef.current, true);
        load('overview', true);
      } catch (requestError) { toast(requestError.message, 'error'); setConfirmState((current) => current && { ...current, busy: false }); }
    };
    if (!prompt) { run(); return; }
    setConfirmState({ ...prompt, run });
  };

  const openDocument = async (company) => {
    try { const result = await api(`/companies/${company._id}/document`); setDoc({ company, document: result.document }); }
    catch (requestError) { toast(requestError.message, 'error'); }
  };

  const logout = async () => {
    try { await api('/auth/logout', { method: 'POST', body: '{}' }); } catch { /* signed out anyway */ }
    store('remove', TOKEN_KEY);
    setUser(null);
  };

  const data = cache[ENDPOINT[section]] || {};
  const ready = section === 'settings' || Boolean(cache[ENDPOINT[section]]);
  const pendingCount = (cache['/overview']?.pendingCompanies || []).length;
  const openTickets = cache['/overview']?.metrics?.openSupport || 0;
  const title = FLAT.find(([id]) => id === section)?.[2];

  const body = useMemo(() => {
    if (!ready) return <div className="card card-body" style={{ display: 'grid', gap: 14 }}>{[0, 1, 2, 3, 4].map((key) => <Skeleton key={key} height={20} />)}</div>;
    switch (section) {
      case 'overview': return <Overview data={data} go={setSection} mutate={mutate} />;
      case 'reports': return <Reports data={data} />;
      case 'requests': return <Requests data={data} mutate={mutate} openDocument={openDocument} />;
      case 'companies': return <Companies data={data} mutate={mutate} />;
      case 'removal': return <Access data={data} mutate={mutate} />;
      case 'bookings': return <Bookings data={data} />;
      case 'payments': return <Payments data={data} />;
      case 'reviews': return <Reviews data={data} />;
      case 'users': return <Users data={data} mutate={mutate} />;
      case 'support': return <Support data={data} mutate={mutate} />;
      case 'health': return <Health data={data} connected={connected} />;
      case 'settings': return <Settings user={user} onUpdate={setUser} />;
      default: return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, data, ready, connected, user]);

  const isImage = String(doc?.document?.mimeType || doc?.document?.data || '').match(/^(image\/|data:image\/)/);

  return (
    <div className="shell">
      <div className="progress" aria-hidden="true"><span style={{ width: loading ? '70%' : '100%', opacity: loading ? 1 : 0 }} /></div>
      <aside className={`sidebar ${drawer ? 'open' : ''}`}>
        <div className="sidebar-head"><Logo /></div>
        <nav aria-label="Admin">
          {SECTIONS.map(([group, items]) => (
            <div className="nav-group" key={group}>
              <p>{group}</p>
              {items.map(([id, icon, label]) => (
                <button key={id} type="button" className={`nav-item ${section === id ? 'active' : ''}`} onClick={() => setSection(id)} aria-current={section === id ? 'page' : undefined}>
                  <Icon name={icon} />{label}
                  {id === 'requests' && pendingCount > 0 && <span className="nav-count">{pendingCount}</span>}
                  {id === 'support' && openTickets > 0 && <span className="nav-count">{openTickets}</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="operator">
            <span className="avatar">{initials(user.name)}</span>
            <span style={{ flex: 1, minWidth: 0 }}><b>{user.name}</b><small>{user.email}</small></span>
            <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={logout} title="Sign out" aria-label="Sign out"><Icon name="logout" /></button>
          </div>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <button type="button" className="btn btn-ghost btn-icon menu-btn" onClick={() => setDrawer((value) => !value)} aria-label="Menu"><Icon name="menu" /></button>
          <div><h1>{title}</h1><p>{DESCRIPTIONS[section]}</p></div>
          <span className="topbar-spacer" />
          <span className={`live ${connected ? 'on' : ''}`}><i />{connected ? 'Live' : 'Reconnecting'}</span>
          <button type="button" className="btn btn-ghost btn-icon" onClick={() => load(section)} title="Refresh" aria-label="Refresh"><Icon name="refresh" /></button>
          <button type="button" className="btn btn-ghost btn-icon" onClick={toggleTheme} title="Toggle theme" aria-label="Toggle theme"><Icon name={theme === 'dark' ? 'light_mode' : 'dark_mode'} /></button>
        </header>
        <div className="content" key={section}>
          {error && <p className="alert"><Icon name="error" />{error}</p>}
          {body}
        </div>
      </div>

      <Modal open={Boolean(confirmState)} onClose={() => setConfirmState(null)} title={confirmState?.title} description={confirmState?.message}
        footer={<><button type="button" className="btn btn-secondary" onClick={() => setConfirmState(null)}>Cancel</button><button type="button" className={`btn ${confirmState?.danger ? 'btn-danger' : 'btn-primary'}`} disabled={confirmState?.busy} onClick={() => { setConfirmState((current) => ({ ...current, busy: true })); confirmState.run(); }}>{confirmState?.busy ? 'Working…' : confirmState?.confirm || 'Confirm'}</button></>}>
        <p className="subtle" style={{ fontSize: 13 }}>This change is recorded in the audit history and applied to every open session immediately.</p>
      </Modal>

      <Modal open={Boolean(doc)} onClose={() => setDoc(null)} wide title={doc?.company?.name} description={doc?.document?.name || 'Business license'}
        footer={<><button type="button" className="btn btn-secondary" onClick={() => setDoc(null)}>Close</button>{doc?.company?.approvalStatus !== 'approved' && <button type="button" className="btn btn-primary" onClick={() => { const company = doc.company; setDoc(null); mutate(`/companies/${company._id}/status`, { status: 'approved', version: company.approvalVersion }, { title: `Approve ${company.name}?`, message: 'The company becomes visible to customers and its workspace opens immediately.', confirm: 'Approve' }); }}>Approve company</button>}</>}>
        {doc && (isImage ? <div className="doc-frame" style={{ display: 'grid', placeItems: 'center', padding: 12 }}><img src={doc.document.data} alt={`${doc.company.name} license`} /></div> : <iframe className="doc-frame" title="Business license" src={doc.document.data} />)}
      </Modal>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    api('/auth/me').then((result) => setUser(result.user)).catch(() => setUser(null)).finally(() => setChecking(false));
  }, []);
  if (checking) return <div className="boot"><div className="boot-stack"><LogoMark size={48} animated /><span className="loader-bar" /><span>Verifying your session</span></div></div>;
  return <ToastProvider>{user ? <Console user={user} setUser={setUser} /> : <Login onLogin={setUser} />}</ToastProvider>;
}
