import { useEffect, useState } from 'react';
import { buildUrl } from '../../services/api';
import { Spinner } from '../ui';

function GoogleIcon() {
  return (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#0A66C2" d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V8.98h3.42v1.57h.05c.47-.9 1.64-1.85 3.37-1.85 3.61 0 4.27 2.37 4.27 5.46v6.29ZM5.32 7.41a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.1 20.45H3.54V8.98H7.1v11.47Z" />
    </svg>
  );
}

const PROVIDERS = [['google', 'Google', GoogleIcon], ['linkedin', 'LinkedIn', LinkedInIcon]];

// Fetched once per page load; the list only changes when the server restarts.
let providersPromise = null;
const loadProviders = () => {
  providersPromise ||= fetch(buildUrl('/auth/oauth/providers'), { credentials: 'include' })
    .then((response) => (response.ok ? response.json() : { providers: [] }))
    .then((data) => data.providers || [])
    .catch(() => []);
  return providersPromise;
};

/**
 * Google and LinkedIn sign-in. A provider without server credentials stays
 * visible but disabled, so the option never fails after a click.
 */
export default function SocialSignIn({ label = 'or continue with' }) {
  const [enabled, setEnabled] = useState(null);
  const [leaving, setLeaving] = useState('');

  useEffect(() => {
    let active = true;
    loadProviders().then((list) => { if (active) setEnabled(list); });
    return () => { active = false; };
  }, []);

  const start = (provider) => {
    setLeaving(provider);
    window.location.assign(buildUrl(`/auth/oauth/${provider}`));
  };
  const noneConfigured = Array.isArray(enabled) && enabled.length === 0;

  return (
    <>
      <div className="my-6 flex items-center gap-3 text-xs text-subtle"><span className="divider flex-1" />{label}<span className="divider flex-1" /></div>
      <div className="grid grid-cols-2 gap-3">
        {PROVIDERS.map(([id, name, Icon]) => {
          const ready = enabled?.includes(id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => start(id)}
              disabled={!ready || Boolean(leaving)}
              className="btn btn-secondary"
              title={enabled && !ready ? `${name} sign-in is not set up on this server yet` : `Continue with ${name}`}
            >
              {leaving === id ? <Spinner /> : <Icon />} {name}
            </button>
          );
        })}
      </div>
      {noneConfigured && <p className="mt-2 text-center text-[12px] text-subtle">Social sign-in becomes available once an administrator connects Google or LinkedIn.</p>}
    </>
  );
}
