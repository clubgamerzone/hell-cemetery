import { useState } from 'react';
import { useNavigate, useLocation, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import GothicCard from '../components/GothicCard';
import GothicButton from '../components/GothicButton';
import ErrorMessage from '../components/ErrorMessage';
import styles from './LoginPage.module.css';

function getAuthErrorMessage(error, t) {
  switch (error.code) {
    case 'auth/invalid-email':
      return t('login.invalidEmail');
    case 'auth/user-disabled':
      return t('login.disabled');
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return t('login.invalidCredential');
    case 'auth/email-already-in-use':
      return t('login.emailExists');
    case 'auth/weak-password':
      return t('login.weakPassword');
    case 'auth/too-many-requests':
      return t('login.tooMany');
    case 'auth/popup-closed-by-user':
      return t('login.cancelled');
    case 'auth/operation-not-allowed':
      return t('login.providerDisabled');
    case 'auth/unauthorized-domain':
      return t('login.unauthorizedDomain');
    case 'auth/account-exists-with-different-credential':
      return t('login.accountDifferentCredential');
    default:
      return error.message || t('login.authFailed');
  }
}

export default function LoginPage() {
  const { t } = useLanguage();
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
      setError(t('login.passwordMismatch'));
      return;
    }

    if (password.length < 6) {
      setError(t('login.weakPassword'));
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
        setError(t('login.noFactor'));
        return;
      }

      setMfaResolver(resolver);
      setMfaFactorUid(totpHint.uid);
      setError('');
      return;
    }

    setError(getAuthErrorMessage(err, t));
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
        setError(t('login.totpNotEnabled'));
      } else {
        setError(getAuthErrorMessage(err, t));
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
            <h1>{t('login.mfaTitle')}</h1>
            <p>{t('login.mfaSubtitle')}</p>
          </div>

          <GothicCard flat className={styles.login__card}>
            <ErrorMessage message={error} />
            <form onSubmit={handleMfaSubmit} className={styles.form}>
              <div className={styles.form__group}>
                <label htmlFor="mfa-code">{t('login.authenticatorCode')}</label>
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
                {loading ? t('login.verifying') : t('login.verify')}
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
          <h1>{isRegistering ? t('login.createAccount') : t('login.enter')}</h1>
          <p>
            {isRegistering
              ? t('login.registerSubtitle')
              : t('login.signInSubtitle')}
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
                  {providerLoading === 'Apple' ? t('login.appleOpening') : t('login.apple')}
                </GothicButton>
                <GothicButton
                  type="button"
                  variant="ghost"
                  fullWidth
                  disabled={Boolean(providerLoading) || loading}
                  onClick={() => handleProviderLogin('Facebook', loginWithFacebook)}
                >
                  {providerLoading === 'Facebook' ? t('login.facebookOpening') : t('login.facebook')}
                </GothicButton>
              </div>

              <div className={styles.divider}>
                <span>{t('login.emailSignIn')}</span>
              </div>

              <form onSubmit={handleLogin} className={styles.form}>
                <div className={styles.form__group}>
                  <label htmlFor="email">{t('login.email')}</label>
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
                  <label htmlFor="password">{t('login.password')}</label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder={t('login.password')}
                  />
                </div>
                <GothicButton type="submit" fullWidth disabled={loading || Boolean(providerLoading)}>
                  {loading ? t('login.signingIn') : t('nav.login')}
                </GothicButton>
              </form>
            </>
          ) : (
            <form onSubmit={handleRegister} className={styles.form}>
              <div className={styles.form__group}>
                <label htmlFor="reg-email">{t('login.email')}</label>
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
                <label htmlFor="reg-password">{t('login.password')}</label>
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
                <label htmlFor="confirm-password">{t('login.confirmPassword')}</label>
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
                {loading ? t('login.creating') : t('login.createAccount')}
              </GothicButton>
            </form>
          )}

          <div className={styles.login__toggle}>
            {!isRegistering ? (
              <p>
                {t('login.needAccount')}{' '}
                <button
                  type="button"
                  className={styles.linkButton}
                  onClick={() => { setIsRegistering(true); setError(''); }}
                >
                  {t('login.createAccount')}
                </button>
              </p>
            ) : (
              <p>
                {t('login.haveAccount')}{' '}
                <button
                  type="button"
                  className={styles.linkButton}
                  onClick={() => { setIsRegistering(false); setError(''); }}
                >
                  {t('login.signIn')}
                </button>
              </p>
            )}
          </div>
        </GothicCard>

        <p className={styles.login__back}>
          <Link to="/">{t('login.returnHome')}</Link>
        </p>
      </div>
    </div>
  );
}
