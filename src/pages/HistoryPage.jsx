import GothicCard from '../components/GothicCard';
import { useLanguage } from '../context/LanguageContext';
import styles from './HistoryPage.module.css';

export default function HistoryPage() {
  const { t } = useLanguage();

  return (
    <div className="page">
      <div className="page-header">
        <h1>{t('history.title')}</h1>
        <p>{t('history.subtitle')}</p>
      </div>

      <GothicCard title={t('history.hiddenTitle')} flat className={styles.archiveCard}>
        <p>{t('history.hiddenBody')}</p>
      </GothicCard>
    </div>
  );
}
