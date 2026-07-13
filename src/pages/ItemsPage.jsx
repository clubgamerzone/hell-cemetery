import { useEffect, useMemo, useState } from 'react';
import { getItems, normalizeItemSettings } from '../firebase/databaseService';
import ItemCard from '../components/ItemCard';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import { useAuth } from '../context/AuthContext';
import styles from './ItemsPage.module.css';

function getItemCategory(item) {
  return String(
    item.raw?.category ||
    item.raw?.itemCategory ||
    item.raw?.type ||
    item.typeLabel ||
    'Uncategorized',
  ).trim() || 'Uncategorized';
}

export default function ItemsPage() {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  async function loadItems() {
    setLoading(true);
    setError('');
    try {
      const data = await getItems();
      setItems(normalizeItemSettings(data));
    } catch {
      setError('Failed to load item data. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadItems();
  }, []);

  const visibleItems = useMemo(() => {
    const query = filter.trim().toLowerCase();
    return items.filter((item) => {
      const category = getItemCategory(item);
      if (categoryFilter && category !== categoryFilter) return false;
      if (!query) return true;
      return [
        item.itemName,
        item.itemId,
        item.firebaseKey,
        item.typeLabel,
        item.rarityLabel,
        category,
        item.raw?.category,
        item.raw?.itemCategory,
      ].some((value) => String(value || '').toLowerCase().includes(query));
    });
  }, [items, filter, categoryFilter]);

  const categoryOptions = useMemo(() => {
    const counts = new Map();
    items.forEach((item) => {
      const category = getItemCategory(item);
      counts.set(category, (counts.get(category) || 0) + 1);
    });
    return Array.from(counts, ([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [items]);

  return (
    <div className="page page--wide">
      <div className="page-header">
        <h1>Relics &amp; Artifacts</h1>
        <p>
          Discover the items scattered across Hell Cemetery. Data is loaded from
          Firebase ItemSettings, including images, prefab references, store data,
          and balance stats.
        </p>
      </div>

      <div className={styles.filters}>
        <input
          type="search"
          className={styles.search}
          placeholder="Search items by name, category, type, or rarity..."
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        />
        <select
          className={styles.categorySelect}
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          aria-label="Filter items by category"
        >
          <option value="">All categories</option>
          {categoryOptions.map((category) => (
            <option key={category.value} value={category.value}>
              {category.value} ({category.count})
            </option>
          ))}
        </select>
      </div>

      {loading && <LoadingSpinner message="Uncovering relics..." />}
      <ErrorMessage message={error} onRetry={loadItems} />

      {!loading && !error && items.length === 0 && (
        <div className="empty-state">Items will be revealed soon.</div>
      )}

      {!loading && !error && items.length > 0 && (
        <>
          <div className="notice notice--info" style={{ marginBottom: '1.25rem' }}>
            Showing {visibleItems.length} of {items.length} items.
          </div>
          <div className="grid grid--items">
            {visibleItems.map((item) => (
            <ItemCard key={item.id} item={item} showDebug={isAdmin} onSaved={loadItems} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
