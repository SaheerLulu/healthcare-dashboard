import { useEffect, useState } from 'react';
import { AlertCircle, CornerDownLeft, Eye, EyeOff, Loader2 } from 'lucide-react';

/**
 * Sign-in page — same layout, palette and credentials as the pharmacy
 * and accounting apps (the backend authenticates against the shared
 * auth_user table and signs JWTs with the shared key).
 *
 * The pharmacy app's CSS variables aren't loaded here, so the palette
 * is pinned to the same values inline.
 */
const C = {
  brand: '#2a9d8f',
  ink: '#1a2b32',
  ink2: '#5b6b71',
  ink3: '#94a1a6',
  line: '#dfe3e4',
  danger: '#c0392b',
};

export function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('access_token')) {
      window.location.href = '/';
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim()) {
      setError('Please enter your username.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      let data: any = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok || !data?.ok) {
        setError(data?.error?.message || `Login failed (${response.status})`);
        return;
      }

      localStorage.setItem('access_token', data.data.access_token);
      localStorage.setItem('refresh_token', data.data.refresh_token);
      localStorage.setItem('auth_user', JSON.stringify(data.data.user));
      window.location.href = '/';
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid" style={{ gridTemplateColumns: '1.1fr 1fr' }}>
      {/* Left — dark product panel */}
      <div
        className="relative flex flex-col p-10 md:p-14 overflow-hidden"
        style={{ background: '#0c1e25', color: 'white' }}
      >
        {/* faint grid */}
        <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.06 }} aria-hidden>
          <defs>
            <pattern id="seefgrid" width="24" height="24" patternUnits="userSpaceOnUse">
              <path d="M24 0H0V24" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#seefgrid)" />
        </svg>

        {/* Wordmark */}
        <div className="relative flex items-center">
          <span
            style={{
              fontFamily: 'Inter, system-ui, sans-serif',
              fontWeight: 700,
              fontSize: 22,
              letterSpacing: '-0.04em',
              lineHeight: 1,
              display: 'inline-flex',
              alignItems: 'baseline',
            }}
          >
            <span style={{ color: 'white' }}>seef</span>
            <span style={{ color: C.brand }}>med</span>
            <span style={{ color: C.brand }}>.</span>
          </span>
        </div>

        {/* Promise */}
        <div className="flex-1 flex flex-col justify-center relative max-w-lg">
          <div
            className="uppercase"
            style={{
              fontSize: 10,
              color: '#5e8a92',
              letterSpacing: '0.14em',
              marginBottom: 14,
              fontFamily: 'ui-monospace, monospace',
            }}
          >
            Analytics dashboards · v1
          </div>
          <div
            style={{
              fontSize: 36,
              fontWeight: 600,
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
              color: 'white',
            }}
          >
            Every till, batch and GST rupee on one screen.
          </div>
          <div
            style={{
              fontSize: 14,
              color: '#8fb3b8',
              marginTop: 14,
              lineHeight: 1.55,
              maxWidth: 440,
            }}
          >
            Executive KPIs, drill-through reports and compliance health across the whole
            pharmacy network — refreshed every five minutes.
          </div>
        </div>

        {/* Trust strip */}
        <div
          className="relative grid gap-8 md:gap-12"
          style={{
            gridTemplateColumns: 'repeat(3, minmax(0,auto))',
            paddingTop: 18,
            borderTop: '1px solid rgba(255,255,255,0.10)',
          }}
        >
          <div>
            <div
              className="uppercase"
              style={{ fontSize: 9, color: '#5e8a92', letterSpacing: '0.1em', fontFamily: 'ui-monospace, monospace' }}
            >
              Hosted
            </div>
            <div style={{ fontSize: 12, color: '#cfe1e3', marginTop: 4 }}>Mumbai · 99.97% uptime</div>
          </div>
          <div>
            <div
              className="uppercase"
              style={{ fontSize: 9, color: '#5e8a92', letterSpacing: '0.1em', fontFamily: 'ui-monospace, monospace' }}
            >
              On-call
            </div>
            <div style={{ fontSize: 12, color: '#cfe1e3', marginTop: 4, fontFamily: 'ui-monospace, monospace' }}>
              +91 80 4718 2200
            </div>
          </div>
          <div>
            <div
              className="uppercase"
              style={{ fontSize: 9, color: '#5e8a92', letterSpacing: '0.1em', fontFamily: 'ui-monospace, monospace' }}
            >
              Compliance
            </div>
            <div style={{ fontSize: 12, color: '#cfe1e3', marginTop: 4 }}>GST · DPDP · ISO 27001</div>
          </div>
        </div>
      </div>

      {/* Right — form on warm paper */}
      <div className="flex flex-col justify-center p-10 md:p-14" style={{ background: '#FAFAF8' }}>
        <form onSubmit={handleSubmit} className="w-full max-w-sm mx-auto">
          <div style={{ fontSize: 22, fontWeight: 600, color: C.ink, letterSpacing: '-0.01em' }}>
            Sign in
          </div>
          <div style={{ fontSize: 13, color: C.ink2, marginTop: 4, marginBottom: 24 }}>
            to your pharmacy's dashboards
          </div>

          {error && (
            <div
              className="mb-5 px-3 py-2.5 rounded-md flex items-start gap-2.5"
              style={{
                background: 'rgba(192,57,43,0.07)',
                border: '1px solid rgba(192,57,43,0.25)',
              }}
            >
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: C.danger }} />
              <p className="text-sm" style={{ color: C.danger }}>{error}</p>
            </div>
          )}

          {/* Username */}
          <label
            className="uppercase block"
            style={{
              fontSize: 10,
              color: C.ink2,
              letterSpacing: '0.08em',
              fontWeight: 600,
              marginBottom: 6,
              fontFamily: 'ui-monospace, monospace',
            }}
            htmlFor="username"
          >
            Work email or username
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoFocus
            disabled={isSubmitting}
            placeholder="arjun@pharmacy.in"
            className="w-full h-10 px-3 rounded-md text-sm outline-none transition-colors"
            style={{ border: `1px solid ${C.line}`, background: 'white', color: C.ink }}
            onFocus={(e) => (e.currentTarget.style.borderColor = C.ink)}
            onBlur={(e) => (e.currentTarget.style.borderColor = C.line)}
          />

          {/* Password */}
          <div className="flex justify-between items-baseline mt-4 mb-1.5">
            <label
              htmlFor="password"
              className="uppercase"
              style={{
                fontSize: 10,
                color: C.ink2,
                letterSpacing: '0.08em',
                fontWeight: 600,
                fontFamily: 'ui-monospace, monospace',
              }}
            >
              Password
            </label>
            <button
              type="button"
              className="uppercase"
              style={{
                fontSize: 10,
                color: C.brand,
                fontWeight: 600,
                letterSpacing: '0.05em',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'ui-monospace, monospace',
              }}
              onClick={() => alert('Contact your administrator to reset your password.')}
            >
              Forgot?
            </button>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={isSubmitting}
              placeholder="••••••••••"
              className="w-full h-10 pl-3 pr-10 rounded-md text-sm outline-none transition-colors"
              style={{ border: `1px solid ${C.line}`, background: 'white', color: C.ink }}
              onFocus={(e) => (e.currentTarget.style.borderColor = C.ink)}
              onBlur={(e) => (e.currentTarget.style.borderColor = C.line)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded hover:bg-gray-100"
              style={{ color: C.ink2 }}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-6 py-3 px-4 rounded-md text-white font-semibold flex items-center justify-center gap-2 disabled:cursor-not-allowed"
            style={{
              background: isSubmitting ? C.ink2 : C.ink,
              opacity: isSubmitting ? 0.7 : 1,
              fontSize: 13.5,
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Signing in…</span>
              </>
            ) : (
              <>
                <span>Sign in</span>
                <span
                  className="flex items-center justify-center rounded"
                  style={{ fontSize: 10, padding: '1px 6px', background: 'rgba(255,255,255,0.15)' }}
                >
                  <CornerDownLeft className="w-3 h-3" />
                </span>
              </>
            )}
          </button>

          <p
            className="uppercase text-center"
            style={{
              fontSize: 9,
              color: C.ink3,
              letterSpacing: '0.1em',
              marginTop: 24,
              fontFamily: 'ui-monospace, monospace',
            }}
          >
            Secure · encrypted · same sign-in as pharmacy &amp; accounting
          </p>
        </form>
      </div>
    </div>
  );
}
