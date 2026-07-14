import { useEffect, useMemo, useState } from 'react';
import {
  getCraftingSettings,
  getItems,
  normalizeCraftingSettings,
  normalizeItemSettings,
  saveContentNode,
} from '../firebase/databaseService';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import CraftingRecipeEditModal from '../components/CraftingRecipeEditModal';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import itemPlaceholder from '../assets/images/item-placeholder.svg';
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

function findItemForReference(reference, itemLookup) {
  if (!reference || !itemLookup) return null;
  const keys = [
    reference.itemId,
    reference.itemName,
    reference.firebaseKey,
    reference.legacyId,
  ].filter((value) => value !== null && value !== undefined && value !== '');

  for (const key of keys) {
    const item = itemLookup.get(String(key));
    if (item) return item;
  }

  return null;
}

function normalizeKey(value) {
  return String(value || '').trim().toLowerCase();
}

function getCanonicalItemKey(reference, itemLookup) {
  const item = findItemForReference(reference, itemLookup);
  if (item) {
    return normalizeKey(item.itemId || item.firebaseKey || item.itemName);
  }

  return normalizeKey(reference?.itemId || reference?.itemName || reference?.legacyId);
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

function createRecipeDraft(items) {
  const output = {
    ...buildItemReference(items[0]),
    amount: 1,
    tradeable: false,
  };

  const raw = {
    recipeId: '',
    displayName: 'New Recipe',
    description: '',
    enabled: true,
    requiredLevel: 0,
    moneyCost: 0,
    ingredients: [],
    output,
  };

  return {
    id: '__new_recipe__',
    writePath: '',
    recipeId: '',
    displayName: raw.displayName,
    description: raw.description,
    enabled: raw.enabled,
    requiredLevel: raw.requiredLevel,
    moneyCost: raw.moneyCost,
    ingredients: raw.ingredients,
    output,
    raw,
    isNew: true,
  };
}

function validateRecipeReferences(nextValue, items, t, { recipes = [], currentRecipe = null, itemLookup = null } = {}) {
  const itemKeys = new Set(
    items.flatMap((item) => [item.firebaseKey, item.itemId, item.itemName].filter(Boolean).map(String)),
  );

  if (!nextValue.output?.itemId && !nextValue.output?.itemName) {
    return 'Recipes must have an output item.';
  }

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

  const outputKey = getCanonicalItemKey(nextValue.output, itemLookup);
  if (outputKey) {
    const duplicate = recipes.find((recipe) => {
      if (!recipe || recipe === currentRecipe) return false;
      const sameFirebaseNode = currentRecipe?.id && recipe.id === currentRecipe.id;
      const sameRecipeId = currentRecipe?.recipeId && recipe.recipeId === currentRecipe.recipeId;
      const sameWritePath = currentRecipe?.writePath && recipe.writePath === currentRecipe.writePath;
      if (sameFirebaseNode || sameRecipeId || sameWritePath) return false;

      return getCanonicalItemKey(recipe.output, itemLookup) === outputKey;
    });

    if (duplicate) {
      return `This output item is already crafted by "${duplicate.displayName || duplicate.recipeId}".`;
    }
  }

  return '';
}

function RecipeCard({ recipe, recipes = [], showDebug = false, items = [], itemLookup, onSaved, t }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const output = recipe.output;
  const outputItem = findItemForReference(output, itemLookup);

  function validateRecipe(nextValue) {
    return validateRecipeReferences(nextValue, items, t, {
      recipes,
      currentRecipe: recipe,
      itemLookup,
    });
  }

  async function toggleEnabled() {
    if (!recipe.writePath || isToggling) return;

    setIsToggling(true);
    try {
      await saveContentNode(`${recipe.writePath}/enabled`, recipe.enabled === false);
      onSaved?.();
    } finally {
      setIsToggling(false);
    }
  }

  return (
    <article className={styles.recipe}>
      <div className={styles.recipeHeader}>
        <div>
          <h3 className={styles.recipeTitle}>{recipe.displayName}</h3>
          {showDebug && <p className={styles.recipeId}>{recipe.recipeId}</p>}
        </div>
        <div className={styles.recipeActions}>
          {showDebug && (
            <>
              <button
                type="button"
                className={`${styles.statusButton} ${recipe.enabled ? styles.enabled : styles.disabled}`}
                onClick={toggleEnabled}
                disabled={isToggling}
              >
                {isToggling ? 'Saving...' : recipe.enabled ? t('crafting.enabled') : t('crafting.disabled')}
              </button>
              <button
                type="button"
                className={styles.editButton}
                onClick={() => setIsEditing(true)}
              >
                {t('crafting.edit')}
              </button>
            </>
          )}
        </div>
      </div>

      {recipe.description && <p className={styles.description}>{recipe.description}</p>}

      <div className={styles.outputPanel}>
        <img
          src={outputItem?.imageUrl || itemPlaceholder}
          alt={output?.itemName || output?.itemId || t('crafting.output')}
          className={styles.outputImage}
          onError={(event) => {
            event.currentTarget.src = itemPlaceholder;
          }}
        />
        <div>
          <span className={styles.outputLabel}>{t('crafting.output')}</span>
          <strong>{output?.itemName || output?.itemId || t('crafting.unknownItem')} x{output?.amount || 1}</strong>
        </div>
      </div>

      <div className={styles.metaGrid}>
        <span>{t('crafting.coins')}: {recipe.moneyCost}</span>
        <span>{t('crafting.level')}: {recipe.requiredLevel}</span>
      </div>

      <h4 className={styles.subheading}>{t('crafting.ingredients')}</h4>
      {recipe.ingredients.length > 0 ? (
        <ul className={styles.ingredients}>
          {recipe.ingredients.map((ingredient, index) => {
            const ingredientItem = findItemForReference(ingredient, itemLookup);
            return (
            <li key={`${ingredient.itemId || ingredient.itemName || index}-${index}`}>
              <span className={styles.ingredientItem}>
                <img
                  src={ingredientItem?.imageUrl || itemPlaceholder}
                  alt={ingredient.itemName || ingredient.itemId || t('crafting.unknownItem')}
                  className={styles.ingredientImage}
                  onError={(event) => {
                    event.currentTarget.src = itemPlaceholder;
                  }}
                />
                {ingredient.itemName || ingredient.itemId || t('crafting.unknownItem')}
              </span>
              <strong>x{ingredient.amount || 1}</strong>
            </li>
            );
          })}
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
  const [isCreating, setIsCreating] = useState(false);
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
      [
        item.firebaseKey,
        item.itemId,
        item.itemName,
        item.raw?.legacyId,
        item.raw?.ID,
        item.raw?.id,
      ].filter((key) => key !== null && key !== undefined && key !== '').forEach((key) => {
        lookup.set(String(key), item);
      });
    });
    return lookup;
  }, [items]);

  const visibleRecipes = useMemo(() => {
    const query = filter.trim().toLowerCase();
    return recipes.filter((recipe) => {
      if (!isAdmin && recipe.enabled === false) return false;
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
  }, [recipes, filter, categoryFilter, rarityFilter, itemLookup, isAdmin]);

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

  const newRecipe = useMemo(() => createRecipeDraft(items), [items]);

  function validateRecipe(nextValue) {
    return validateRecipeReferences(nextValue, items, t, {
      recipes,
      currentRecipe: newRecipe,
      itemLookup,
    });
  }

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
        {isAdmin && (
          <button
            type="button"
            className={styles.createButton}
            onClick={() => setIsCreating(true)}
          >
            New Recipe
          </button>
        )}
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
                recipes={recipes}
                showDebug={isAdmin}
                items={items}
                itemLookup={itemLookup}
                onSaved={loadRecipes}
                t={t}
              />
            ))}
          </div>
        </>
      )}

      {isAdmin && isCreating && (
        <CraftingRecipeEditModal
          recipe={newRecipe}
          items={items}
          validate={validateRecipe}
          onClose={() => setIsCreating(false)}
          onSaved={() => {
            setIsCreating(false);
            loadRecipes();
          }}
        />
      )}
    </div>
  );
}
