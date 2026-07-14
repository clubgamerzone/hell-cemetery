import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
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

function getTwoFactorErrorMessage(error, t) {
  switch (error?.code) {
    case 'auth/requires-recent-login':
      return t('profile.recentLogin');
    case 'auth/invalid-verification-code':
      return t('profile.invalidCode');
    default:
      return error?.message || t('profile.twoFactorFailed');
  }
}

function AdminTwoFactorPanel() {
  const { t } = useLanguage();
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
      setError(getTwoFactorErrorMessage(err, t));
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
      setMessage(t('profile.twoFactorEnabled'));
      setSetup(null);
      setQrImageUrl('');
      setCode('');
    } catch (err) {
      setError(getTwoFactorErrorMessage(err, t));
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
      setMessage(t('profile.twoFactorDisabled'));
      setSetup(null);
      setQrImageUrl('');
      setCode('');
    } catch (err) {
      setError(getTwoFactorErrorMessage(err, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <GothicCard title={t('profile.adminTwoFactor')} flat className={styles.accountCard}>
      {error && <ErrorMessage message={error} />}
      {message && <div className="notice notice--info">{message}</div>}

      {!setup && (
        <div className={styles.securityActions}>
          <p className={styles.securityText}>
            {t('profile.status')}: {hasTotp ? t('profile.enabled') : t('profile.disabled')}
          </p>
          {hasTotp ? (
            <GothicButton type="button" variant="ghost" size="small" onClick={handleDisable} disabled={busy}>
              {busy ? t('profile.disabling') : t('profile.disableTwoFactor')}
            </GothicButton>
          ) : (
            <GothicButton type="button" size="small" onClick={handleStartSetup} disabled={busy}>
              {busy ? t('profile.preparing') : t('profile.enableTwoFactor')}
            </GothicButton>
          )}
        </div>
      )}

      {setup && (
        <form onSubmit={handleEnroll} className={styles.securityForm}>
          {qrImageUrl && (
            <img
              src={qrImageUrl}
              alt={t('profile.adminTwoFactor')}
              className={styles.qrCode}
            />
          )}
          <p className={styles.securityText}>
            {t('profile.manualKey')}: <code>{setup.secret.secretKey}</code>
          </p>
          <label className={styles.securityField} htmlFor="totp-code">
            <span>{t('login.authenticatorCode')}</span>
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
              {busy ? t('profile.enabling') : t('profile.finishSetup')}
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
              {t('profile.cancel')}
            </GothicButton>
          </div>
        </form>
      )}
    </GothicCard>
  );
}

function DataSection({ title, data, path, showDebug = false, t }) {
  if (!hasMeaningfulData(data)) {
    return (
      <GothicCard title={title} flat>
        <p className={styles.noData}>{t('profile.noData')}</p>
        {showDebug && path && <p className={styles.pathHint}>{t('profile.checked')}: <code>{path}</code></p>}
      </GothicCard>
    );
  }

  return (
    <GothicCard title={title} flat>
      {showDebug && path && <p className={styles.pathHint}>{t('profile.source')}: <code>{path}</code></p>}
      {showDebug ? (
        <CollapsibleJson data={data} title={t('profile.viewData')} />
      ) : (
        renderKeyValue(data) || <p className={styles.noData}>{t('profile.noSummary')}</p>
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
  const { t } = useLanguage();
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
      setError(t('profile.error'));
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
          <h1>{t('profile.title')}</h1>
          <p className={styles.subtitle}>{t('profile.subtitle')}</p>
        </div>
        <GothicButton variant="ghost" size="small" onClick={logout}>
          {t('nav.logout')}
        </GothicButton>
      </div>

      <div className="notice notice--info">
        {t('profile.notice')}
      </div>

      <GothicCard title={t('profile.account')} flat className={styles.accountCard}>
        <dl className={styles.kvList}>
          <div className={styles.kvItem}>
            <dt>{t('profile.email')}</dt>
            <dd>{currentUser?.email || t('profile.notAvailable')}</dd>
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

      {loading && <LoadingSpinner message={t('profile.loading')} />}
      <ErrorMessage message={error} onRetry={loadProfile} />

      {!loading && !error && (
        <section className={styles.characterSection}>
          <h2 className="section-title">{t('profile.character')}</h2>
          <CharacterInfoCard
            character={parsedCharacter}
            sourcePath={character.path}
            rawData={character.data}
            showDebug={isAdmin}
          />
          {isAdmin && !character.path && character.checkedPaths?.length > 0 && (
            <p className={styles.pathHint}>
              {t('profile.searched')}: {character.checkedPaths.join(', ')}
            </p>
          )}
        </section>
      )}

      {!loading && !error && !hasAnyData && (
        <div className="empty-state">
          {t('profile.noProfile')}
        </div>
      )}

      {!loading && !error && hasAnyData && (
        <div className={styles.sections}>
          <section>
            <h2 className="section-title">{t('profile.player')}</h2>
            {hasMeaningfulData(profile.data) ? (
              <GothicCard flat>
                {renderKeyValue(profile.data)}
                {isAdmin && <CollapsibleJson data={profile.data} title={t('profile.fullPlayerData')} />}
              </GothicCard>
            ) : (
              <DataSection title={t('profile.playerData')} data={profile.data} path={profile.path} showDebug={isAdmin} t={t} />
            )}
          </section>

          <section>
            <h2 className="section-title">{t('profile.castle')}</h2>
            <DataSection title={t('profile.playerCastle')} data={castle.data} path={castle.path} showDebug={isAdmin} t={t} />
          </section>

          <section>
            <h2 className="section-title">{t('profile.market')}</h2>
            <DataSection title={t('profile.playerMarket')} data={market.data} path={market.path} showDebug={isAdmin} t={t} />
          </section>

          <section>
            <h2 className="section-title">{t('profile.raid')}</h2>
            <DataSection title={t('profile.castleRaidHistory')} data={raidHistory.data} path={raidHistory.path} showDebug={isAdmin} t={t} />
          </section>

          {isAdmin && (
            <section>
              <h2 className="section-title">{t('profile.debug')}</h2>
              <GothicCard flat>
                <CollapsibleJson
                  data={{
                    character: character.data,
                    profile: profile.data,
                    castle: castle.data,
                    market: market.data,
                    raidHistory: raidHistory.data,
                  }}
                  title={t('profile.rawProfileData')}
                />
              </GothicCard>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
