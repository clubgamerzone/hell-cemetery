import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import AdminJsonEditor from './AdminJsonEditor';
import CollapsibleJson from './CollapsibleJson';
import CraftingRecipeAdminEditor from './CraftingRecipeAdminEditor';
import styles from './ItemEditModal.module.css';

export default function CraftingRecipeEditModal({ recipe, items, validate, onClose, onSaved }) {
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
        aria-labelledby="recipe-editor-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <div>
            <h2 id="recipe-editor-title">Edit Recipe</h2>
            <p>{recipe.displayName || recipe.recipeId}</p>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose}>
            Close
          </button>
        </div>

        <div className={styles.modalBody}>
          <CraftingRecipeAdminEditor
            recipe={recipe}
            items={items}
            validate={validate}
            onSaved={onSaved}
            compactHeader
          />
          <AdminJsonEditor
            title="Advanced Recipe JSON"
            path={recipe.writePath}
            value={recipe.raw}
            validate={validate}
            onSaved={onSaved}
          />
          <CollapsibleJson data={recipe.raw} title="Raw recipe" />
        </div>
      </section>
    </div>,
    document.body,
  );
}
