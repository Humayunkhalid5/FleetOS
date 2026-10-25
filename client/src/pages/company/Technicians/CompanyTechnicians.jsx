import { useMemo, useState } from 'react';
import api from '../../../services/api';
import { useLiveQuery } from '../../../hooks/useLiveQuery';
import { usePageChrome } from '../../../hooks/usePageChrome';
import { useFeedback } from '../../../hooks/useFeedback';
import { useWorkspace } from '../../../components/company/workspace';
import AvatarUploader from '../../../components/common/AvatarUploader';
import { Alert, Avatar, EmptyState, Modal, SkeletonCards, Spinner, StatusBadge, Tabs } from '../../../components/ui';

const STATUSES = ['Available', 'On Job', 'En Route', 'Off Duty'];
const blank = () => ({ name: '', role: '', phone: '', email: '', experienceYears: 1, status: 'Available', avatar: '', skills: [] });

export default function CompanyTechnicians() {
  const { workspace } = useWorkspace();
  const { confirm, toast } = useFeedback();
  const label = workspace.workforceLabel || 'Staff';
  const singular = label.endsWith('s') ? label.slice(0, -1) : label;
  const { data, error, loading, refresh } = useLiveQuery('/technicians', { events: ['booking:updated', 'workspace:updated', 'review:created'] });
  const people = useMemo(() => data?.technicians || [], [data]);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('all');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank());
  const [skill, setSkill] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [statusBusy, setStatusBusy] = useState('');

  const q = query.trim().toLowerCase();
  const list = people.filter((person) => (tab === 'all' || person.status === tab) && (!q || [person.name, person.role, person.email, person.phone, ...(person.skills || [])].some((value) => String(value || '').toLowerCase().includes(q))));
  const count = (status) => people.filter((person) => person.status === status).length;

  const openForm = (person = null) => { setEditing(person || 'new'); setForm(person ? { ...blank(), ...person, skills: person.skills || [] } : blank()); setFormError(''); setSkill(''); };
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.type === 'number' ? Number(event.target.value) : event.target.value }));
  const addSkill = () => { const value = skill.trim(); if (value && !form.skills.includes(value)) setForm((current) => ({ ...current, skills: [...current.skills, value] })); setSkill(''); };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError('');
    const payload = { name: form.name, role: form.role, phone: form.phone, email: form.email, experienceYears: form.experienceYears, status: form.status, skills: form.skills, ...(form.avatar?.startsWith('data:') ? { avatar: form.avatar } : {}) };
    try {
      if (editing === 'new') await api.post('/technicians', payload); else await api.put(`/technicians/${editing._id}`, payload);
      toast.success(`${form.name} ${editing === 'new' ? 'added' : 'updated'}`);
      setEditing(null);
    } catch (requestError) { setFormError(requestError.message); }
    finally { setSaving(false); }
  };

  const setStatus = async (person, status) => {
    setStatusBusy(person._id);
    try { await api.put(`/technicians/${person._id}`, { status }); toast.success(`${person.name} is now ${status}`); }
    catch (requestError) { toast.error(requestError.message); }
    finally { setStatusBusy(''); }
  };

  const remove = async (person) => {
    const ok = await confirm({ title: `Remove ${person.name}?`, message: `They will no longer be available for dispatch. ${singular}s with active jobs must be reassigned first.`, confirmLabel: 'Remove', tone: 'danger' });
    if (!ok) return;
    try { await api.del(`/technicians/${person._id}`); toast.success(`${person.name} removed`); }
    catch (requestError) { toast.error(requestError.message); }
  };

  usePageChrome({
    title: label,
    subtitle: 'Your team and their availability for dispatch.',
    search: query,
    onSearch: setQuery,
    actions: <button type="button" className="btn btn-primary" onClick={() => openForm()}><span className="material-symbols-outlined">person_add</span>Add {singular.toLowerCase()}</button>,
  });

  return (
    <div className="grid gap-5">
      <Tabs value={tab} onChange={setTab} tabs={[['all', 'Everyone', people.length], ...STATUSES.map((status) => [status, status, count(status)])]} />
      <Alert onRetry={refresh}>{error && !data ? error.message : ''}</Alert>
      {loading ? <SkeletonCards count={6} /> : list.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((person) => (
            <article key={person._id} className="card flex flex-col p-5">
              <div className="flex items-start gap-3">
                <Avatar name={person.name} src={person.avatar} size={48} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold">{person.name}</p>
                  <p className="truncate text-[12.5px] text-muted">{person.role || singular}</p>
                </div>
                <StatusBadge status={person.status} />
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="well py-2"><dt className="text-[11px] text-subtle">Rating</dt><dd className="text-[14px] font-semibold">{person.rating ? Number(person.rating).toFixed(1) : '—'}</dd></div>
                <div className="well py-2"><dt className="text-[11px] text-subtle">Jobs</dt><dd className="text-[14px] font-semibold">{person.completedJobsCount || 0}</dd></div>
                <div className="well py-2"><dt className="text-[11px] text-subtle">Years</dt><dd className="text-[14px] font-semibold">{person.experienceYears || 0}</dd></div>
              </dl>
              {(person.skills || []).length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{person.skills.slice(0, 4).map((item) => <span key={item} className="badge badge-neutral">{item}</span>)}</div>}
              <p className="mt-3 truncate text-[12.5px] text-subtle">{[person.phone, person.email].filter(Boolean).join(' · ') || 'No contact details'}</p>
              <div className="mt-auto flex items-center gap-2 pt-4">
                <select className="select input-sm h-9 flex-1 text-[13px]" value={person.status} disabled={statusBusy === person._id} onChange={(event) => setStatus(person, event.target.value)} aria-label={`Availability for ${person.name}`}>
                  {STATUSES.map((status) => <option key={status}>{status}</option>)}
                </select>
                <button type="button" className="btn btn-secondary btn-icon btn-sm h-9 w-9" onClick={() => openForm(person)} aria-label={`Edit ${person.name}`}><span className="material-symbols-outlined">edit</span></button>
                <button type="button" className="btn btn-ghost btn-icon btn-sm h-9 w-9 hover:text-danger-fg" onClick={() => remove(person)} aria-label={`Remove ${person.name}`}><span className="material-symbols-outlined">delete</span></button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="card"><EmptyState icon="badge" title={q || tab !== 'all' ? 'No one matches' : `Add your first ${singular.toLowerCase()}`} action={!q && tab === 'all' && <button type="button" className="btn btn-primary" onClick={() => openForm()}>Add {singular.toLowerCase()}</button>}>{q || tab !== 'all' ? 'Try another filter.' : 'Team members can be dispatched to bookings and tracked live by customers.'}</EmptyState></div>
      )}

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} size="lg" title={editing === 'new' ? `Add ${singular.toLowerCase()}` : `Edit ${form.name}`} description="Profiles are visible only within your company and to customers they serve."
        footer={<><button type="button" className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button><button type="submit" form="staff-form" className="btn btn-primary" disabled={saving}>{saving ? <><Spinner /> Saving</> : 'Save'}</button></>}>
        <form id="staff-form" onSubmit={save} className="grid gap-4">
          <AvatarUploader name={form.name} src={form.avatar} size={64} onChange={(avatar) => setForm((current) => ({ ...current, avatar }))} />
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="field"><span className="label">Full name</span><input className="input" required value={form.name} onChange={update('name')} /></label>
            <label className="field"><span className="label">Role</span><input className="input" value={form.role} onChange={update('role')} placeholder={`e.g. Senior ${singular.toLowerCase()}`} /></label>
            <label className="field"><span className="label">Phone</span><input className="input" type="tel" value={form.phone} onChange={update('phone')} /></label>
            <label className="field"><span className="label">Email</span><input className="input" type="email" value={form.email} onChange={update('email')} /></label>
            <label className="field"><span className="label">Experience (years)</span><input className="input" type="number" min="0" value={form.experienceYears} onChange={update('experienceYears')} /></label>
            <label className="field"><span className="label">Availability</span><select className="select" value={form.status} onChange={update('status')}>{STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label>
          </div>
          <div className="field">
            <span className="label">Skills <span className="font-normal text-subtle">— used by Smart Dispatch to match jobs</span></span>
            <div className="flex gap-2">
              <input className="input" value={skill} onChange={(event) => setSkill(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addSkill(); } }} placeholder="e.g. Installation, Repair & Support" />
              <button type="button" className="btn btn-secondary h-11" onClick={addSkill}>Add</button>
            </div>
            {form.skills.length > 0 && <div className="mt-1 flex flex-wrap gap-1.5">{form.skills.map((item) => <button key={item} type="button" className="badge badge-brand" onClick={() => setForm((current) => ({ ...current, skills: current.skills.filter((value) => value !== item) }))}>{item}<span className="material-symbols-outlined">close</span></button>)}</div>}
          </div>
          <Alert>{formError}</Alert>
        </form>
      </Modal>
    </div>
  );
}
