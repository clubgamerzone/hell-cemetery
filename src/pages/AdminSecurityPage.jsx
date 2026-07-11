import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { useAuth } from '../context/AuthContext';
import GothicCard from '../components/GothicCard';
import GothicButton from '../components/GothicButton';
import ErrorMessage from '../components/ErrorMessage';
import LoadingSpinner from '../components/LoadingSpinner';
import styles from './LoginPage.module.css';

function getSetupErrorMessage(error) {
  switch (error?.code) {
    case 'auth/requires-recent-login':
      return 'Please log out, sign in again, and then retry two-factor setup.';
    case 'auth/operation-not-allowed':
      return 'Firebase multi-factor authentication is not enabled for this project yet.';
    case 'auth/invalid-verification-code':
      return 'The authenticator code was not accepted.';
    default:
      return error?.message || 'Two-factor setup failed. Please try again.';
  }
}

export default function AdminSecurityPage() {
  const { currentUser, isAdmin, loading, startTotpEnrollment, enrollTotp } = useAuth();
  const [setup, setSetup] = useState(null);
  const [qrImageUrl, setQrImageUrl] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (loading) {
    return <LoadingSpinner message="Checking access..." />;
  }

  if (!currentUser || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  async function handleStartSetup() {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const enrollmentSetup = await startTotpEnrollment(currentUser.email || currentUser.uid);
      setSetup(enrollmentSetup);
      setQrImageUrl(await QRCode.toDataURL(enrollmentSetup.qrCodeUrl, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 220,
      }));
    } catch (err) {
      setError(getSetupErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleEnroll(e) {
    e.preventDefault();
    if (!setup) return;

    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await enrollTotp(setup.secret, code.trim());
      setSuccess('Two-factor authentication is now enabled for this account.');
      setSetup(null);
      setQrImageUrl('');
      setCode('');
    } catch (err) {
      setError(getSetupErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <div className={styles.login}>
        <div className={styles.login__header}>
          <h1>Admin Security</h1>
          <p>Set up two-factor authentication for your site admin account.</p>
        </div>

        <GothicCard flat className={styles.login__card}>
          <ErrorMessage message={error} />
          {success && <div className="notice notice--info">{success}</div>}

          {!setup ? (
            <GothicButton type="button" fullWidth disabled={busy} onClick={handleStartSetup}>
              {busy ? 'Preparing...' : 'Set Up Authenticator App'}
            </GothicButton>
          ) : (
            <form onSubmit={handleEnroll} className={styles.form}>
              {qrImageUrl && (
                <img
                  src={qrImageUrl}
                  alt="Two-factor authentication QR code"
                  className={styles.qrCode}
                />
              )}
              <p className={styles.manualSecret}>
                Manual key: <code>{setup.secret.secretKey}</code>
              </p>
              <div className={styles.form__group}>
                <label htmlFor="totp-code">Authenticator Code</label>
                <input
                  id="totp-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  minLength={6}
                  placeholder="123456"
                />
              </div>
              <GothicButton type="submit" fullWidth disabled={busy || code.trim().length < 6}>
                {busy ? 'Enrolling...' : 'Enable Two-Factor Authentication'}
              </GothicButton>
            </form>
          )}
        </GothicCard>
      </div>
    </div>
  );
}
