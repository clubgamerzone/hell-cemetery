import { useEffect, useState } from 'react';
import { getItems, normalizeItemSettings } from '../firebase/databaseService';
import ItemCard from '../components/ItemCard';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import { useAuth } from '../context/AuthContext';

export default function ItemsPage() {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

      {loading && <LoadingSpinner message="Uncovering relics..." />}
      <ErrorMessage message={error} onRetry={loadItems} />

      {!loading && !error && items.length === 0 && (
        <div className="empty-state">Items will be revealed soon.</div>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="grid grid--items">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} showDebug={isAdmin} onSaved={loadItems} />
          ))}
        </div>
      )}
    </div>
  );
}
