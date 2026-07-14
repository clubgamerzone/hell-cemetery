import { useEffect, useState } from 'react';
import { getGameData } from '../firebase/databaseService';
import GothicCard from '../components/GothicCard';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import CollapsibleJson from '../components/CollapsibleJson';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function GameDataPage() {
  const { currentUser, isAdmin, loading: authLoading } = useAuth();
  const { t } = useLanguage();
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
      setError(t('gameData.error'));
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
        <h1>{t('nav.gameData')}</h1>
        <p>{t('gameData.subtitle')}</p>
      </div>

      {authLoading && <LoadingSpinner message={t('gameData.checking')} />}

      {!authLoading && (!currentUser || !isAdmin) && (
        <div className="empty-state">{t('gameData.restricted')}</div>
      )}

      {!authLoading && isAdmin && loading && <LoadingSpinner message={t('gameData.loading')} />}
      {!authLoading && isAdmin && <ErrorMessage message={error} onRetry={loadGameData} />}

      {!authLoading && isAdmin && !loading && !error && !gameData && (
        <div className="empty-state">{t('gameData.empty')}</div>
      )}

      {!authLoading && isAdmin && !loading && !error && gameData && (
        <>
          <GothicCard title={t('gameData.overview')} flat>
            <p style={{ color: 'var(--color-gray-light)', marginBottom: '1rem' }}>
              {t('gameData.nodes')}:{' '}
              {topLevelKeys.length > 0 ? topLevelKeys.join(', ') : t('gameData.none')}
            </p>
          </GothicCard>

          <div style={{ marginTop: '1.5rem' }}>
            <CollapsibleJson data={gameData} title={t('gameData.fullJson')} />
          </div>
        </>
      )}
    </div>
  );
}
