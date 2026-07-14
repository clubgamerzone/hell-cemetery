import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getItems, normalizeItemSettings } from '../firebase/databaseService';
import ItemCard from '../components/ItemCard';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
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

function getItemRarity(item) {
  return String(item.rarityLabel || item.raw?.rarity || 'Unspecified').trim() || 'Unspecified';
}

function itemMatchesQuery(item, query) {
  const normalizedQuery = String(query || '').trim().toLowerCase();
  if (!normalizedQuery) return false;
  return [
    item.itemName,
    item.itemId,
    item.firebaseKey,
    item.raw?.itemId,
    item.raw?.itemName,
    item.raw?.name,
    item.raw?.legacyId,
  ].some((value) => String(value || '').trim().toLowerCase() === normalizedQuery);
}

function sortItemsByName(a, b) {
  return String(a.itemName || a.id || '').localeCompare(String(b.itemName || b.id || ''));
}

export default function ItemsPage() {
  const { isAdmin } = useAuth();
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [rarityFilter, setRarityFilter] = useState('');
  const selectedItemQuery = searchParams.get('item') || '';

  async function loadItems() {
    setLoading(true);
    setError('');
    try {
      const data = await getItems();
      setItems(normalizeItemSettings(data));
    } catch {
      setError(t('items.error'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadItems();
  }, []);

  function handleItemSaved(savedItem) {
    if (!savedItem?.data) {
      loadItems();
      return;
    }

    const firebaseKey = savedItem.firebaseKey || savedItem.data.itemId || savedItem.data.itemName;
    const normalized = normalizeItemSettings({ items: { [firebaseKey]: savedItem.data } })[0];
    if (!normalized) {
      loadItems();
      return;
    }

    const nextItem = {
      ...normalized,
      writePath: savedItem.writePath || normalized.writePath,
    };
    setItems((current) => {
      const currentIndex = current.findIndex((item) =>
        item.writePath === nextItem.writePath ||
        item.firebaseKey === firebaseKey ||
        item.id === nextItem.id);

      if (currentIndex === -1) {
        return [...current, nextItem].sort(sortItemsByName);
      }

      const nextItems = current.slice();
      nextItems[currentIndex] = nextItem;
      return nextItems.sort(sortItemsByName);
    });
  }

  const visibleItems = useMemo(() => {
    const query = filter.trim().toLowerCase();
    return items.filter((item) => {
      const category = getItemCategory(item);
      const rarity = getItemRarity(item);
      if (selectedItemQuery && !itemMatchesQuery(item, selectedItemQuery)) return false;
      if (categoryFilter && category !== categoryFilter) return false;
      if (rarityFilter && rarity !== rarityFilter) return false;
      if (!query) return true;
      return [
        item.itemName,
        item.itemId,
        item.firebaseKey,
        item.typeLabel,
        rarity,
        category,
        item.raw?.category,
        item.raw?.itemCategory,
      ].some((value) => String(value || '').toLowerCase().includes(query));
    });
  }, [items, filter, categoryFilter, rarityFilter, selectedItemQuery]);

  const categoryOptions = useMemo(() => {
    const counts = new Map();
    items.forEach((item) => {
      const category = getItemCategory(item);
      counts.set(category, (counts.get(category) || 0) + 1);
    });
    return Array.from(counts, ([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [items]);

  const rarityOptions = useMemo(() => {
    const counts = new Map();
    items.forEach((item) => {
      const rarity = getItemRarity(item);
      counts.set(rarity, (counts.get(rarity) || 0) + 1);
    });
    return Array.from(counts, ([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [items]);

  return (
    <div className="page page--wide">
      <div className="page-header">
        <h1>{t('items.title')}</h1>
        <p>{t('items.subtitle')}</p>
      </div>

      <div className={styles.filters}>
        <input
          type="search"
          className={styles.search}
          placeholder={t('items.search')}
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        />
        <select
          className={styles.categorySelect}
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          aria-label={t('items.categoryFilter')}
        >
          <option value="">{t('items.allCategories')}</option>
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
          aria-label={t('items.rarityFilter')}
        >
          <option value="">{t('items.allRarities')}</option>
          {rarityOptions.map((rarity) => (
            <option key={rarity.value} value={rarity.value}>
              {rarity.value} ({rarity.count})
            </option>
          ))}
        </select>
      </div>

      {loading && <LoadingSpinner message={t('items.loading')} />}
      <ErrorMessage message={error} onRetry={loadItems} />

      {!loading && !error && items.length === 0 && (
        <div className="empty-state">{t('items.empty')}</div>
      )}

      {!loading && !error && items.length > 0 && (
        <>
          <div className="notice notice--info" style={{ marginBottom: '1.25rem' }}>
            {selectedItemQuery
              ? t('items.matchNotice', { item: selectedItemQuery })
              : t('items.countNotice', { visible: visibleItems.length, total: items.length })}
          </div>
          <div className="grid grid--items">
            {visibleItems.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                showDebug={isAdmin}
                onSaved={handleItemSaved}
                highlighted={selectedItemQuery && itemMatchesQuery(item, selectedItemQuery)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
