import { useEffect, useMemo, useState } from 'react';
import {
  getCraftingSettings,
  getItems,
  normalizeCraftingSettings,
  normalizeItemSettings,
} from '../firebase/databaseService';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import CraftingRecipeEditModal from '../components/CraftingRecipeEditModal';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import styles from './CraftingPage.module.css';

const RARITY_LABELS = {
  0: 'Common',
  1: 'Normal',
  2: 'Uncommon',
  3: 'Rare',
  4: 'Unique',
  5: 'Legendary',
};

function formatRarity(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' || /^\d+$/.test(String(value))) {
    return RARITY_LABELS[Number(value)] || String(value);
  }
  return String(value).replace(/_/g, ' ').trim();
}

function getRecipeCategory(recipe) {
  return String(
    recipe.raw?.category ||
    recipe.raw?.recipeCategory ||
    recipe.raw?.type ||
    recipe.output?.itemType ||
    recipe.output?.type ||
    'Uncategorized',
  ).trim() || 'Uncategorized';
}

function getRecipeRarity(recipe, itemLookup) {
  const directRarity = formatRarity(recipe.raw?.rarity ?? recipe.output?.rarity);
  if (directRarity) return directRarity;

  const outputKeys = [
    recipe.output?.itemId,
    recipe.output?.itemName,
    recipe.raw?.outputItemId,
    recipe.raw?.outputItemName,
  ].filter(Boolean).map(String);

  for (const key of outputKeys) {
    const item = itemLookup.get(key);
    if (item?.rarityLabel) return item.rarityLabel;
  }

  return 'Unspecified';
}

function RecipeCard({ recipe, showDebug = false, items = [], onSaved, t }) {
  const [isEditing, setIsEditing] = useState(false);
  const output = recipe.output;
  const itemKeys = new Set(
    items.flatMap((item) => [item.firebaseKey, item.itemId, item.itemName].filter(Boolean).map(String)),
  );

  function validateRecipe(nextValue) {
    const references = [
      nextValue.output?.itemId,
      nextValue.output?.itemName,
      ...(Array.isArray(nextValue.ingredients)
        ? nextValue.ingredients.flatMap((ingredient) => [ingredient.itemId, ingredient.itemName])
        : []),
    ].filter(Boolean);

    const missing = references.filter((reference) => !itemKeys.has(String(reference)));
    if (missing.length > 0) {
      return t('crafting.validationMissing', { items: missing.slice(0, 4).join(', ') });
    }
    return '';
  }

  return (
    <article className={styles.recipe}>
      <div className={styles.recipeHeader}>
        <div>
          <h3 className={styles.recipeTitle}>{recipe.displayName}</h3>
          {showDebug && <p className={styles.recipeId}>{recipe.recipeId}</p>}
        </div>
        <div className={styles.recipeActions}>
          <span className={`${styles.status} ${recipe.enabled ? styles.enabled : styles.disabled}`}>
            {recipe.enabled ? t('crafting.enabled') : t('crafting.disabled')}
          </span>
          {showDebug && (
            <button
              type="button"
              className={styles.editButton}
              onClick={() => setIsEditing(true)}
            >
              {t('crafting.edit')}
            </button>
          )}
        </div>
      </div>

      {recipe.description && <p className={styles.description}>{recipe.description}</p>}

      <div className={styles.metaGrid}>
        <span>{t('crafting.coins')}: {recipe.moneyCost}</span>
        <span>{t('crafting.level')}: {recipe.requiredLevel}</span>
        {output && <span>{t('crafting.output')}: {output.itemName || output.itemId} x{output.amount || 1}</span>}
      </div>

      <h4 className={styles.subheading}>{t('crafting.ingredients')}</h4>
      {recipe.ingredients.length > 0 ? (
        <ul className={styles.ingredients}>
          {recipe.ingredients.map((ingredient, index) => (
            <li key={`${ingredient.itemId || ingredient.itemName || index}-${index}`}>
              <span>{ingredient.itemName || ingredient.itemId || t('crafting.unknownItem')}</span>
              <strong>x{ingredient.amount || 1}</strong>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>{t('crafting.noIngredients')}</p>
      )}

      {showDebug && isEditing && (
        <CraftingRecipeEditModal
          recipe={recipe}
          items={items}
          validate={validateRecipe}
          onClose={() => setIsEditing(false)}
          onSaved={onSaved}
        />
      )}
    </article>
  );
}

export default function CraftingPage() {
  const { isAdmin } = useAuth();
  const { t } = useLanguage();
  const [recipes, setRecipes] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [rarityFilter, setRarityFilter] = useState('');

  async function loadRecipes() {
    setLoading(true);
    setError('');
    try {
      const data = await getCraftingSettings();
      setRecipes(normalizeCraftingSettings(data));
      const itemData = await getItems();
      setItems(normalizeItemSettings(itemData));
    } catch {
      setError(t('crafting.error'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRecipes();
  }, [isAdmin]);

  const itemLookup = useMemo(() => {
    const lookup = new Map();
    items.forEach((item) => {
      [item.firebaseKey, item.itemId, item.itemName].filter(Boolean).forEach((key) => {
        lookup.set(String(key), item);
      });
    });
    return lookup;
  }, [items]);

  const visibleRecipes = useMemo(() => {
    const query = filter.trim().toLowerCase();
    return recipes.filter((recipe) => {
      const category = getRecipeCategory(recipe);
      const rarity = getRecipeRarity(recipe, itemLookup);
      if (categoryFilter && category !== categoryFilter) return false;
      if (rarityFilter && rarity !== rarityFilter) return false;
      if (!query) return true;
      return (
        recipe.displayName.toLowerCase().includes(query) ||
        recipe.recipeId.toLowerCase().includes(query) ||
        category.toLowerCase().includes(query) ||
        rarity.toLowerCase().includes(query) ||
        String(recipe.raw?.category || recipe.raw?.recipeCategory || recipe.raw?.type || '').toLowerCase().includes(query) ||
        String(recipe.output?.itemName || recipe.output?.itemId || '').toLowerCase().includes(query) ||
        recipe.ingredients.some((ingredient) =>
          String(ingredient.itemName || ingredient.itemId || '').toLowerCase().includes(query),
        )
      );
    });
  }, [recipes, filter, categoryFilter, rarityFilter, itemLookup]);

  const categoryOptions = useMemo(() => {
    const counts = new Map();
    recipes.forEach((recipe) => {
      const category = getRecipeCategory(recipe);
      counts.set(category, (counts.get(category) || 0) + 1);
    });
    return Array.from(counts, ([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [recipes]);

  const rarityOptions = useMemo(() => {
    const counts = new Map();
    recipes.forEach((recipe) => {
      const rarity = getRecipeRarity(recipe, itemLookup);
      counts.set(rarity, (counts.get(rarity) || 0) + 1);
    });
    return Array.from(counts, ([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [recipes, itemLookup]);

  return (
    <div className="page page--wide">
      <div className="page-header">
        <h1>{t('crafting.title')}</h1>
        <p>{t('crafting.subtitle')}</p>
      </div>

      <div className={styles.filters}>
        <input
          type="search"
          className={styles.search}
          placeholder={t('crafting.search')}
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        />
        <select
          className={styles.categorySelect}
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          aria-label={t('crafting.categoryFilter')}
        >
          <option value="">{t('crafting.allCategories')}</option>
          {categoryOptions.map((category) => (
            <option key={category.value} value={category.value}>
              {category.value} ({category.count})
            </option>
          ))}
        </select>
        <select
          className={styles.categorySelect}
          value={rarityFilter}
          onChange={(event) => setRarityFilter(event.target.value)}
          aria-label={t('crafting.rarityFilter')}
        >
          <option value="">{t('crafting.allRarities')}</option>
          {rarityOptions.map((rarity) => (
            <option key={rarity.value} value={rarity.value}>
              {rarity.value} ({rarity.count})
            </option>
          ))}
        </select>
      </div>

      {loading && <LoadingSpinner message={t('crafting.loading')} />}
      <ErrorMessage message={error} onRetry={loadRecipes} />

      {!loading && !error && recipes.length === 0 && (
        <div className="empty-state">{t('crafting.empty')}</div>
      )}

      {!loading && !error && recipes.length > 0 && (
        <>
          <div className="notice notice--info" style={{ marginBottom: '1.25rem' }}>
            {t('crafting.countNotice', { visible: visibleRecipes.length, total: recipes.length })}
          </div>
          <div className={styles.grid}>
            {visibleRecipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                showDebug={isAdmin}
                items={items}
                onSaved={loadRecipes}
                t={t}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
