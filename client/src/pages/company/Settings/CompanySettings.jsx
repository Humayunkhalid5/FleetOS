import { useState } from 'react';
import CompanyShell from '../../../components/company/CompanyShell';
import { useAuth } from '../../../hooks/useAuth';
import api, { saveSessionToken } from '../../../services/api';

function CompanySettings() {
  const { user, updateProfile } = useAuth();
  const [owner, setOwner] = useState({ name: user?.name || '', phone: user?.phone || '', address: user?.address || '', city: user?.city || '' });
  const [password, setPassword] = useState({ currentPassword: '', newPassword: '' });
  const [message, setMessage] = useState('');

  const saveOwner = async (event) => {
    event.preventDefault();
    setMessage('');
    try { await updateProfile(owner); setMessage('Owner profile updated.'); }
    catch (error) { setMessage(error.message); }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    setMessage('');
    try {
      const response = await api.post('/auth/change-password', password);
      if (response.token) saveSessionToken('company', response.token);
      setPassword({ currentPassword: '', newPassword: '' });
      setMessage('Password updated successfully.');
    } catch (error) { setMessage(error.message); }
  };

  return (
    <CompanyShell title="Settings" subtitle="Manage account owner details and password security.">
      {message && <div className="mb-6 p-4 rounded-2xl bg-blue-50 border border-blue-100 text-blue-700 text-sm font-semibold flex items-center gap-3"><span className="material-symbols-outlined">info</span>{message}</div>}
      <div className="grid lg:grid-cols-2 gap-6">
        <form onSubmit={saveOwner} className="bg-white rounded-3xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] p-6 md:p-8 space-y-5">
          <div className="border-b border-slate-100 pb-5">
            <h2 className="text-xl font-bold text-slate-900">Owner profile</h2>
            <p className="text-sm text-slate-500 mt-1">Keep the company account owner information current.</p>
          </div>
          {[[ 'name', 'Full name' ], [ 'phone', 'Phone' ], [ 'city', 'City' ], [ 'address', 'Address' ]].map(([key, label]) => (
            <label key={key} className="grid gap-2 text-xs font-bold text-slate-500 uppercase tracking-wide">
              {label}
              <input value={owner[key] || ''} onChange={(event) => setOwner({ ...owner, [key]: event.target.value })} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10" />
            </label>
          ))}
          <button type="submit" className="px-5 py-2.5 bg-blue-600 text-white rounded-2xl text-sm font-bold hover:bg-blue-700 shadow-sm">Save profile</button>
        </form>

        <form onSubmit={changePassword} className="bg-white rounded-3xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] p-6 md:p-8 space-y-5 h-fit">
          <div className="border-b border-slate-100 pb-5">
            <h2 className="text-xl font-bold text-slate-900">Password</h2>
            <p className="text-sm text-slate-500 mt-1">Rotate the login password for this company account.</p>
          </div>
          <label className="grid gap-2 text-xs font-bold text-slate-500 uppercase tracking-wide">Current password<input type="password" value={password.currentPassword} onChange={(event) => setPassword({ ...password, currentPassword: event.target.value })} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10" required /></label>
          <label className="grid gap-2 text-xs font-bold text-slate-500 uppercase tracking-wide">New password<input type="password" value={password.newPassword} onChange={(event) => setPassword({ ...password, newPassword: event.target.value })} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10" required /></label>
          <button type="submit" className="px-5 py-2.5 bg-slate-900 text-white rounded-2xl text-sm font-bold hover:bg-slate-800 shadow-sm">Update password</button>
        </form>
      </div>
    </CompanyShell>
  );
}

export default CompanySettings;
