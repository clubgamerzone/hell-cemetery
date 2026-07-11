import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useAuth } from '../context/AuthContext';
import {
  getPlayerProfile,
  getPlayerCharacter,
  getPlayerCastle,
  getPlayerRaidHistory,
  getPlayerMarket,
  hasMeaningfulData,
} from '../firebase/databaseService';
import { parsePlayerCharacter, hasCharacterData } from '../utils/playerParser';
import GothicCard from '../components/GothicCard';
import GothicButton from '../components/GothicButton';
import CharacterInfoCard from '../components/CharacterInfoCard';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import CollapsibleJson from '../components/CollapsibleJson';
import styles from './ProfilePage.module.css';

function getTwoFactorErrorMessage(error) {
  switch (error?.code) {
    case 'auth/requires-recent-login':
      return 'Please log out, sign in again, and then retry this security change.';
    case 'auth/invalid-verification-code':
      return 'The authenticator code was not accepted.';
    default:
      return error?.message || 'Two-factor authentication update failed.';
  }
}

function AdminTwoFactorPanel() {
  const {
    currentUser,
    getTotpFactors,
    startTotpEnrollment,
    enrollTotp,
    unenrollTotp,
  } = useAuth();
  const [setup, setSetup] = useState(null);
  const [qrImageUrl, setQrImageUrl] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const totpFactors = getTotpFactors();
  const hasTotp = totpFactors.length > 0;

  async function handleStartSetup() {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const enrollmentSetup = await startTotpEnrollment(currentUser.email || currentUser.uid);
      setSetup(enrollmentSetup);
      setQrImageUrl(await QRCode.toDataURL(enrollmentSetup.qrCodeUrl, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 220,
      }));
    } catch (err) {
      setError(getTwoFactorErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleEnroll(event) {
    event.preventDefault();
    if (!setup) return;

    setBusy(true);
    setError('');
    setMessage('');
    try {
      await enrollTotp(setup.secret, code.trim());
      setMessage('Two-factor authentication is enabled.');
      setSetup(null);
      setQrImageUrl('');
      setCode('');
    } catch (err) {
      setError(getTwoFactorErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleDisable() {
    const factorUid = totpFactors[0]?.uid;
    if (!factorUid) return;

    setBusy(true);
    setError('');
    setMessage('');
    try {
      await unenrollTotp(factorUid);
      setMessage('Two-factor authentication is disabled.');
      setSetup(null);
      setQrImageUrl('');
      setCode('');
    } catch (err) {
      setError(getTwoFactorErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <GothicCard title="Admin Two-Factor Authentication" flat className={styles.accountCard}>
      {error && <ErrorMessage message={error} />}
      {message && <div className="notice notice--info">{message}</div>}

      {!setup && (
        <div className={styles.securityActions}>
          <p className={styles.securityText}>
            Status: {hasTotp ? 'Enabled' : 'Disabled'}
          </p>
          {hasTotp ? (
            <GothicButton type="button" variant="ghost" size="small" onClick={handleDisable} disabled={busy}>
              {busy ? 'Disabling...' : 'Disable Two-Factor'}
            </GothicButton>
          ) : (
            <GothicButton type="button" size="small" onClick={handleStartSetup} disabled={busy}>
              {busy ? 'Preparing...' : 'Enable Two-Factor'}
            </GothicButton>
          )}
        </div>
      )}

      {setup && (
        <form onSubmit={handleEnroll} className={styles.securityForm}>
          {qrImageUrl && (
            <img
              src={qrImageUrl}
              alt="Two-factor authentication QR code"
              className={styles.qrCode}
            />
          )}
          <p className={styles.securityText}>
            Manual key: <code>{setup.secret.secretKey}</code>
          </p>
          <label className={styles.securityField} htmlFor="totp-code">
            <span>Authenticator Code</span>
            <input
              id="totp-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              required
              minLength={6}
              placeholder="123456"
            />
          </label>
          <div className={styles.securityActions}>
            <GothicButton type="submit" size="small" disabled={busy || code.trim().length < 6}>
              {busy ? 'Enabling...' : 'Finish Setup'}
            </GothicButton>
            <GothicButton
              type="button"
              variant="ghost"
              size="small"
              onClick={() => {
                setSetup(null);
                setQrImageUrl('');
                setCode('');
                setError('');
              }}
              disabled={busy}
            >
              Cancel
            </GothicButton>
          </div>
        </form>
      )}
    </GothicCard>
  );
}

function DataSection({ title, data, path, showDebug = false }) {
  if (!hasMeaningfulData(data)) {
    return (
      <GothicCard title={title} flat>
        <p className={styles.noData}>No data found at this path.</p>
        {showDebug && path && <p className={styles.pathHint}>Checked: <code>{path}</code></p>}
      </GothicCard>
    );
  }

  return (
    <GothicCard title={title} flat>
      {showDebug && path && <p className={styles.pathHint}>Source: <code>{path}</code></p>}
      {showDebug ? (
        <CollapsibleJson data={data} title="View Data" />
      ) : (
        renderKeyValue(data) || <p className={styles.noData}>No summary is available.</p>
      )}
    </GothicCard>
  );
}

function renderKeyValue(data) {
  if (!data || typeof data !== 'object') return null;
  const entries = Object.entries(data).filter(
    ([, value]) => typeof value !== 'object' || value === null
  );
  if (entries.length === 0) return null;

  return (
    <dl className={styles.kvList}>
      {entries.slice(0, 12).map(([key, value]) => (
        <div key={key} className={styles.kvItem}>
          <dt>{key}</dt>
          <dd>{value === null ? '—' : String(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function ProfilePage() {
  const { currentUser, isAdmin, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [character, setCharacter] = useState({ data: null, path: null, checkedPaths: [] });
  const [profile, setProfile] = useState({ data: null, path: null });
  const [castle, setCastle] = useState({ data: null, path: null });
  const [raidHistory, setRaidHistory] = useState({ data: null, path: null });
  const [market, setMarket] = useState({ data: null, path: null });

  const parsedCharacter = parsePlayerCharacter(character.data);

  async function loadProfile() {
    if (!currentUser) return;

    setLoading(true);
    setError('');

    try {
      const uid = currentUser.uid;
      const [characterResult, profileResult, castleResult, raidResult, marketResult] = await Promise.all([
        getPlayerCharacter(uid),
        getPlayerProfile(uid),
        getPlayerCastle(uid),
        getPlayerRaidHistory(uid),
        getPlayerMarket(uid),
      ]);

      setCharacter(characterResult);
      setProfile(profileResult);
      setCastle(castleResult);
      setRaidHistory(raidResult);
      setMarket(marketResult);
    } catch (err) {
      setError('Failed to load profile data. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, [currentUser]);

  const hasAnyData =
    hasCharacterData(parsedCharacter) ||
    hasMeaningfulData(profile.data) ||
    hasMeaningfulData(castle.data) ||
    hasMeaningfulData(raidHistory.data) ||
    hasMeaningfulData(market.data);

  return (
    <div className="page">
      <div className={styles.header}>
        <div>
          <h1>Player Profile</h1>
          <p className={styles.subtitle}>Your journey through Hell Cemetery</p>
        </div>
        <GothicButton variant="ghost" size="small" onClick={logout}>
          Logout
        </GothicButton>
      </div>

      <div className="notice notice--info">
        This page shows the data linked to your logged-in Firebase account.
      </div>

      <GothicCard title="Account Information" flat className={styles.accountCard}>
        <dl className={styles.kvList}>
          <div className={styles.kvItem}>
            <dt>Email</dt>
            <dd>{currentUser?.email || 'Not available'}</dd>
          </div>
          {isAdmin && (
            <div className={styles.kvItem}>
              <dt>Firebase UID</dt>
              <dd className={styles.uid}>{currentUser?.uid}</dd>
            </div>
          )}
        </dl>
      </GothicCard>

      {isAdmin && <AdminTwoFactorPanel />}

      {loading && <LoadingSpinner message="Loading profile data..." />}
      <ErrorMessage message={error} onRetry={loadProfile} />

      {!loading && !error && (
        <section className={styles.characterSection}>
          <h2 className="section-title">Character Information</h2>
          <CharacterInfoCard
            character={parsedCharacter}
            sourcePath={character.path}
            rawData={character.data}
            showDebug={isAdmin}
          />
          {isAdmin && !character.path && character.checkedPaths?.length > 0 && (
            <p className={styles.pathHint}>
              Searched: {character.checkedPaths.join(', ')}
            </p>
          )}
        </section>
      )}

      {!loading && !error && !hasAnyData && (
        <div className="empty-state">
          No game profile data found for this account yet.
        </div>
      )}

      {!loading && !error && hasAnyData && (
        <div className={styles.sections}>
          <section>
            <h2 className="section-title">Player Information</h2>
            {hasMeaningfulData(profile.data) ? (
              <GothicCard flat>
                {renderKeyValue(profile.data)}
                {isAdmin && <CollapsibleJson data={profile.data} title="Full Player Data" />}
              </GothicCard>
            ) : (
              <DataSection title="Player Data" data={profile.data} path={profile.path} showDebug={isAdmin} />
            )}
          </section>

          <section>
            <h2 className="section-title">Castle Information</h2>
            <DataSection title="Player Castle" data={castle.data} path={castle.path} showDebug={isAdmin} />
          </section>

          <section>
            <h2 className="section-title">Market Information</h2>
            <DataSection title="Player Market" data={market.data} path={market.path} showDebug={isAdmin} />
          </section>

          <section>
            <h2 className="section-title">Raid History</h2>
            <DataSection title="Castle Raid History" data={raidHistory.data} path={raidHistory.path} showDebug={isAdmin} />
          </section>

          {isAdmin && (
            <section>
              <h2 className="section-title">Debug Panel</h2>
              <GothicCard flat>
                <CollapsibleJson
                  data={{
                    character: character.data,
                    profile: profile.data,
                    castle: castle.data,
                    market: market.data,
                    raidHistory: raidHistory.data,
                  }}
                  title="Raw JSON (All Profile Data)"
                />
              </GothicCard>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
