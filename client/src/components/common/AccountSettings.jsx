import { useState } from 'react';
import api, { saveSessionToken } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import { useFeedback } from '../../hooks/useFeedback';
import { Alert, Modal, Spinner } from '../ui';

export function PasswordModal({ open, onClose, role }) {
  const { toast } = useFeedback();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [state, setState] = useState({ submitting: false, error: '' });
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  // Clear the form whenever the dialog closes.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (!open) { setForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); setState({ submitting: false, error: '' }); }
  }

  const submit = async (event) => {
    event.preventDefault();
    if (form.newPassword.length < 8) return setState({ submitting: false, error: 'Use at least 8 characters for the new password.' });
    if (form.newPassword !== form.confirmPassword) return setState({ submitting: false, error: 'The new passwords do not match.' });
    setState({ submitting: true, error: '' });
    try {
      const response = await api.post('/auth/change-password', { currentPassword: form.currentPassword, newPassword: form.newPassword });
      if (response.token) saveSessionToken(role, response.token);
      toast.success('Password updated. Other devices have been signed out.');
      onClose();
    } catch (requestError) {
      setState({ submitting: false, error: requestError.message });
    }
    return undefined;
  };

  return (
    <Modal open={open} onClose={onClose} title="Change password" description="You'll stay signed in here; other sessions are signed out." size="sm"
      footer={<><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><button type="submit" form="password-form" className="btn btn-primary" disabled={state.submitting}>{state.submitting ? <><Spinner /> Saving</> : 'Update password'}</button></>}>
      <form id="password-form" onSubmit={submit} className="grid gap-4">
        <label className="field"><span className="label">Current password</span><input className="input" type="password" autoComplete="current-password" required value={form.currentPassword} onChange={update('currentPassword')} /></label>
        <label className="field"><span className="label">New password</span><input className="input" type="password" autoComplete="new-password" required minLength={8} value={form.newPassword} onChange={update('newPassword')} /></label>
        <label className="field"><span className="label">Confirm new password</span><input className="input" type="password" autoComplete="new-password" required value={form.confirmPassword} onChange={update('confirmPassword')} /></label>
        <Alert>{state.error}</Alert>
      </form>
    </Modal>
  );
}

export function ThemePicker() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="grid grid-cols-2 gap-3">
      {[['light', 'light_mode', 'Light'], ['dark', 'dark_mode', 'Dark']].map(([value, icon, label]) => (
        <button key={value} type="button" onClick={() => setTheme(value)} aria-pressed={theme === value} className={`overflow-hidden rounded-2xl border text-left transition-colors ${theme === value ? 'border-brand ring-1 ring-brand' : 'border-line hover:border-line-strong'}`}>
          <span className={`block h-16 ${value === 'dark' ? 'bg-[#060B15]' : 'bg-[#F4F7FA]'} p-2.5`}>
            <span className={`block h-full rounded-lg ${value === 'dark' ? 'border border-[#1D293F] bg-[#0C1423]' : 'border border-[#DEE4EC] bg-white'} p-2`}>
              <span className={`block h-1.5 w-1/2 rounded-full ${value === 'dark' ? 'bg-[#3E74E8]' : 'bg-[#2563EB]'}`} />
              <span className={`mt-1.5 block h-1.5 w-3/4 rounded-full ${value === 'dark' ? 'bg-[#1D293F]' : 'bg-[#DEE4EC]'}`} />
            </span>
          </span>
          <span className="flex items-center gap-2 px-3 py-2 text-[13px] font-medium"><span className="material-symbols-outlined text-[18px]">{icon}</span>{label}</span>
        </button>
      ))}
    </div>
  );
}
