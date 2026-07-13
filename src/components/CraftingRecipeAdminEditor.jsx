import { useEffect, useMemo, useState } from 'react';
import { saveContentNode } from '../firebase/databaseService';
import GothicButton from './GothicButton';
import styles from './CraftingRecipeAdminEditor.module.css';

function clone(value) {
  return JSON.parse(JSON.stringify(value ?? {}));
}

function toNumberOrBlank(value) {
  if (value === '' || value === null || value === undefined) return '';
  const parsed = Number(value);
  return Number.isNaN(parsed) ? value : parsed;
}

function getItemKey(item) {
  return String(item.itemId || item.firebaseKey || item.itemName);
}

function getItemName(item) {
  return item.itemName || item.firebaseKey || item.itemId;
}

function buildItemReference(item) {
  if (!item) {
    return {
      itemId: '',
      itemName: '',
      legacyId: 0,
      prefabPath: '',
    };
  }

  return {
    itemId: item.itemId || item.firebaseKey || '',
    itemName: item.itemName || '',
    legacyId: item.raw?.legacyId ?? item.raw?.ID ?? item.raw?.id ?? 0,
    prefabPath: item.itemUsePrefabPath || item.raw?.itemUsePrefabPath || item.pickupPrefabPath || item.raw?.pickupPrefabPath || '',
  };
}

function normalizeRecipeDraft(recipe) {
  const source = clone(recipe.raw);
  return {
    ...source,
    ingredients: Array.isArray(source.ingredients) ? source.ingredients : [],
    output: source.output || { itemId: '', itemName: '', amount: 1 },
  };
}

export default function CraftingRecipeAdminEditor({ recipe, items, validate, onSaved }) {
  const [draft, setDraft] = useState(() => normalizeRecipeDraft(recipe));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const itemOptions = useMemo(
    () => items.map((item) => ({
      key: getItemKey(item),
      label: getItemName(item),
      item,
    })),
    [items],
  );

  useEffect(() => {
    setDraft(normalizeRecipeDraft(recipe));
    setError('');
    setMessage('');
  }, [recipe]);

  function setField(key, value) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function setOutput(patch) {
    setDraft((current) => ({
      ...current,
      output: { ...(current.output || {}), ...patch },
    }));
  }

  function selectOutput(selectedKey) {
    const selected = itemOptions.find((option) => option.key === selectedKey);
    setOutput(buildItemReference(selected?.item));
  }

  function setIngredient(index, patch) {
    setDraft((current) => ({
      ...current,
      ingredients: current.ingredients.map((ingredient, ingredientIndex) => (
        ingredientIndex === index ? { ...ingredient, ...patch } : ingredient
      )),
    }));
  }

  function selectIngredient(index, selectedKey) {
    const selected = itemOptions.find((option) => option.key === selectedKey);
    setIngredient(index, buildItemReference(selected?.item));
  }

  function addIngredient() {
    const firstItem = itemOptions[0];
    setDraft((current) => ({
      ...current,
      ingredients: [
        ...current.ingredients,
        {
          ...buildItemReference(firstItem?.item),
          amount: 1,
        },
      ],
    }));
  }

  function removeIngredient(index) {
    setDraft((current) => ({
      ...current,
      ingredients: current.ingredients.filter((_, ingredientIndex) => ingredientIndex !== index),
    }));
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const validationError = validate?.(draft);
      if (validationError) {
        setError(validationError);
        return;
      }

      await saveContentNode(recipe.writePath, draft);
      setMessage('Saved.');
      onSaved?.();
    } catch {
      setError('Save failed.');
    } finally {
      setSaving(false);
    }
  }

  const outputKey = String(draft.output?.itemId || draft.output?.itemName || '');

  return (
    <section className={styles.editor}>
      <div className={styles.header}>
        <h3>Edit Recipe</h3>
      </div>

      <div className={styles.grid}>
        <label className={styles.field}>
          <span>Name</span>
          <input
            value={draft.displayName || ''}
            onChange={(event) => setField('displayName', event.target.value)}
          />
        </label>

        <label className={styles.field}>
          <span>Recipe ID</span>
          <input
            value={draft.recipeId || ''}
            onChange={(event) => setField('recipeId', event.target.value)}
          />
        </label>

        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={draft.enabled !== false}
            onChange={(event) => setField('enabled', event.target.checked)}
          />
          <span>Enabled</span>
        </label>

        <label className={styles.field}>
          <span>Required level</span>
          <input
            type="number"
            step="1"
            value={draft.requiredLevel ?? ''}
            onChange={(event) => setField('requiredLevel', toNumberOrBlank(event.target.value))}
          />
        </label>

        <label className={styles.field}>
          <span>Coin cost</span>
          <input
            type="number"
            step="1"
            value={draft.moneyCost ?? ''}
            onChange={(event) => setField('moneyCost', toNumberOrBlank(event.target.value))}
          />
        </label>

        <label className={`${styles.field} ${styles.full}`}>
          <span>Description / Lore</span>
          <textarea
            value={draft.description || ''}
            onChange={(event) => setField('description', event.target.value)}
          />
        </label>

        <div className={styles.full}>
          <h4 className={styles.subheading}>Output</h4>
          <div className={styles.outputRow}>
            <label className={styles.field}>
              <span>Item</span>
              <select value={outputKey} onChange={(event) => selectOutput(event.target.value)}>
                <option value="">Select item</option>
                {itemOptions.map((option) => (
                  <option key={option.key} value={option.key}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span>Amount</span>
              <input
                type="number"
                step="1"
                value={draft.output?.amount ?? 1}
                onChange={(event) => setOutput({ amount: toNumberOrBlank(event.target.value) })}
              />
            </label>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={Boolean(draft.output?.tradeable)}
                onChange={(event) => setOutput({ tradeable: event.target.checked })}
              />
              <span>Requires online validation / tradeable</span>
            </label>
          </div>
        </div>

        <div className={styles.full}>
          <div className={styles.sectionHeader}>
            <h4 className={styles.subheading}>Ingredients</h4>
            <GothicButton type="button" size="small" onClick={addIngredient}>Add Ingredient</GothicButton>
          </div>
          <div className={styles.ingredientList}>
            {draft.ingredients.map((ingredient, index) => {
              const ingredientKey = String(ingredient.itemId || ingredient.itemName || '');
              return (
                <div key={`${ingredientKey}-${index}`} className={styles.ingredientRow}>
                  <label className={styles.field}>
                    <span>Item</span>
                    <select
                      value={ingredientKey}
                      onChange={(event) => selectIngredient(index, event.target.value)}
                    >
                      <option value="">Select item</option>
                      {itemOptions.map((option) => (
                        <option key={option.key} value={option.key}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className={styles.field}>
                    <span>Amount</span>
                    <input
                      type="number"
                      step="1"
                      value={ingredient.amount ?? 1}
                      onChange={(event) => setIngredient(index, { amount: toNumberOrBlank(event.target.value) })}
                    />
                  </label>
                  <button
                    type="button"
                    className={styles.removeButton}
                    onClick={() => removeIngredient(index)}
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}
      {message && <p className={styles.message}>{message}</p>}

      <div className={styles.actions}>
        <GothicButton type="button" size="small" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Recipe'}
        </GothicButton>
      </div>
    </section>
  );
}
