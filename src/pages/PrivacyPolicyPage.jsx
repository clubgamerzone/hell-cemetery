import { privacyPolicyContent } from '../content/privacyPolicy';
import GothicCard from '../components/GothicCard';
import styles from './PrivacyPolicyPage.module.css';

export default function PrivacyPolicyPage() {
  const { lastUpdated, contactEmail, sections } = privacyPolicyContent;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Privacy Policy</h1>
        <p>Hell Cemetery — How we handle your data</p>
      </div>

      <p className={styles.meta}>
        Last updated: {lastUpdated}
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
