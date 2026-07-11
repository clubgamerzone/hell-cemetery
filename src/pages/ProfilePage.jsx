import { useEffect, useState } from 'react';
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
