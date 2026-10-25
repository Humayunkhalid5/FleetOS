import { useState } from 'react';
import { usePageChrome } from '../../../hooks/usePageChrome';
import { useAuth } from '../../../hooks/useAuth';
import { useFeedback } from '../../../hooks/useFeedback';
import AvatarUploader from '../../../components/common/AvatarUploader';
import { PasswordModal, ThemePicker } from '../../../components/common/AccountSettings';
import { Alert, Spinner } from '../../../components/ui';

function CompanySettings() {
  const { user, updateProfile } = useAuth();
  const { toast } = useFeedback();
  const initial = () => ({ name: user?.name || '', phone: user?.phone || '', city: user?.city || '', address: user?.address || '' });
  const [owner, setOwner] = useState(initial);
  const [avatar, setAvatar] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [passwordOpen, setPasswordOpen] = useState(false);
  // Re-sync the form when the saved profile changes.
  const userKey = JSON.stringify(initial());
  const [syncedKey, setSyncedKey] = useState(userKey);
  if (userKey !== syncedKey) { setSyncedKey(userKey); setOwner(initial()); }
  const dirty = avatar || JSON.stringify(owner) !== JSON.stringify(initial());
  const update = (key) => (event) => setOwner((current) => ({ ...current, [key]: event.target.value }));

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try { await updateProfile({ ...owner, ...(avatar ? { avatar } : {}) }); setAvatar(null); toast.success('Account saved'); }
    catch (requestError) { setError(requestError.message); }
    finally { setSaving(false); }
  };

  usePageChrome({ title: 'Settings', subtitle: 'Your account, security and how the workspace looks.' });

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <form onSubmit={save} className="card">
        <div className="card-header"><div><h2 className="card-title">Your account</h2><p className="text-[12.5px] text-subtle">The owner profile for {user?.companyName || 'this company'}.</p></div></div>
        <div className="grid gap-5 p-5 sm:p-6">
          <AvatarUploader name={owner.name} src={avatar || user?.avatar} onChange={setAvatar} />
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="field"><span className="label">Full name</span><input className="input" required value={owner.name} onChange={update('name')} /></label>
            <label className="field"><span className="label">Phone</span><input className="input" type="tel" value={owner.phone} onChange={update('phone')} /></label>
            <label className="field"><span className="label">City</span><input className="input" value={owner.city} onChange={update('city')} /></label>
            <label className="field"><span className="label">Email</span><input className="input" value={user?.email || ''} disabled /></label>
          </div>
          <label className="field"><span className="label">Address</span><input className="input" value={owner.address} onChange={update('address')} /></label>
          <Alert>{error}</Alert>
        </div>
        <div className="flex justify-end gap-2 border-t border-line bg-sunken/40 px-5 py-3 sm:px-6">
          <button type="button" className="btn btn-ghost" disabled={!dirty || saving} onClick={() => { setOwner(initial()); setAvatar(null); }}>Discard</button>
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
          <div><p className="font-medium">Password</p><p className="text-[13px] text-muted">Changing it signs out every other device using this account.</p></div>
          <button type="button" className="btn btn-secondary" onClick={() => setPasswordOpen(true)}><span className="material-symbols-outlined">key</span>Change password</button>
        </div>
      </section>
      <PasswordModal open={passwordOpen} onClose={() => setPasswordOpen(false)} role="company" />
    </div>
  );
}

export default CompanySettings;
