import { useEffect, useState } from 'react';
import { getGameData } from '../firebase/databaseService';
import GothicCard from '../components/GothicCard';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import CollapsibleJson from '../components/CollapsibleJson';
import { useAuth } from '../context/AuthContext';

export default function GameDataPage() {
  const { currentUser, isAdmin, loading: authLoading } = useAuth();
  const [gameData, setGameData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadGameData() {
    if (!isAdmin) return;
    setLoading(true);
    setError('');
    try {
      const data = await getGameData();
      setGameData(data);
    } catch {
      setError('Failed to load game data. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    loadGameData();
  }, [authLoading, isAdmin]);

  const topLevelKeys = gameData && typeof gameData === 'object'
    ? Object.keys(gameData)
    : [];

  return (
    <div className="page">
      <div className="page-header">
        <h1>Game Data</h1>
        <p>Admin-only database inspection.</p>
      </div>

      {authLoading && <LoadingSpinner message="Checking access..." />}

      {!authLoading && (!currentUser || !isAdmin) && (
        <div className="empty-state">This page is restricted to the site admin.</div>
      )}

      {!authLoading && isAdmin && loading && <LoadingSpinner message="Loading game configuration..." />}
      {!authLoading && isAdmin && <ErrorMessage message={error} onRetry={loadGameData} />}

      {!authLoading && isAdmin && !loading && !error && !gameData && (
        <div className="empty-state">No game data found in the database.</div>
      )}

      {!authLoading && isAdmin && !loading && !error && gameData && (
        <>
          <GothicCard title="Overview" flat>
            <p style={{ color: 'var(--color-gray-light)', marginBottom: '1rem' }}>
              Top-level nodes in GameData:{' '}
              {topLevelKeys.length > 0 ? topLevelKeys.join(', ') : 'None'}
            </p>
          </GothicCard>

          <div style={{ marginTop: '1.5rem' }}>
            <CollapsibleJson data={gameData} title="Full GameData JSON" />
          </div>
        </>
      )}
    </div>
  );
}
