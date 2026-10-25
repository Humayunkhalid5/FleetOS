import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { useLiveQuery } from '../../../hooks/useLiveQuery';
import { usePageChrome } from '../../../hooks/usePageChrome';
import { useFeedback } from '../../../hooks/useFeedback';
import { ROUTES } from '../../../constants';
import AvatarUploader from '../../../components/common/AvatarUploader';
import { PasswordModal, ThemePicker } from '../../../components/common/AccountSettings';
import { Alert, Skeleton, Spinner } from '../../../components/ui';
import { formatCurrency, formatDate } from '../../../utils/helpers';

function Profile() {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  const { toast } = useFeedback();
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '', address: user?.address || '' });
  const [avatar, setAvatar] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [passwordOpen, setPasswordOpen] = useState(false);
  const { data: bookingData } = useLiveQuery('/bookings', { events: ['booking:updated', 'booking:created'] });
  const bookings = (bookingData?.bookings || []).filter((booking) => booking.serviceSnapshot?.category !== 'Inquiry');
  const spent = bookings.filter((booking) => booking.status === 'Paid').reduce((sum, booking) => sum + Number(booking.pricing?.finalTotal || 0), 0);

  // Re-sync the form when the saved profile changes.
  const userKey = [user?.name, user?.phone, user?.address].join('\u0000');
  const [syncedKey, setSyncedKey] = useState(userKey);
  if (userKey !== syncedKey) { setSyncedKey(userKey); setForm({ name: user?.name || '', phone: user?.phone || '', address: user?.address || '' }); }
  const dirty = avatar || form.name !== (user?.name || '') || form.phone !== (user?.phone || '') || form.address !== (user?.address || '');
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const save = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) return setError('Your name cannot be empty.');
    setSaving(true);
    setError('');
    try {
      await updateProfile({ ...form, ...(avatar ? { avatar } : {}) });
      setAvatar(null);
      toast.success('Profile saved');
    } catch (requestError) { setError(requestError.message); }
    finally { setSaving(false); }
    return undefined;
  };

  usePageChrome({ title: 'Profile & settings', subtitle: 'Manage your details, security and appearance.' });

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
      <div className="grid gap-6">
        <form onSubmit={save} className="card">
          <div className="card-header"><h2 className="card-title">Personal details</h2></div>
          <div className="grid gap-5 p-5 sm:p-6">
            <AvatarUploader name={form.name} src={avatar || user?.avatar} onChange={setAvatar} />
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="field"><span className="label">Full name</span><input className="input" required value={form.name} onChange={update('name')} autoComplete="name" /></label>
              <label className="field"><span className="label">Phone</span><input className="input" type="tel" value={form.phone} onChange={update('phone')} autoComplete="tel" placeholder="+92 300 1234567" /></label>
            </div>
            <label className="field"><span className="label">Email</span><input className="input" value={user?.email || ''} disabled /><span className="hint">Contact support to change your sign-in email.</span></label>
            <label className="field"><span className="label">Default service address</span><textarea className="textarea min-h-[76px]" rows={2} value={form.address} onChange={update('address')} placeholder="House, street, area, city" /></label>
            <Alert>{error}</Alert>
          </div>
          <div className="flex justify-end gap-2 border-t border-line bg-sunken/40 px-5 py-3 sm:px-6">
            <button type="button" className="btn btn-ghost" disabled={!dirty || saving} onClick={() => { setForm({ name: user?.name || '', phone: user?.phone || '', address: user?.address || '' }); setAvatar(null); }}>Discard</button>
            <button type="submit" className="btn btn-primary" disabled={!dirty || saving}>{saving ? <><Spinner /> Saving</> : 'Save changes'}</button>
          </div>
        </form>

        <section className="card">
          <div className="card-header"><h2 className="card-title">Appearance</h2></div>
          <div className="p-5 sm:p-6"><ThemePicker /></div>
        </section>

        <section className="card">
          <div className="card-header"><h2 className="card-title">Security</h2></div>
          <div className="flex flex-wrap items-center justify-between gap-3 p-5 sm:p-6">
            <div><p className="font-medium">Password</p><p className="text-[13px] text-muted">Changing it signs out your other devices.</p></div>
            <button type="button" className="btn btn-secondary" onClick={() => setPasswordOpen(true)}><span className="material-symbols-outlined">key</span>Change password</button>
          </div>
        </section>
      </div>

      <aside className="card card-pad lg:sticky lg:top-24">
        <h2 className="section-title">Your activity</h2>
        <dl className="mt-4 grid grid-cols-2 gap-3">
          <div className="well p-3"><dt className="text-[12px] text-subtle">Bookings</dt><dd className="mt-1 text-[20px] font-bold">{bookingData ? bookings.length : <Skeleton className="h-7 w-12" />}</dd></div>
          <div className="well p-3"><dt className="text-[12px] text-subtle">Completed</dt><dd className="mt-1 text-[20px] font-bold">{!bookingData ? <Skeleton className="h-7 w-12" /> : bookings.filter((booking) => ['Completed', 'Paid'].includes(booking.status)).length}</dd></div>
          <div className="well col-span-2 p-3"><dt className="text-[12px] text-subtle">Total paid</dt><dd className="mt-1 text-[20px] font-bold tabular-nums">{bookingData ? formatCurrency(spent) : <Skeleton className="h-7 w-32" />}</dd></div>
        </dl>
        <p className="mt-4 text-[12.5px] text-subtle">Member since {formatDate(user?.createdAt, { month: 'long', year: 'numeric' })}</p>
        <div className="mt-4 grid gap-2">
          <button type="button" className="btn btn-secondary" onClick={() => navigate(ROUTES.bookings)}>View bookings</button>
          <button type="button" className="btn btn-ghost" onClick={() => navigate(ROUTES.payments)}>Payment history</button>
        </div>
      </aside>
      <PasswordModal open={passwordOpen} onClose={() => setPasswordOpen(false)} role="customer" />
    </div>
  );
}

export default Profile;
