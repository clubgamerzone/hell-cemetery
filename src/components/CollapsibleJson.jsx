import { useState } from 'react';
import styles from './CollapsibleJson.module.css';

function JsonNode({ name, value, depth = 0 }) {
  const [open, setOpen] = useState(depth < 2);

  if (value === null || value === undefined) {
    return (
      <div className={styles.node} style={{ paddingLeft: depth * 16 }}>
        {name !== undefined && <span className={styles.key}>{name}: </span>}
        <span className={styles.null}>null</span>
      </div>
    );
  }

  if (typeof value !== 'object') {
    return (
      <div className={styles.node} style={{ paddingLeft: depth * 16 }}>
        {name !== undefined && <span className={styles.key}>{name}: </span>}
        <span className={styles[`type-${typeof value}`]}>
          {typeof value === 'string' ? `"${value}"` : String(value)}
        </span>
      </div>
    );
  }

  const isArray = Array.isArray(value);
  const entries = isArray ? value.map((v, i) => [String(i), v]) : Object.entries(value);
  const preview = isArray ? `[${value.length}]` : `{${entries.length}}`;

  return (
    <div className={styles.branch}>
      <button
        type="button"
        className={styles.toggle}
        style={{ paddingLeft: depth * 16 }}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className={styles.arrow}>{open ? '▼' : '▶'}</span>
        {name !== undefined && <span className={styles.key}>{name}: </span>}
        <span className={styles.preview}>{preview}</span>
      </button>
      {open && (
        <div className={styles.children}>
          {entries.map(([key, val]) => (
            <JsonNode key={key} name={key} value={val} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CollapsibleJson({ data, title = 'Raw Data' }) {
  const [collapsed, setCollapsed] = useState(true);

  if (data === null || data === undefined) {
    return (
      <div className={styles.wrapper}>
        <p className={styles.empty}>No data available.</p>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <button
        type="button"
        className={styles.header}
        onClick={() => setCollapsed((c) => !c)}
        aria-expanded={!collapsed}
      >
        <span className={styles.headerTitle}>{title}</span>
        <span className={styles.headerAction}>{collapsed ? 'Expand' : 'Collapse'}</span>
      </button>
      {!collapsed && (
        <div className={styles.body}>
          <JsonNode value={data} />
        </div>
      )}
    </div>
  );
}
