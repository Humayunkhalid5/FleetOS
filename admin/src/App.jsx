import { useCallback, useEffect, useState } from 'react';

const sections = [
  ['overview', 'space_dashboard', 'Platform overview'],
  ['requests', 'approval', 'Registration requests'],
  ['companies', 'domain', 'Companies'],
  ['reviews', 'star', 'Ratings & reviews'],
  ['removal', 'block', 'Company access'],
  ['users', 'group', 'Users'],
  ['bookings', 'work', 'Jobs'],
  ['payments', 'payments', 'Finance'],
  ['support', 'support_agent', 'Support'],
  ['audit', 'history', 'Audit history'],
  ['health', 'monitor_heart', 'System health'],
  ['reports', 'lab_profile', 'Reports'],
  ['settings', 'security', 'Security settings'],
];

async function api(path, options = {}) {
  const base = (import.meta.env.VITE_ADMIN_API_URL || import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  const apiPath = `/api/admin${path}`;
  const url = base ? (base.endsWith('/api') ? `${base}/admin${path}` : `${base}${apiPath}`) : apiPath;
  const response = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(localStorage.getItem('fleetos-admin-token') ? { Authorization: `Bearer ${localStorage.getItem('fleetos-admin-token')}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || 'Request failed');
  return data;
}

const money = (value) => `PKR ${Number(value || 0).toLocaleString('en-PK')}`;
const date = (value) => value ? new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';
const statusToken = (value) => String(value || 'unknown').toLowerCase().replace(/\s+/g, '-');
const visibilityCopy = (company) => company.clientVisible ? ['visible', 'Visible in client portal'] : ['hidden', company.approvalStatus === 'approved' ? 'Hidden — owner blocked' : 'Hidden — approve company'];

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    try { const result = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }); if (result.token) localStorage.setItem('fleetos-admin-token', result.token); onLogin(result.user); }
    catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  };
  return <main className="admin-login"><section className="login-panel"><div className="brand"><span className="mark" />FleetOS</div><p className="secure-label"><span className="material-symbols-outlined">shield_lock</span> Restricted operations console</p><h1>Super Admin</h1><p className="muted">Platform governance, approvals, security, and audit oversight.</p><form onSubmit={submit}><label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@example.com" autoComplete="username" required /></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required autoFocus /></label>{error && <p className="error">{error}</p>}<button disabled={busy}>{busy ? 'Verifying…' : 'Enter secure console'}</button></form><small>Credentials are verified against the protected Super Admin record in MongoDB. Public users cannot create admin accounts.</small></section><aside><span className="material-symbols-outlined">admin_panel_settings</span><h2>One console.<br />Complete accountability.</h2><p>Every sensitive change requires a reason and is written to the MongoDB audit history.</p></aside></main>;
}

function Metric({ icon, label, value, tone = 'blue' }) { return <article className="metric"><span className={`metric-icon ${tone} material-symbols-outlined`}>{icon}</span><span><small>{label}</small><b>{value}</b></span></article>; }
function Table({ headers, children, empty = 'No records found.' }) { const hasRows = Array.isArray(children) ? children.length > 0 : Boolean(children); return <div className="table-wrap"><table><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{hasRows ? children : <tr><td colSpan={headers.length} className="empty">{empty}</td></tr>}</tbody></table></div>; }
function Status({ value }) { return <span className={`status ${statusToken(value)}`}>{value || 'unknown'}</span>; }
function Visibility({ company }) { const [tone, label] = visibilityCopy(company); return <span className={`visibility ${tone}`}><span />{label}</span>; }

function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [section, setSection] = useState('overview');
  const [data, setData] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [action, setAction] = useState(null);
  const [reason, setReason] = useState('');

  useEffect(() => { api('/auth/me').then((result) => setUser(result.user)).catch(() => setUser(null)).finally(() => setChecking(false)); }, []);
  const endpoint = section === 'health' || section === 'reports' ? '/overview' : section === 'settings' ? null : section === 'removal' ? '/companies' : `/${section}`;
  const load = useCallback(async () => {
    if (!user || !endpoint) return;
    setBusy(true); setError('');
    try { const result = await api(endpoint); setData((current) => ({ ...current, [section]: result })); }
    catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }, [user, endpoint, section]);
  useEffect(() => { load(); }, [load]);
  const current = data[section] || {};

  const requestMutation = (path, body, label) => { setAction({ path, body, label }); setReason(''); setError(''); };
  const confirmMutation = async (event) => {
    event.preventDefault();
    if (!action) return;
    if (reason.trim().length < 8) return setError('Add an audit reason of at least 8 characters.');
    setBusy(true); setError('');
    try { await api(action.path, { method: 'PATCH', body: JSON.stringify({ ...action.body, reason }) }); setAction(null); setReason(''); await load(); }
    catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  };
  const openLicense = async (company) => {
    setError('');
    try {
      const popup = window.open('', '_blank', 'noopener,noreferrer');
      const result = await api(`/companies/${company._id}/document`);
      if (popup) popup.location = result.document.data;
      else { const anchor = document.createElement('a'); anchor.href = result.document.data; anchor.download = result.document.name || `${company.name}-business-license`; anchor.click(); }
    } catch (requestError) { setError(requestError.message); }
  };
  const logout = async () => { await api('/auth/logout', { method: 'POST', body: '{}' }); localStorage.removeItem('fleetos-admin-token'); setUser(null); };
  const download = (kind, rows = []) => {
    if (!rows.length) return;
    const keys = Object.keys(rows[0]).filter((key) => !['__v'].includes(key));
    const csv = [keys, ...rows.map((row) => keys.map((key) => typeof row[key] === 'object' ? JSON.stringify(row[key]) : row[key]))].map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `fleetos-${kind}-${new Date().toISOString().slice(0, 10)}.csv`; anchor.click(); URL.revokeObjectURL(url);
  };

  if (checking) return <div className="boot">Verifying Super Admin session…</div>;
  if (!user) return <Login onLogin={setUser} />;

  const render = () => {
    if (busy && !data[section]) return <div className="loading">Loading MongoDB records…</div>;
    if (section === 'overview' || section === 'reports') {
      const overview = current.metrics ? current : data.overview || current;
      const metrics = overview.metrics || {};
      return <><div className="metrics"><Metric icon="domain" label="Companies" value={metrics.companies || 0} /><Metric icon="person" label="Customers" value={metrics.customers || 0} /><Metric icon="work" label="Jobs" value={metrics.jobs || 0} tone="cyan" /><Metric icon="payments" label="Recorded payments" value={money(metrics.revenue)} tone="green" /><Metric icon="star" label="Published rating" value={Number(metrics.averageRating || 0).toFixed(1)} tone="amber" /></div><div className="overview-grid"><section className="panel"><header><h2>Booking distribution</h2></header><div className="status-bars">{(overview.bookingCounts || []).map((item) => <div key={item._id}><span>{item._id}</span><div><i style={{ width: `${Math.max(5, item.count / Math.max(...overview.bookingCounts.map((row) => row.count), 1) * 100)}%` }} /></div><b>{item.count}</b></div>)}</div></section><section className="panel approvals-panel"><header><h2>Pending company approvals</h2><button onClick={() => setSection('requests')}>Manage queue</button></header>{(overview.pendingCompanies || []).length ? (overview.pendingCompanies || []).map((company) => <div className="approval" key={company._id}><span><b>{company.name}</b><small>{company.city} · {company.email}</small></span><button onClick={() => requestMutation(`/companies/${company._id}/status`, { status: 'approved', version: company.approvalVersion }, `Approve ${company.name}`)}>Approve</button></div>) : <p className="empty-note">No companies waiting for review.</p>}</section></div><section className="panel"><header><h2>Recent platform jobs</h2>{section === 'reports' && <button onClick={() => download('bookings', overview.recentBookings || [])}>Export CSV</button>}</header><Table headers={['Reference', 'Company', 'Customer', 'Service', 'Status', 'Total', 'Created']}>{(overview.recentBookings || []).map((booking) => <tr key={booking._id}><td className="mono">{booking.reference}</td><td>{booking.company?.name}</td><td>{booking.customerName}</td><td>{booking.serviceSnapshot?.name}</td><td><Status value={booking.status} /></td><td>{money(booking.pricing?.finalTotal)}</td><td>{date(booking.createdAt)}</td></tr>)}</Table></section></>;
    }
    if (section === 'requests') return <section className="panel"><header><h2>Registration requests</h2><button onClick={() => download('company-requests', current.companies || [])}>Export CSV</button></header><Table headers={['Company', 'Owner', 'City', 'License', 'Submitted', 'Visibility', 'Decision']}>{(current.companies || []).map((company) => <tr key={company._id}><td><b>{company.name}</b><small>{company.email}</small></td><td>{company.owner?.name || '—'}<small>{company.owner?.email}</small></td><td>{company.city || '—'}</td><td><button onClick={() => openLicense(company)}>View file</button></td><td>{date(company.createdAt)}</td><td><Visibility company={company} /></td><td className="action-cell"><button onClick={() => requestMutation(`/companies/${company._id}/status`, { status: 'approved', version: company.approvalVersion }, `Approve ${company.name}`)}>Approve</button><button className="danger" onClick={() => requestMutation(`/companies/${company._id}/status`, { status: 'rejected', version: company.approvalVersion }, `Reject ${company.name}`)}>Reject</button></td></tr>)}</Table></section>;
    if (section === 'companies') return <section className="panel"><header><h2>Company registry</h2><button onClick={() => download('companies', current.companies || [])}>Export CSV</button></header><Table headers={['Company', 'Owner', 'City', 'Approval', 'Client visibility', 'Rating', 'Version', 'Action']}>{(current.companies || []).map((company) => <tr key={company._id}><td><b>{company.name}</b><small>{company.email}</small></td><td>{company.owner?.name || '—'}<small>{company.owner?.email}</small></td><td>{company.city}</td><td><Status value={company.approvalStatus} /></td><td><Visibility company={company} /></td><td>{Number(company.rating || 0).toFixed(1)} ({company.reviewCount || 0})</td><td>v{company.approvalVersion}</td><td>{company.clientVisible ? <button className="danger" onClick={() => requestMutation(`/companies/${company._id}/status`, { status: 'suspended', version: company.approvalVersion }, `Block ${company.name}`)}>Block</button> : <button onClick={() => requestMutation(`/companies/${company._id}/status`, { status: 'approved', version: company.approvalVersion }, `Make ${company.name} visible`) }>Make visible</button>}</td></tr>)}</Table></section>;
    if (section === 'reviews') return <section className="panel"><header><h2>Ratings and reviews</h2><button onClick={() => download('reviews', current.reviews || [])}>Export CSV</button></header><Table headers={['Rating', 'Company', 'Customer', 'Booking', 'Review', 'Published', 'Created']}>{(current.reviews || []).map((review) => <tr key={review._id}><td><b>{review.rating}/5</b></td><td>{review.company?.name || '—'}<small>{review.company?.city}</small></td><td>{review.customer?.name || '—'}<small>{review.customer?.email}</small></td><td className="mono">{review.booking?.reference || '—'}</td><td className="review-cell">{review.comment || '—'}</td><td><Status value={review.published ? 'published' : 'hidden'} /></td><td>{date(review.createdAt)}</td></tr>)}</Table></section>;
    if (section === 'removal') return <section className="panel"><header><h2>Company portal access</h2><button onClick={() => download('company-access', current.companies || [])}>Export CSV</button></header><Table headers={['Company', 'Owner account', 'Client discovery', 'Portal access', 'Version', 'Action']}>{(current.companies || []).map((company) => <tr key={company._id}><td><b>{company.name}</b><small>{company.city} · {company.email}</small></td><td>{company.owner?.name || '—'}<small>{company.owner?.status || 'unknown'}</small></td><td><Visibility company={company} /></td><td><Status value={company.owner?.status || 'suspended'} /></td><td>v{company.approvalVersion}</td><td>{company.clientVisible ? <button className="danger" onClick={() => requestMutation(`/companies/${company._id}/status`, { status: 'suspended', version: company.approvalVersion }, `Block ${company.name}`)}>Block / remove</button> : <button onClick={() => requestMutation(`/companies/${company._id}/status`, { status: 'approved', version: company.approvalVersion }, `Restore ${company.name}`)}>Restore</button>}</td></tr>)}</Table></section>;
    if (section === 'users') return <section className="panel"><header><h2>Customer and company users</h2><button onClick={() => download('users', current.users || [])}>Export CSV</button></header><Table headers={['User', 'Role', 'Company', 'Status', 'Last login', 'Action']}>{(current.users || []).map((account) => <tr key={account._id}><td><b>{account.name}</b><small>{account.email}</small></td><td>{account.role}</td><td>{account.company?.name || '—'}</td><td><Status value={account.status} /></td><td>{date(account.lastLoginAt)}</td><td><button className={account.status === 'active' ? 'danger' : ''} onClick={() => requestMutation(`/users/${account._id}/status`, { status: account.status === 'active' ? 'suspended' : 'active' }, `${account.status === 'active' ? 'Suspend' : 'Reactivate'} ${account.name}`)}>{account.status === 'active' ? 'Suspend' : 'Reactivate'}</button></td></tr>)}</Table></section>;
    if (section === 'bookings') return <section className="panel"><header><h2>Platform jobs</h2><button onClick={() => download('jobs', current.bookings || [])}>Export CSV</button></header><Table headers={['Reference', 'Company', 'Customer', 'Vehicle', 'Service', 'Status', 'Amount', 'Scheduled']}>{(current.bookings || []).map((booking) => <tr key={booking._id}><td className="mono">{booking.reference}</td><td>{booking.company?.name}</td><td>{booking.customer?.name || booking.customerName}</td><td>{booking.vehicle?.label || '—'}</td><td>{booking.serviceSnapshot?.name}</td><td><Status value={booking.status} /></td><td>{money(booking.pricing?.finalTotal)}</td><td>{date(booking.scheduledAt)}</td></tr>)}</Table></section>;
    if (section === 'payments') return <><section className="panel"><header><h2>Revenue by company</h2><button onClick={() => download('company-revenue', current.companyRevenue || [])}>Export CSV</button></header><Table headers={['Company', 'City', 'Recorded payments', 'Revenue']}>{(current.companyRevenue || []).map((row) => <tr key={row.companyId}><td><b>{row.company?.name}</b></td><td>{row.company?.city}</td><td>{row.payments}</td><td>{money(row.revenue)}</td></tr>)}</Table></section><section className="panel"><header><h2>Recorded finance ledger</h2><button onClick={() => download('finance', current.payments || [])}>Export CSV</button></header><Table headers={['Payment', 'Booking', 'Company', 'Customer', 'Method', 'Status', 'Amount', 'Recorded']}>{(current.payments || []).map((payment) => <tr key={payment._id}><td className="mono">{payment.reference}</td><td>{payment.booking?.reference}</td><td>{payment.company?.name}</td><td>{payment.customer?.name}</td><td>{payment.method}</td><td><Status value={payment.status} /></td><td>{money(payment.amount)}</td><td>{date(payment.recordedAt)}</td></tr>)}</Table></section></>;
    if (section === 'support') return <section className="panel"><header><h2>Support requests</h2></header><Table headers={['Subject', 'Submitted by', 'Message', 'Status', 'Created', 'Action']}>{(current.requests || []).map((request) => <tr key={request._id}><td><b>{request.subject}</b></td><td>{request.createdBy?.name}<small>{request.createdBy?.email}</small></td><td className="review-cell">{request.message}</td><td><Status value={request.status} /></td><td>{date(request.createdAt)}</td><td><button onClick={() => requestMutation(`/support/${request._id}/status`, { status: request.status === 'open' ? 'resolved' : 'open' }, `${request.status === 'open' ? 'Resolve' : 'Reopen'} support request`)}>{request.status === 'open' ? 'Resolve' : 'Reopen'}</button></td></tr>)}</Table></section>;
    if (section === 'audit') return <section className="panel"><header><h2>Immutable action history</h2><button onClick={() => download('audit', current.events || [])}>Export CSV</button></header><Table headers={['Time', 'Actor', 'Action', 'Target', 'Reason', 'Request ID']}>{(current.events || []).map((event) => <tr key={event._id}><td>{date(event.createdAt)}</td><td>{event.actor?.name}<small>{event.actor?.email}</small></td><td className="mono">{event.action}</td><td>{event.targetType}</td><td className="review-cell">{event.reason}</td><td className="mono">{event.requestId}</td></tr>)}</Table></section>;
    if (section === 'health') return <div className="health-grid"><section className="panel health"><span className="material-symbols-outlined good">database</span><h2>MongoDB</h2><b>{current.mongo?.state || 'unknown'}</b><small>{current.mongo?.database}</small></section><section className="panel health"><span className="material-symbols-outlined good">api</span><h2>API</h2><b>Operational</b><small>Authenticated and responding</small></section><section className="panel health"><span className="material-symbols-outlined good">lock</span><h2>Security</h2><b>Enforced</b><small>HttpOnly sessions and role isolation</small></section></div>;
    if (section === 'settings') return <Settings user={user} onUpdate={setUser} />;
    return null;
  };

  const activeTitle = sections.find(([id]) => id === section)?.[2];
  return <div className="admin-shell"><aside className="sidebar"><div className="brand"><span className="mark" />FleetOS <em>ADMIN</em></div><nav>{sections.map(([id, icon, label]) => <button key={id} className={section === id ? 'active' : ''} onClick={() => setSection(id)}><span className="material-symbols-outlined">{icon}</span>{label}</button>)}</nav><div className="admin-user"><span>{user.name}</span><small>{user.email}</small><button onClick={logout}><span className="material-symbols-outlined">logout</span>Sign out</button></div></aside><main><header className="topbar"><div><p>FleetOS Control Plane</p><h1>{activeTitle}</h1></div><div className="top-actions"><span className="mongo-dot" />MongoDB live <button onClick={load} title="Refresh"><span className="material-symbols-outlined">refresh</span></button></div></header><div className="content"><section className="admin-hero"><div><p className="eyebrow">Super Admin command center</p><h2>{activeTitle}</h2><span>Approve companies, protect client discovery, review platform health, and keep every sensitive action audited.</span></div><div className="hero-card"><small>Current operator</small><b>{user.name}</b><span>{user.email}</span></div></section>{error && <p className="error banner">{error}</p>}{render()}</div></main>{action && <div className="modal-backdrop" role="presentation"><form className="modal-card" onSubmit={confirmMutation}><div className="modal-icon"><span className="material-symbols-outlined">verified_user</span></div><h2>{action.label}</h2><p>This update changes access or workflow state and will be saved to the audit history.</p><label>Audit reason<textarea value={reason} onChange={(event) => setReason(event.target.value)} minLength={8} required autoFocus placeholder="Example: License verified against submitted company documents." /></label><div className="modal-actions"><button type="button" className="secondary" onClick={() => { setAction(null); setReason(''); }}>Cancel</button><button disabled={busy}>{busy ? 'Saving...' : 'Confirm action'}</button></div></form></div>}</div>;
}

function Settings({ user, onUpdate }) {
  const [form, setForm] = useState({ email: user.email, currentPassword: '', newPassword: '', reason: '' });
  const [message, setMessage] = useState('');
  const submit = async (event) => { event.preventDefault(); setMessage(''); try { const result = await api('/settings', { method: 'PUT', body: JSON.stringify(form) }); onUpdate(result.user); setForm((current) => ({ ...current, email: result.user.email, currentPassword: '', newPassword: '', reason: '' })); setMessage('Security settings updated. Other Admin sessions were invalidated.'); } catch (error) { setMessage(error.message); } };
  return <section className="panel settings"><header><h2>Admin identity and password rotation</h2></header><form onSubmit={submit}><label>Admin email<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} autoComplete="username" required /></label><label>Current password<input type="password" value={form.currentPassword} onChange={(event) => setForm({ ...form, currentPassword: event.target.value })} autoComplete="current-password" required={Boolean(form.newPassword)} /></label><label>New password<input type="password" value={form.newPassword} onChange={(event) => setForm({ ...form, newPassword: event.target.value })} autoComplete="new-password" placeholder="10+ characters with uppercase, lowercase, number and symbol" required={Boolean(form.currentPassword)} /></label><small className="muted">Leave both password fields blank to keep the current password.</small><label>Audit reason<textarea value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} required minLength={8} /></label>{message && <p>{message}</p>}<button>Save security settings</button></form></section>;
}

export default App;
