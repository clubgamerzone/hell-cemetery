import characterPlaceholder from '../assets/images/enemy-placeholder.svg';
import CollapsibleJson from './CollapsibleJson';
import GothicCard from './GothicCard';
import styles from './CharacterInfoCard.module.css';

function StatRow({ label, value }) {
  if (value === null || value === undefined || value === '—') return null;
  return (
    <div className={styles.statRow}>
      <span className={styles.statRow__label}>{label}</span>
      <span className={styles.statRow__value}>{value}</span>
    </div>
  );
}

export default function CharacterInfoCard({ character, sourcePath, rawData, showDebug = false }) {
  if (!character) {
    return (
      <GothicCard title="Character Information" flat>
        <p className={styles.empty}>No character data found for this account yet.</p>
        {showDebug && sourcePath && (
          <p className={styles.pathHint}>
            Checked paths include: <code>{sourcePath}</code>
          </p>
        )}
      </GothicCard>
    );
  }

  const {
    name,
    class: playerClass,
    level,
    imageUrl,
    stats,
    power,
    inventorySummary,
    inventoryCount,
    vaultSummary,
    vaultCount,
    clanInfo,
    lastLogin,
    lastSavedScene,
    extraFields,
  } = character;

  return (
    <GothicCard title="Character Information" flat className={styles.card}>
      {showDebug && sourcePath && (
        <p className={styles.pathHint}>
          Source: <code>{sourcePath}</code>
        </p>
      )}

      <div className={styles.layout}>
        <div className={styles.portraitWrap}>
          <img
            src={imageUrl || characterPlaceholder}
            alt={`${name} portrait`}
            className={styles.portrait}
            onError={(e) => {
              e.currentTarget.src = characterPlaceholder;
            }}
          />
        </div>

        <div className={styles.details}>
          <StatRow label="Name:" value={name} />
          {playerClass && <StatRow label="Class:" value={playerClass} />}
          {level !== null && level !== undefined && (
            <StatRow label="Level:" value={level} />
          )}
          {power !== null && power !== undefined && (
            <StatRow label="Power:" value={power} />
          )}
          {lastSavedScene && (
            <StatRow label="Last Scene:" value={lastSavedScene} />
          )}
          {lastLogin && <StatRow label="Last Login:" value={lastLogin} />}
        </div>
      </div>

      {stats.length > 0 && (
        <div className={styles.statsSection}>
          <h4 className={styles.sectionHeading}>Combat Stats</h4>
          <div className={styles.statsGrid}>
            {stats.map(({ key, label, value }) => (
              <div key={key} className={styles.stat}>
                <span className={styles.stat__label}>{label}</span>
                <span className={styles.stat__value}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.summarySection}>
        <h4 className={styles.sectionHeading}>Inventory & Vault</h4>
        <StatRow
          label="Inventory:"
          value={`${inventorySummary}${inventoryCount > 0 ? ` (${inventoryCount})` : ''}`}
        />
        <StatRow
          label="Vault:"
          value={`${vaultSummary}${vaultCount > 0 ? ` (${vaultCount})` : ''}`}
        />
      </div>

      {clanInfo && (
        <div className={styles.summarySection}>
          <h4 className={styles.sectionHeading}>Clan</h4>
          {Object.entries(clanInfo).map(([key, value]) => {
            if (value === '' || value === null || value === undefined) return null;
            return (
              <StatRow
                key={key}
                label={`${formatLabel(key)}:`}
                value={String(value)}
              />
            );
          })}
        </div>
      )}

      {extraFields.length > 0 && (
        <div className={styles.summarySection}>
          <h4 className={styles.sectionHeading}>Other Details</h4>
          {extraFields.slice(0, 8).map(([key, value]) => (
            <StatRow key={key} label={`${formatLabel(key)}:`} value={String(value)} />
          ))}
        </div>
      )}

      {showDebug && rawData && (
        <CollapsibleJson data={rawData} title="Raw Character Data" />
      )}
    </GothicCard>
  );
}

function formatLabel(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}
