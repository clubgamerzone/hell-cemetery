import { privacyPolicyContent } from '../content/privacyPolicy';
import GothicCard from '../components/GothicCard';
import { useLanguage } from '../context/LanguageContext';
import styles from './PrivacyPolicyPage.module.css';

export default function PrivacyPolicyPage() {
  const { lastUpdated, contactEmail, sections } = privacyPolicyContent;
  const { t } = useLanguage();

  return (
    <div className="page">
      <div className="page-header">
        <h1>{t('nav.privacy')}</h1>
        <p>{t('privacy.subtitle')}</p>
      </div>

      <p className={styles.meta}>
        {t('privacy.lastUpdated')}: {lastUpdated}
      </p>

      <div className={styles.sections}>
        {sections.map((section) => (
          <GothicCard key={section.title} title={section.title} flat>
            <div className={styles.body}>
              {section.body.split('\n').map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
              {section.title === 'Contact Us' && (
                <p className={styles.contact}>
                  <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
                </p>
              )}
            </div>
          </GothicCard>
        ))}
      </div>
    </div>
  );
}
