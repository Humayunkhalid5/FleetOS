import { useState, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { ROUTES, companyRoute } from '../../../constants';
import api from '../../../services/api';
import CustomerTopNav from '../../../components/customer/CustomerTopNav';

// Default fallback avatar
const DEFAULT_AVATAR =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCUJ5EIaqdsSDN9waPZS_pwz3p-_xqvr3XG-k7zUJKvSUvUzXrP4eCGi5nKdDa9vXLgdN4PN2U1cVz5ePyqh9NBDD_4_g-2IIAzjwzYKCLe-Q828-VbdE-VoPcGhq_X7Wn2MS5RWR70OjBxgiBrFZWZNlMb-tjUKn0RMatMVTkKz2zK7APCY6ygiyndUsnjWx_QPuLTqiKXrNqD0fHHLritrtlSvwxxMuDu7A_Mxv5S09njsq4mZxYoWQ';

// Resize an uploaded image to max 256x256 and return a compressed JPEG data URL
const resizeImage = (file, maxSize = 256) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        try {
          const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
          resolve(dataUrl);
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const cropProfileImage = (source, { zoom = 1, offsetX = 0, offsetY = 0 } = {}, size = 320) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext('2d');
      context.fillStyle = '#E0E1DD';
      context.fillRect(0, 0, size, size);

      const baseScale = Math.max(size / image.width, size / image.height);
      const scale = baseScale * zoom;
      const width = image.width * scale;
      const height = image.height * scale;
      const x = (size - width) / 2 + offsetX;
      const y = (size - height) / 2 + offsetY;

      context.save();
      context.beginPath();
      context.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      context.clip();
      context.drawImage(image, x, y, width, height);
      context.restore();
      resolve(canvas.toDataURL('image/jpeg', 0.88));
    };
    image.onerror = reject;
    image.src = source;
  });

function Profile() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, updateProfile, logout } = useAuth();
  const fileInputRef = useRef(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [avatarDataUrl, setAvatarDataUrl] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [cropSource, setCropSource] = useState('');
  const [cropSettings, setCropSettings] = useState({ zoom: 1, offsetX: 0, offsetY: 0 });
  const [form, setForm] = useState(() => ({
    name: user?.name || '',
    phone: user?.phone || '',
    address: user?.address || '',
    email: user?.email || '',
    plan: user?.plan || 'Free Member',
  }));

  const selectedTech = location.state?.selectedTech || null;
  const profile = user || {
    name: 'Ali Shahzad',
    role: 'Client',
    email: 'ali.shahzad@fleetos.local',
    phone: '+92 300 1234567',
    address: 'Johar Town, Lahore, Punjab',
    plan: 'Fleet Member',
    avatar: DEFAULT_AVATAR,
  };

  const menuItems = [
    { label: 'My Bookings', icon: 'calendar_today', to: ROUTES.bookings },
    { label: 'Browse Services', icon: 'category', to: ROUTES.customizeBooking },
    { label: 'Browse Companies', icon: 'business', to: companyRoute() },
    { label: 'Reviews', icon: 'rate_review', to: ROUTES.reviews },
    { label: 'Payment Methods', icon: 'credit_card', to: ROUTES.bookings },
  ];

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handleAvatarFile = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setSaveError('Image too large. Please choose a file under 5MB.');
      return;
    }
    setUploadingAvatar(true);
    setSaveError('');
    try {
      const dataUrl = await resizeImage(file, 900);
      setCropSource(dataUrl);
      setCropSettings({ zoom: 1, offsetX: 0, offsetY: 0 });
      setEditing(true);
    } catch (err) {
      setSaveError('Could not process that image. Please try another file.');
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, []);

  const applyCroppedAvatar = async () => {
    if (!cropSource) return;
    setUploadingAvatar(true);
    setSaveError('');
    try {
      const cropped = await cropProfileImage(cropSource, cropSettings);
      setAvatarDataUrl(cropped);
      setCropSource('');
    } catch (err) {
      setSaveError('Could not set this picture. Please try another file.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const toggleEdit = () => {
    if (editing) {
      // Cancel — reset to current user values
      setForm({
        name: user?.name || profile.name,
        phone: user?.phone || profile.phone,
        address: user?.address || profile.address,
        email: user?.email || profile.email,
        plan: user?.plan || profile.plan,
      });
      setAvatarDataUrl(null);
      setSaveError('');
    }
    setEditing(!editing);
    setSaved(false);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setSaveError('Name cannot be empty.');
      return;
    }
    if (!user) {
      setSaveError('You must be logged in to save your profile.');
      return;
    }
    setSaving(true);
    setSaved(false);
    setSaveError('');
    try {
      const payload = {
        name: form.name,
        phone: form.phone,
        address: form.address,
        plan: form.plan,
      };
      // Only send avatar when a new one was selected
      if (avatarDataUrl) payload.avatar = avatarDataUrl;

      const result = await updateProfile(payload);
      if (result) {
        setSaved(true);
        setAvatarDataUrl(null);
        setEditing(false);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setSaveError('Failed to save changes. Please check your connection and try again.');
      }
    } catch (err) {
      setSaveError(err.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwdStatus, setPwdStatus] = useState({ error: '', success: '', submitting: false });

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPwdStatus({ error: '', success: '', submitting: true });

    if (pwdForm.newPassword.length < 8) {
      setPwdStatus({ error: 'New password must be at least 8 characters long.', success: '', submitting: false });
      return;
    }
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      setPwdStatus({ error: 'New passwords do not match.', success: '', submitting: false });
      return;
    }

    try {
      const response = await api.post('/auth/change-password', {
        currentPassword: pwdForm.currentPassword,
        newPassword: pwdForm.newPassword
      });
      setPwdStatus({ error: '', success: response.message || 'Password changed successfully!', submitting: false });
      setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setShowPasswordModal(false), 2000);
    } catch (err) {
      setPwdStatus({ error: err.message || 'Failed to change password.', success: '', submitting: false });
    }
  };

  const inputClass = "w-full pl-md pr-md py-md bg-surface-container-low border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all";

  const avatarSrc = avatarDataUrl || (user?.avatar) || DEFAULT_AVATAR;

  return (
    <div className="client-dashboard-shell text-[#0D1B2A] min-h-screen pb-32">
      <CustomerTopNav title="My Profile" subtitle="Edit your details, picture, bookings, reviews, and account settings." backTo={ROUTES.companies} />

      <main className="pt-10 pb-10 px-container-margin max-w-4xl mx-auto space-y-lg">
        {/* Saved toast */}
        {saved && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] bg-tertiary-container text-on-tertiary-container px-lg py-sm rounded-full shadow-lg flex items-center gap-sm">
            <span className="material-symbols-outlined text-md">check_circle</span>
            <span className="font-nav-item text-nav-item">Profile updated!</span>
          </div>
        )}

        {/* Error message */}
        {saveError && (
          <div className="bg-error-container text-on-error-container px-lg py-sm rounded-xl flex items-center gap-sm">
            <span className="material-symbols-outlined text-md">error_outline</span>
            <span className="font-body-md text-body-md">{saveError}</span>
          </div>
        )}

        {/* Not logged in banner */}
        {!user && (
          <div className="bg-surface-container-high text-on-surface-variant px-lg py-sm rounded-xl flex items-center gap-sm justify-between">
            <div className="flex items-center gap-sm">
              <span className="material-symbols-outlined text-md">info</span>
              <span className="font-body-md text-body-md">You are viewing a preview. Log in to edit your profile.</span>
            </div>
            <button onClick={() => navigate(ROUTES.login)} className="px-lg py-xs bg-primary text-on-primary rounded-lg font-nav-item text-nav-item">Login</button>
          </div>
        )}

        {/* Profile Card */}
        <section className="bg-white/92 rounded-[34px] p-lg shadow-[0_24px_80px_rgba(13,27,42,.08)] border border-[#E0E1DD] flex flex-col items-center text-center">
          {/* Avatar with upload overlay */}
          <div className="relative mb-md group">
            <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white shadow-[0_18px_45px_rgba(13,27,42,.18)] ring-4 ring-[#E0E1DD]">
              <img className="w-full h-full object-cover" alt={profile.name} src={avatarSrc} />
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-[#0D1B2A] text-white shadow-lg flex items-center justify-center border-2 border-white hover:scale-110 active:scale-95 transition-all disabled:opacity-70"
              title="Change profile picture"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarFile}
              />
              {uploadingAvatar ? (
                <span className="material-symbols-outlined text-md animate-spin">progress_activity</span>
              ) : (
                <span className="material-symbols-outlined text-md">photo_camera</span>
              )}
            </button>
          </div>
          {avatarDataUrl && (
            <p className="text-label-sm font-label-sm text-primary mb-sm -mt-xs">New picture ready — click Save Changes to apply.</p>
          )}

          <h2 className="font-headline-lg-mobile text-headline-lg-mobile font-black text-[#0D1B2A]">{profile.name}</h2>
          <p className="font-body-md text-body-md text-[#415A77]">{profile.role || 'Client'}</p>
          <span className="mt-xs px-3 py-1 bg-[#E0E1DD] text-[#1B263B] text-[10px] font-black rounded-full uppercase tracking-wider">{profile.plan}</span>

          {selectedTech && (
            <div className="mt-md w-full bg-secondary-container text-on-secondary-container rounded-lg p-md flex items-center gap-sm">
              <span className="material-symbols-outlined">verified</span>
              <span className="font-body-md text-body-md">Viewing profile context for assigned staff member {selectedTech}</span>
            </div>
          )}

          {!editing ? (
            <>
              <div className="mt-lg w-full space-y-sm">
                <div className="flex items-center gap-md p-md bg-surface-container-low rounded-lg">
                  <span className="material-symbols-outlined text-primary">mail</span>
                  <span className="font-body-md text-body-md text-on-surface">{profile.email}</span>
                </div>
                <div className="flex items-center gap-md p-md bg-surface-container-low rounded-lg">
                  <span className="material-symbols-outlined text-primary">call</span>
                  <span className="font-body-md text-body-md text-on-surface">{profile.phone || 'Not provided'}</span>
                </div>
                <div className="flex items-center gap-md p-md bg-surface-container-low rounded-lg">
                  <span className="material-symbols-outlined text-primary">location_on</span>
                  <span className="font-body-md text-body-md text-on-surface">{profile.address || 'Not provided'}</span>
                </div>
              </div>

              <div className="mt-lg w-full flex gap-md">
                <button
                  onClick={toggleEdit}
                  className="flex-1 py-3 bg-primary text-on-primary font-bold rounded-xl hover:bg-primary-container transition-colors shadow-md"
                >
                  Edit Profile
                </button>
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="flex-1 py-3 bg-surface-container-high text-on-surface-variant font-bold rounded-xl hover:bg-surface-container-highest transition-colors"
                >
                  Change Password
                </button>
              </div>
            </>
          ) : (
            <div className="mt-lg w-full space-y-md text-left">
              <div className="space-y-xs">
                <label className="font-label-sm text-label-sm text-on-surface-variant" htmlFor="p_name">Full Name</label>
                <input id="p_name" value={form.name} onChange={update('name')} className={inputClass} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
                <div className="space-y-xs">
                  <label className="font-label-sm text-label-sm text-on-surface-variant" htmlFor="p_phone">Phone</label>
                  <input id="p_phone" value={form.phone} onChange={update('phone')} className={inputClass} />
                </div>
                <div className="space-y-xs">
                  <label className="font-label-sm text-label-sm text-on-surface-variant" htmlFor="p_plan">Plan</label>
                  <select id="p_plan" value={form.plan} onChange={update('plan')} className={inputClass}>
                    <option>Free Member</option>
                    <option>Pro Member</option>
                    <option>Fleet Member</option>
                    <option>Enterprise</option>
                  </select>
                </div>
              </div>
              <div className="space-y-xs">
                <label className="font-label-sm text-label-sm text-on-surface-variant" htmlFor="p_address">Address</label>
                <textarea id="p_address" value={form.address} onChange={update('address')} rows="2" className={`${inputClass} resize-none`}></textarea>
              </div>

              <div className="flex gap-md pt-sm">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-3 bg-primary text-on-primary font-bold rounded-xl hover:bg-primary-container transition-colors shadow-md disabled:opacity-60 flex items-center justify-center gap-sm"
                >
                  {saving && <span className="material-symbols-outlined animate-spin text-md">progress_activity</span>}
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={toggleEdit}
                  className="flex-1 py-3 bg-surface-container-high text-on-surface-variant font-bold rounded-xl hover:bg-surface-container-highest transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>




      </main>

      {/* BottomNavBar (Mobile Only) */}
      <nav className="fixed bottom-0 w-full z-50 flex justify-around items-center px-container-margin py-sm bg-surface shadow-[0_-4px_16px_0_rgba(11,29,45,0.12)] rounded-t-xl md:hidden">
        <a href={ROUTES.dashboard} onClick={(e) => { e.preventDefault(); navigate(ROUTES.dashboard); }} className="flex flex-col items-center justify-center text-on-secondary-fixed-variant px-4 py-1 hover:bg-surface-container-high transition-all duration-150">
          <span className="material-symbols-outlined">dashboard</span>
          <span className="font-nav-item text-[10px] mt-0.5">Dashboard</span>
        </a>
        <a href={ROUTES.bookings} onClick={(e) => { e.preventDefault(); navigate(ROUTES.bookings); }} className="flex flex-col items-center justify-center text-on-secondary-fixed-variant px-4 py-1 hover:bg-surface-container-high transition-all duration-150">
          <span className="material-symbols-outlined">event_note</span>
          <span className="font-nav-item text-[10px] mt-0.5">Bookings</span>
        </a>
        <a href={ROUTES.bookings} onClick={(e) => { e.preventDefault(); navigate(ROUTES.bookings); }} className="flex flex-col items-center justify-center text-on-secondary-fixed-variant px-4 py-1 hover:bg-surface-container-high transition-all duration-150">
          <span className="material-symbols-outlined">search</span>
          <span className="font-nav-item text-[10px] mt-0.5">Search</span>
        </a>
        <a href={ROUTES.profile} onClick={(e) => { e.preventDefault(); navigate(ROUTES.profile); }} className="flex flex-col items-center justify-center bg-secondary-container text-on-secondary-container rounded-xl px-4 py-1 scale-95 active:scale-90 transition-all duration-150">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
          <span className="font-nav-item text-[10px] mt-0.5">Profile</span>
        </a>
      </nav>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[80] bg-on-background/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-base text-on-surface">Change Password</h3>
              <button 
                onClick={() => setShowPasswordModal(false)}
                className="p-1 rounded-full hover:bg-surface-container-low transition-colors"
              >
                <span className="material-symbols-outlined text-on-surface-variant text-base">close</span>
              </button>
            </div>

            {pwdStatus.error && (
              <div className="p-3 bg-error-container text-on-error-container text-xs rounded-lg flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">error</span>
                <span>{pwdStatus.error}</span>
              </div>
            )}

            {pwdStatus.success && (
              <div className="p-3 bg-emerald-100 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">check_circle</span>
                <span>{pwdStatus.success}</span>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-on-surface font-semibold mb-1">Current Password</label>
                <input 
                  type="password"
                  required
                  className="w-full px-3 py-2 border border-outline-variant rounded-lg outline-none focus:border-primary"
                  value={pwdForm.currentPassword}
                  onChange={(e) => setPwdForm({ ...pwdForm, currentPassword: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-on-surface font-semibold mb-1">New Password (8+ characters)</label>
                <input 
                  type="password"
                  required
                  className="w-full px-3 py-2 border border-outline-variant rounded-lg outline-none focus:border-primary"
                  value={pwdForm.newPassword}
                  onChange={(e) => setPwdForm({ ...pwdForm, newPassword: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-on-surface font-semibold mb-1">Confirm New Password</label>
                <input 
                  type="password"
                  required
                  className="w-full px-3 py-2 border border-outline-variant rounded-lg outline-none focus:border-primary"
                  value={pwdForm.confirmPassword}
                  onChange={(e) => setPwdForm({ ...pwdForm, confirmPassword: e.target.value })}
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t mt-4">
                <button 
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 border rounded-lg text-on-surface-variant font-semibold hover:bg-surface-container-low"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={pwdStatus.submitting}
                  className="px-4 py-2 bg-primary text-on-primary font-semibold rounded-lg hover:bg-primary-container disabled:opacity-60 flex items-center gap-2"
                >
                  {pwdStatus.submitting && <span className="material-symbols-outlined text-xs animate-spin">progress_activity</span>}
                  {pwdStatus.submitting ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {cropSource && (
        <div className="fixed inset-0 z-[120] bg-[#0D1B2A]/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[34px] shadow-[0_30px_100px_rgba(13,27,42,.3)] w-full max-w-lg overflow-hidden border border-[#E0E1DD]">
            <div className="p-5 border-b border-[#E0E1DD] flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-[#0D1B2A]">Adjust profile picture</h3>
                <p className="text-sm text-[#415A77] mt-1">Zoom and position your photo inside the circle.</p>
              </div>
              <button onClick={() => setCropSource('')} className="w-10 h-10 rounded-full bg-[#E0E1DD]/70 text-[#1B263B] grid place-items-center hover:bg-[#778DA9]/25">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="mx-auto w-64 h-64 rounded-full overflow-hidden border-4 border-white ring-4 ring-[#E0E1DD] shadow-[0_18px_50px_rgba(13,27,42,.18)] bg-[#E0E1DD]">
                <img
                  src={cropSource}
                  alt="Profile crop preview"
                  className="w-full h-full object-cover"
                  style={{
                    transform: `translate(${cropSettings.offsetX}px, ${cropSettings.offsetY}px) scale(${cropSettings.zoom})`,
                    transition: 'transform 120ms ease',
                  }}
                />
              </div>

              <label className="block">
                <span className="text-xs font-black uppercase tracking-wider text-[#415A77]">Zoom</span>
                <input
                  type="range"
                  min="1"
                  max="2.5"
                  step="0.05"
                  value={cropSettings.zoom}
                  onChange={(event) => setCropSettings((current) => ({ ...current, zoom: Number(event.target.value) }))}
                  className="w-full mt-2 accent-[#0D1B2A]"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label>
                  <span className="text-xs font-black uppercase tracking-wider text-[#415A77]">Move sideways</span>
                  <input type="range" min="-80" max="80" value={cropSettings.offsetX} onChange={(event) => setCropSettings((current) => ({ ...current, offsetX: Number(event.target.value) }))} className="w-full mt-2 accent-[#0D1B2A]" />
                </label>
                <label>
                  <span className="text-xs font-black uppercase tracking-wider text-[#415A77]">Move up/down</span>
                  <input type="range" min="-80" max="80" value={cropSettings.offsetY} onChange={(event) => setCropSettings((current) => ({ ...current, offsetY: Number(event.target.value) }))} className="w-full mt-2 accent-[#0D1B2A]" />
                </label>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button onClick={() => setCropSource('')} className="flex-1 py-3 rounded-2xl bg-[#E0E1DD] text-[#1B263B] font-black hover:bg-[#778DA9]/30">Cancel</button>
                <button onClick={applyCroppedAvatar} disabled={uploadingAvatar} className="flex-1 py-3 rounded-2xl bg-[#0D1B2A] text-white font-black hover:bg-[#1B263B] disabled:opacity-60">
                  {uploadingAvatar ? 'Setting picture…' : 'Use picture'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;

