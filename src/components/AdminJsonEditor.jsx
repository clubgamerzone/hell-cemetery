import { useEffect, useMemo, useState } from 'react';
import GothicButton from './GothicButton';
import { saveContentNode } from '../firebase/databaseService';
import styles from './AdminJsonEditor.module.css';

function stableStringify(data) {
  return JSON.stringify(data ?? {}, null, 2);
}

export default function AdminJsonEditor({
  title = 'Admin Editor',
  path,
  value,
  onSaved,
  validate,
}) {
  const initialText = useMemo(() => stableStringify(value), [value]);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(initialText);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setText(initialText);
  }, [initialText]);

  async function handleSave() {
    setSaving(true);
    setMessage('');
    setError('');

    try {
      const parsed = JSON.parse(text);
      const validationError = validate?.(parsed);
      if (validationError) {
        setError(validationError);
        return;
      }

      await saveContentNode(path, parsed);
      onSaved?.(parsed);
      setMessage('Saved.');
    } catch (err) {
      setError(err instanceof SyntaxError ? 'Invalid JSON. Please fix the editor content.' : 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  if (!path) return null;

  return (
    <section className={styles.editor}>
      <button
        type="button"
        className={styles.header}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        <span>{title}</span>
        <span>{open ? 'Close' : 'Edit'}</span>
      </button>

      {open && (
        <div className={styles.body}>
          <p className={styles.path}>{path}</p>
          <textarea
            className={styles.textarea}
            value={text}
            spellCheck="false"
            onChange={(event) => setText(event.target.value)}
          />
          {error && <p className={styles.error}>{error}</p>}
          {message && <p className={styles.message}>{message}</p>}
          <div className={styles.actions}>
            <GothicButton type="button" size="small" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </GothicButton>
            <GothicButton
              type="button"
              size="small"
              variant="ghost"
              onClick={() => {
                setText(initialText);
                setError('');
                setMessage('');
              }}
              disabled={saving}
            >
              Reset
            </GothicButton>
          </div>
        </div>
      )}
    </section>
  );
}
