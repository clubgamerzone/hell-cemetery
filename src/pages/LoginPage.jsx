import { useState } from 'react';
import { useNavigate, useLocation, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GothicCard from '../components/GothicCard';
import GothicButton from '../components/GothicButton';
import ErrorMessage from '../components/ErrorMessage';
import styles from './LoginPage.module.css';

function getAuthErrorMessage(error) {
  switch (error.code) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in was cancelled before it finished.';
    case 'auth/operation-not-allowed':
      return 'This sign-in method is not enabled in Firebase yet.';
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized in Firebase Authentication settings.';
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with this email using another sign-in method.';
    default:
      return error.message || 'Authentication failed. Please try again.';
  }
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [providerLoading, setProviderLoading] = useState('');
  const [mfaResolver, setMfaResolver] = useState(null);
  const [mfaFactorUid, setMfaFactorUid] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [error, setError] = useState('');

  const {
    login,
    register,
    loginWithApple,
    loginWithFacebook,
    getMfaResolver,
    resolveTotpSignIn,
    currentUser,
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/profile';

  if (currentUser) {
    return <Navigate to={from} replace />;
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      handleAuthFailure(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await register(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      handleAuthFailure(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleProviderLogin(providerName, loginAction) {
    setError('');
    setProviderLoading(providerName);
    try {
      await loginAction();
      navigate(from, { replace: true });
    } catch (err) {
      handleAuthFailure(err);
    } finally {
      setProviderLoading('');
    }
  }

  function handleAuthFailure(err) {
    if (err?.code === 'auth/multi-factor-auth-required') {
      const resolver = getMfaResolver(err);
      const totpHint = resolver.hints.find((hint) => hint.factorId === 'totp') || resolver.hints[0];
      if (!totpHint) {
        setError('This account requires a second factor, but no supported factor was found.');
        return;
      }

      setMfaResolver(resolver);
      setMfaFactorUid(totpHint.uid);
      setError('');
      return;
    }

    setError(getAuthErrorMessage(err));
  }

  async function handleMfaSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await resolveTotpSignIn(mfaResolver, mfaFactorUid, mfaCode.trim());
      navigate(from, { replace: true });
    } catch (err) {
      if (err?.code === 'auth/operation-not-allowed') {
        setError('TOTP two-factor authentication is not enabled in Firebase for this project yet.');
      } else {
        setError(getAuthErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  }

  if (mfaResolver) {
    return (
      <div className="page">
        <div className={styles.login}>
          <div className={styles.login__header}>
            <h1>Two-Factor Check</h1>
            <p>Enter the code from your authenticator app to continue.</p>
          </div>

          <GothicCard flat className={styles.login__card}>
            <ErrorMessage message={error} />
            <form onSubmit={handleMfaSubmit} className={styles.form}>
              <div className={styles.form__group}>
                <label htmlFor="mfa-code">Authenticator Code</label>
                <input
                  id="mfa-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  required
                  minLength={6}
                  placeholder="123456"
                />
              </div>
              <GothicButton type="submit" fullWidth disabled={loading || mfaCode.trim().length < 6}>
                {loading ? 'Verifying...' : 'Verify'}
              </GothicButton>
            </form>
          </GothicCard>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className={styles.login}>
        <div className={styles.login__header}>
          <h1>{isRegistering ? 'Create Account' : 'Enter the Cemetery'}</h1>
          <p>
            {isRegistering
              ? 'Register a new account to link your game progress.'
              : 'Sign in with your game account to view your player profile.'}
          </p>
        </div>

        <GothicCard flat className={styles.login__card}>
          <ErrorMessage message={error} />

          {!isRegistering ? (
            <>
              <div className={styles.providerLogins}>
                <GothicButton
                  type="button"
                  variant="secondary"
                  fullWidth
                  disabled={Boolean(providerLoading) || loading}
                  onClick={() => handleProviderLogin('Apple', loginWithApple)}
                >
                  {providerLoading === 'Apple' ? 'Opening Apple...' : 'Continue with Apple'}
                </GothicButton>
                <GothicButton
                  type="button"
                  variant="ghost"
                  fullWidth
                  disabled={Boolean(providerLoading) || loading}
                  onClick={() => handleProviderLogin('Facebook', loginWithFacebook)}
                >
                  {providerLoading === 'Facebook' ? 'Opening Facebook...' : 'Continue with Facebook'}
                </GothicButton>
              </div>

              <div className={styles.divider}>
                <span>Email sign in</span>
              </div>

              <form onSubmit={handleLogin} className={styles.form}>
                <div className={styles.form__group}>
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="warrior@hellcemetery.game"
                  />
                </div>
                <div className={styles.form__group}>
                  <label htmlFor="password">Password</label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="Password"
                  />
                </div>
                <GothicButton type="submit" fullWidth disabled={loading || Boolean(providerLoading)}>
                  {loading ? 'Signing in...' : 'Login'}
                </GothicButton>
              </form>
            </>
          ) : (
            <form onSubmit={handleRegister} className={styles.form}>
              <div className={styles.form__group}>
                <label htmlFor="reg-email">Email</label>
                <input
                  id="reg-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className={styles.form__group}>
                <label htmlFor="reg-password">Password</label>
                <input
                  id="reg-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  minLength={6}
                />
              </div>
              <div className={styles.form__group}>
                <label htmlFor="confirm-password">Confirm Password</label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
              <GothicButton type="submit" fullWidth disabled={loading || Boolean(providerLoading)}>
                {loading ? 'Creating account...' : 'Create Account'}
              </GothicButton>
            </form>
          )}

          <div className={styles.login__toggle}>
            {!isRegistering ? (
              <p>
                Need an account?{' '}
                <button
                  type="button"
                  className={styles.linkButton}
                  onClick={() => { setIsRegistering(true); setError(''); }}
                >
                  Create Account
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  className={styles.linkButton}
                  onClick={() => { setIsRegistering(false); setError(''); }}
                >
                  Sign In
                </button>
              </p>
            )}
          </div>
        </GothicCard>

        <p className={styles.login__back}>
          <Link to="/">Return to Home</Link>
        </p>
      </div>
    </div>
  );
}
