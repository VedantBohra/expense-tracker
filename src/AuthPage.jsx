import { useState, useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, Lock, KeyRound, ArrowLeft, Lightbulb, LightbulbOff, Eye, EyeOff } from 'lucide-react';

const ERROR_EN = {
  'Email and password required': 'Email and password are required',
  'Email already in use': 'That email is already in use',
  'Registration failed': 'Registration failed',
  'Invalid credentials': 'Incorrect email or password',
  'Login failed': 'Login failed',
  'Email is required': 'Email address is required',
  'No account found with that email': 'No account was found for that email',
  'Failed to generate reset token': 'Could not generate a reset token',
  'Token and new password are required': 'A token and a new password are required',
  'Invalid reset token': 'The reset token is invalid',
  'Reset token has expired': 'The reset token has expired',
  'Failed to reset password': 'Could not reset the password',
};

const translateError = (msg) => ERROR_EN[msg] || 'Something went wrong';
const DEMO_EMAIL = 'demo@example.com';
const DEMO_PASSWORD = 'password123';

function Enso() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <svg
        className="wabi-enso absolute left-1/2 top-1/2 h-128 w-lg -translate-x-1/2 -translate-y-1/2 text-(--sumi)"
        viewBox="0 0 240 240"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <filter id="wabiInk" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.018 0.03" numOctaves="2" seed="8" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="9" />
          </filter>
        </defs>
        <path
          d="M 203 150 A 88 88 0 1 1 203 90"
          stroke="currentColor"
          strokeWidth="9"
          strokeLinecap="round"
          opacity="0.13"
          filter="url(#wabiInk)"
        />
      </svg>
    </div>
  );
}

function Mark() {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="whitespace-nowrap text-3xl leading-none tracking-[0.12em] text-(--sumi)">Expense Tracker</div>
      <span className="wabi-seal" aria-hidden="true">ET</span>
    </div>
  );
}

function Field({ icon: Icon, label, ...props }) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-sm text-(--sumi-soft)">
        <Icon className="size-3.5" strokeWidth={1.5} />
        {label}
      </span>
      <Input className="wabi-input" aria-label={label} {...props} />
    </label>
  );
}

function PasswordField({ label, value, onChange, disabled, required }) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-sm text-(--sumi-soft)">
        <Lock className="size-3.5" strokeWidth={1.5} />
        {label}
      </span>
      <div className="relative">
        <Input
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          aria-label={label}
          className="wabi-input pr-10"
        />
        <button
          type="button"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          onClick={() => setShowPassword((prev) => !prev)}
          className="absolute right-0 top-1/2 -translate-y-1/2 rounded p-2 text-(--sumi-soft) transition-colors hover:text-(--sumi)"
        >
          {showPassword ? <EyeOff className="size-4" strokeWidth={1.7} /> : <Eye className="size-4" strokeWidth={1.7} />}
        </button>
      </div>
    </label>
  );
}

function Quiet({ children, ...props }) {
  return (
    <button
      type="button"
      className="cursor-pointer text-sm text-(--sumi-soft) underline-offset-4 transition-colors hover:text-(--sumi) hover:cursor-pointer"
      {...props}
    >
      {children}
    </button>
  );
}

const KANJI_LATIN_GLYPHS = {
  A: ['M1,18 L6,1 L11,18', 'M3.5,11 L8.5,10.5'],
  D: ['M2,1 L2,18', 'M2,1 L8,4 L8,15 L2,18'],
  E: ['M2,1 L2,18', 'M2,1 L10,1', 'M2,9.5 L8,9.5', 'M2,18 L10,18'],
  G: ['M10,3 L4,1 L1,5 L1,14 L4,18 L10,16', 'M6,10 L10,10 L10,15'],
  I: ['M6,1 L6,18', 'M3,1 L9,1', 'M3,18 L9,18'],
  K: ['M2,1 L2,18', 'M2,10 L10,1', 'M2,10 L10,18'],
  L: ['M2,1 L2,18', 'M2,18 L9,18'],
  N: ['M2,1 L2,18', 'M2,1 L10,18', 'M10,1 L10,18'],
  O: ['M6,1 L10,4 L10,15 L6,18 L2,15 L2,4 Z'],
  P: ['M2,1 L2,18', 'M2,1 L8,1 L9,6 L8,9.5 L2,9.5'],
  R: ['M2,1 L2,18', 'M2,1 L8,1 L9,6 L8,9.5 L2,9.5', 'M5,9.5 L10,18'],
  S: ['M9,3 L3,3 L3,9 L9,9 L9,15 L3,15'],
  T: ['M1,1 L11,1', 'M6,1 L6,18'],
  U: ['M2,1 L2,14 L6,18 L10,14 L10,1'],
  X: ['M2,1 L10,18', 'M10,1 L2,18'],
};

function KanjiLatin({ text }) {
  return (
    <span className="inline-flex items-center gap-0.75">
      {text.toUpperCase().split('').map((ch, i) =>
        ch === ' ' ? (
          <span key={i} className="inline-block w-1.5" />
        ) : (
          <svg
            key={i}
            viewBox="0 0 12 19"
            className="h-3.5 w-auto"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {(KANJI_LATIN_GLYPHS[ch] || []).map((d, j) => (
              <path key={j} d={d} />
            ))}
          </svg>
        )
      )}
    </span>
  );
}

function TranslatedButton({ en, className, ...props }) {
  return (
    <div className="group relative w-full">
      <Button className={className} {...props} />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 flex w-full -translate-x-1/2 justify-center text-(--sumi-soft) opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      >
        <KanjiLatin text={en} />
      </div>
    </div>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme !== 'light';

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Turn on the light' : 'Turn off the light'}
      className="absolute right-5 top-5 z-20 rounded-full border border-(--sumi-soft)/25 p-2.5 text-(--sumi-soft) transition-colors hover:border-(--shu) hover:text-(--shu) hover:cursor-pointer"
    >
      {isDark ? <Lightbulb className="size-4" strokeWidth={1.5} /> : <LightbulbOff className="size-4" strokeWidth={1.5} />}
    </button>
  );
}

function Shell({ children }) {
  return (
    <div className="wabi relative flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <ThemeToggle />
      <Enso />
      <div className="relative z-10 flex w-full max-w-xs flex-col items-center gap-10">
        <Mark />
        {children}
      </div>
    </div>
  );
}

function AuthPage({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [view, setView] = useState('auth');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const submitButtonRef = useRef(null);
  const demoLoginTimeoutRef = useRef(null);

  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [tokenExpiresAt, setTokenExpiresAt] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [copied, setCopied] = useState(false);

  const [tokenInput, setTokenInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  useEffect(() => {
    if (!tokenExpiresAt) return;
    let id;
    const tick = () => {
      const remaining = Math.max(0, Math.round((tokenExpiresAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining <= 0) clearInterval(id);
    };
    tick();
    id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [tokenExpiresAt]);

  const tokenExpired = tokenExpiresAt !== null && secondsLeft <= 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(translateError(data.error));
        return;
      }

      localStorage.setItem('token', data.token);
      onLogin(data.user);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(translateError(data.error));
        return;
      }
      setResetToken(data.resetToken);
      setTokenExpiresAt(Date.now() + 15 * 60 * 1000);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(resetToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenInput, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(translateError(data.error));
        return;
      }
      setResetSuccess(true);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    setView('auth');
    setError('');
    setForgotEmail('');
    setResetToken('');
    setTokenExpiresAt(null);
    setCopied(false);
    setTokenInput('');
    setNewPassword('');
    setResetSuccess(false);
  };

  const handleDemoFill = () => {
    if (!isLogin || loading || demoLoginTimeoutRef.current !== null) return;

    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setError('');
    demoLoginTimeoutRef.current = setTimeout(() => {
      demoLoginTimeoutRef.current = null;
      submitButtonRef.current?.click();
    }, 200);
  };

  const Err = () => error && <p className="text-sm text-(--shu)">{error}</p>;

  if (view === 'forgot') {
    return (
      <Shell>
        {!resetToken ? (
          <form onSubmit={handleForgot} className="flex w-full flex-col gap-6">
            <Field
              icon={Mail}
              label="Email"
              type="email"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              disabled={loading}
              required
            />
            <Err />
            <TranslatedButton type="submit" className="wabi-btn" en="Get Token" disabled={loading}>
              {loading ? '...' : 'Get token'}
            </TranslatedButton>
            <div className="flex justify-center">
              <Quiet onClick={goBack}>
                <ArrowLeft className="mr-1 inline size-3.5" strokeWidth={1.5} />Back
              </Quiet>
            </div>
          </form>
        ) : (
          <div className="flex w-full flex-col gap-5">
            {tokenExpired ? (
              <p className="text-center text-sm text-(--shu)">Expired — start again from the beginning.</p>
            ) : (
              <p className="text-center text-sm text-(--sumi-soft)">
                Expires in{' '}
                <span className={secondsLeft <= 60 ? 'text-(--shu)' : ''}>
                  {String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:{String(secondsLeft % 60).padStart(2, '0')}
                </span>
              </p>
            )}
            <div className="flex items-center gap-2">
              <Input value={resetToken} readOnly className="wabi-input font-mono text-xs" />
              <Button type="button" onClick={handleCopy} className="wabi-btn h-11 w-auto shrink-0 px-4 tracking-normal hover:cursor-pointer">
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <TranslatedButton
              className="wabi-btn"
              en="Next"
              disabled={tokenExpired}
              onClick={() => {
                setView('reset');
                setTokenInput(resetToken);
                setError('');
              }}
            >
              Continue
            </TranslatedButton>
            <div className="flex justify-center">
              <Quiet onClick={goBack}>
                <ArrowLeft className="mr-1 inline size-3.5" strokeWidth={1.5} />Back
              </Quiet>
            </div>
          </div>
        )}
      </Shell>
    );
  }

  if (view === 'reset') {
    return (
      <Shell>
        {resetSuccess ? (
          <div className="flex w-full flex-col gap-6">
            <p className="text-center text-base text-(--sumi)">Password updated successfully.</p>
            <TranslatedButton className="wabi-btn" en="Login" onClick={goBack}>Log in</TranslatedButton>
          </div>
        ) : (
          <form onSubmit={handleReset} className="flex w-full flex-col gap-6">
            <Field
              icon={KeyRound}
              label="Token"
              type="text"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="wabi-input font-mono text-xs"
              disabled={loading}
              required
            />
            <PasswordField
              label="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading}
              required
            />
            <Err />
            <TranslatedButton type="submit" className="wabi-btn" en="Update" disabled={loading}>
              {loading ? '...' : 'Update password'}
            </TranslatedButton>
            <div className="flex justify-center">
              <Quiet onClick={goBack}>
                <ArrowLeft className="mr-1 inline size-3.5" strokeWidth={1.5} />Back
              </Quiet>
            </div>
          </form>
        )}
      </Shell>
    );
  }

  return (
    <Shell>
      <form onSubmit={handleSubmit} className="flex w-full flex-col gap-6">
        <Field
          icon={Mail}
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          required
        />
        <PasswordField
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          required
        />
        <Err />
        <TranslatedButton
          ref={submitButtonRef}
          type="submit"
          className="wabi-btn"
          en={isLogin ? 'Login' : 'Register'}
          disabled={loading}
        >
          {loading ? '...' : isLogin ? 'Sign in' : 'Create account'}
        </TranslatedButton>

        <button
          type="button"
          onClick={handleDemoFill}
          className="wabi-btn h-10! border border-(--sumi-line) bg-transparent text-(--sumi) hover:cursor-pointer hover:opacity-100"
        >
          Sign in as demo guest
        </button>

        <div className="flex flex-col items-center gap-3 pt-1">
          {isLogin && (
            <Quiet onClick={() => { setView('forgot'); setError(''); }}>
              Forgot password?
            </Quiet>
          )}
          <div className="flex items-center gap-2 text-sm text-(--sumi-soft)">
            <span className="h-px w-6 bg-(--sumi-line)" />
            <Quiet onClick={() => { setIsLogin(!isLogin); setError(''); }}>
              {isLogin ? 'Create account' : 'Back to sign in'}
            </Quiet>
            <span className="h-px w-6 bg-(--sumi-line)" />
          </div>
        </div>
      </form>
    </Shell>
  );
}

export default AuthPage;
