import { useEffect, useMemo, useState } from 'react';
import { getItems, normalizeItemSettings } from '../firebase/databaseService';
import ItemCard from '../components/ItemCard';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import { useAuth } from '../context/AuthContext';
import styles from './ItemsPage.module.css';

export default function ItemsPage() {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');

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
    if (!query) return items;
    return items.filter((item) => [
      item.itemName,
      item.itemId,
      item.firebaseKey,
      item.typeLabel,
      item.rarityLabel,
      item.raw?.category,
      item.raw?.itemCategory,
    ].some((value) => String(value || '').toLowerCase().includes(query)));
  }, [items, filter]);

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

      <input
        type="search"
        className={styles.search}
        placeholder="Search items by name, category, type, or rarity..."
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
      />

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
