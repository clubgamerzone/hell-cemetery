import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import AdminJsonEditor from './AdminJsonEditor';
import ItemAdminEditor from './ItemAdminEditor';
import styles from './ItemEditModal.module.css';

export default function ItemEditModal({ item, onClose, onSaved }) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div className={styles.overlay} role="presentation" onMouseDown={onClose}>
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="item-editor-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <div>
            <h2 id="item-editor-title">Edit Item</h2>
            <p>{item.itemName || item.firebaseKey}</p>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose}>
            Close
          </button>
        </div>

        <div className={styles.modalBody}>
          <ItemAdminEditor item={item} onClose={onClose} onSaved={onSaved} compactHeader />
          <AdminJsonEditor
            title="Advanced Item JSON"
            path={item.writePath}
            value={item.raw}
            onSaved={onSaved}
          />
        </div>
      </section>
    </div>,
    document.body,
  );
}
