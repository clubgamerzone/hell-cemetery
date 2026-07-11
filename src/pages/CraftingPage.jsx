import { useEffect, useMemo, useState } from 'react';
import {
  getCraftingSettings,
  getItems,
  normalizeCraftingSettings,
  normalizeItemSettings,
} from '../firebase/databaseService';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import CollapsibleJson from '../components/CollapsibleJson';
import AdminJsonEditor from '../components/AdminJsonEditor';
import { useAuth } from '../context/AuthContext';
import styles from './CraftingPage.module.css';

function RecipeCard({ recipe, showDebug = false, items = [], onSaved }) {
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
      return `Recipes must reference existing items. Not found: ${missing.slice(0, 4).join(', ')}`;
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
        <span className={`${styles.status} ${recipe.enabled ? styles.enabled : styles.disabled}`}>
          {recipe.enabled ? 'Enabled' : 'Disabled'}
        </span>
      </div>

      {recipe.description && <p className={styles.description}>{recipe.description}</p>}

      <div className={styles.metaGrid}>
        <span>Coins: {recipe.moneyCost}</span>
        <span>Level: {recipe.requiredLevel}</span>
        {output && <span>Output: {output.itemName || output.itemId} x{output.amount || 1}</span>}
      </div>

      <h4 className={styles.subheading}>Ingredients</h4>
      {recipe.ingredients.length > 0 ? (
        <ul className={styles.ingredients}>
          {recipe.ingredients.map((ingredient, index) => (
            <li key={`${ingredient.itemId || ingredient.itemName || index}-${index}`}>
              <span>{ingredient.itemName || ingredient.itemId || 'Unknown item'}</span>
              <strong>x{ingredient.amount || 1}</strong>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>No ingredients listed.</p>
      )}

      {showDebug && (
        <>
          <AdminJsonEditor
            title="Admin Recipe Editor"
            path={recipe.writePath}
            value={recipe.raw}
            validate={validateRecipe}
            onSaved={onSaved}
          />
          <CollapsibleJson data={recipe.raw} title="Raw recipe" />
        </>
      )}
    </article>
  );
}

export default function CraftingPage() {
  const { isAdmin } = useAuth();
  const [recipes, setRecipes] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');

  async function loadRecipes() {
    setLoading(true);
    setError('');
    try {
      const data = await getCraftingSettings();
      setRecipes(normalizeCraftingSettings(data));
      if (isAdmin) {
        const itemData = await getItems();
        setItems(normalizeItemSettings(itemData));
      }
    } catch {
      setError('Failed to load crafting recipes. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRecipes();
  }, [isAdmin]);

  const visibleRecipes = useMemo(() => {
    const query = filter.trim().toLowerCase();
    if (!query) return recipes;
    return recipes.filter((recipe) =>
      recipe.displayName.toLowerCase().includes(query) ||
      recipe.recipeId.toLowerCase().includes(query) ||
      recipe.ingredients.some((ingredient) =>
        String(ingredient.itemName || ingredient.itemId || '').toLowerCase().includes(query),
      ),
    );
  }, [recipes, filter]);

  return (
    <div className="page page--wide">
      <div className="page-header">
        <h1>Crafting Recipes</h1>
        <p>
          Browse forge recipes, required materials, and crafting costs.
        </p>
      </div>

      <input
        type="search"
        className={styles.search}
        placeholder="Search recipes or ingredients..."
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
      />

      {loading && <LoadingSpinner message="Loading crafting recipes..." />}
      <ErrorMessage message={error} onRetry={loadRecipes} />

      {!loading && !error && recipes.length === 0 && (
        <div className="empty-state">No crafting recipes found.</div>
      )}

      {!loading && !error && recipes.length > 0 && (
        <>
          <div className="notice notice--info" style={{ marginBottom: '1.25rem' }}>
            Showing {visibleRecipes.length} of {recipes.length} recipes.
          </div>
          <div className={styles.grid}>
            {visibleRecipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                showDebug={isAdmin}
                items={items}
                onSaved={loadRecipes}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
