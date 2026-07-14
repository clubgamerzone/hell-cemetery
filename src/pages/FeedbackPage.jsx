import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getFeedbackPosts,
  removeFeedbackPost,
  saveFeedbackPost,
} from '../firebase/databaseService';
import ErrorMessage from '../components/ErrorMessage';
import GothicButton from '../components/GothicButton';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import styles from './FeedbackPage.module.css';

const CATEGORIES = [
  { value: 'General Feedback', labelKey: 'feedback.category.general' },
  { value: 'Bug Report', labelKey: 'feedback.category.bug' },
  { value: 'Balance', labelKey: 'feedback.category.balance' },
  { value: 'Feature Idea', labelKey: 'feedback.category.idea' },
  { value: 'Community', labelKey: 'feedback.category.community' },
];

function displayDate(value, language, t) {
  if (!value) return t('feedback.justNow');
  return new Intl.DateTimeFormat(language, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(Number(value)));
}

function getAuthorName(user, t) {
  if (!user) return t('feedback.defaultAuthor');
  if (user.displayName) return user.displayName;
  if (user.email) return user.email.split('@')[0];
  return t('feedback.defaultAuthor');
}

function getCategoryLabel(category, t) {
  return t(CATEGORIES.find((option) => option.value === category)?.labelKey || 'feedback.category.general');
}

function PostCard({ post, canModerate, onDelete, language, t }) {
  return (
    <article className={styles.post}>
      <div className={styles.postHeader}>
        <div>
          <span className={styles.category}>{getCategoryLabel(post.category, t)}</span>
          <h2>{post.title}</h2>
        </div>
        {canModerate && (
          <button type="button" className={styles.deleteButton} onClick={() => onDelete(post.id)}>
            {t('feedback.delete')}
          </button>
        )}
      </div>
      <p className={styles.body}>{post.body}</p>
      <div className={styles.meta}>
        <span>{post.authorName || t('feedback.defaultAuthor')}</span>
        <span>{displayDate(post.createdAt, language, t)}</span>
      </div>
    </article>
  );
}

export default function FeedbackPage() {
  const { currentUser, isAdmin } = useAuth();
  const { language, t } = useLanguage();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState('');
  const [form, setForm] = useState({
    title: '',
    category: CATEGORIES[0].value,
    body: '',
  });

  async function loadPosts() {
    setLoading(true);
    setError('');
    try {
      setPosts(await getFeedbackPosts());
    } catch {
      setError(t('feedback.loadError'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPosts();
  }, []);

  const visiblePosts = useMemo(() => {
    const query = filter.trim().toLowerCase();
    if (!query) return posts;
    return posts.filter((post) => [
      post.title,
      post.body,
      post.category,
      post.authorName,
    ].some((value) => String(value || '').toLowerCase().includes(query)));
  }, [posts, filter]);

  function setFormField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!currentUser) return;

    const title = form.title.trim();
    const body = form.body.trim();
    if (title.length < 4 || body.length < 10) {
      setError(t('feedback.validation'));
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');
    try {
      await saveFeedbackPost({
        title: title.slice(0, 120),
        body: body.slice(0, 2000),
        category: form.category,
        authorUid: currentUser.uid,
        authorName: getAuthorName(currentUser, t),
      });
      setForm({ title: '', category: CATEGORIES[0].value, body: '' });
      setMessage(t('feedback.posted'));
      await loadPosts();
    } catch (exception) {
      const messageText = String(exception?.message || '').toLowerCase();
      setError(messageText.includes('permission_denied') || messageText.includes('permission denied')
        ? t('feedback.rulesError')
        : t('feedback.postError', { message: exception.message || 'Please try again.' }));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(postId) {
    setSaving(true);
    setError('');
    try {
      await removeFeedbackPost(postId);
      await loadPosts();
    } catch {
      setError(t('feedback.deleteError'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page page--wide">
      <div className="page-header">
        <h1>{t('feedback.title')}</h1>
        <p>{t('feedback.subtitle')}</p>
      </div>

      <div className={styles.layout}>
        <section className={styles.composer}>
          <h2>{t('feedback.leave')}</h2>
          {currentUser ? (
            <form onSubmit={handleSubmit} className={styles.form}>
              <label className={styles.field}>
                <span>{t('feedback.category')}</span>
                <select
                  value={form.category}
                  onChange={(event) => setFormField('category', event.target.value)}
                >
                  {CATEGORIES.map((category) => (
                    <option key={category.value} value={category.value}>{t(category.labelKey)}</option>
                  ))}
                </select>
              </label>

              <label className={styles.field}>
                <span>{t('feedback.formTitle')}</span>
                <input
                  value={form.title}
                  maxLength={120}
                  placeholder={t('feedback.summaryPlaceholder')}
                  onChange={(event) => setFormField('title', event.target.value)}
                />
              </label>

              <label className={styles.field}>
                <span>{t('feedback.comment')}</span>
                <textarea
                  value={form.body}
                  maxLength={2000}
                  placeholder={t('feedback.commentPlaceholder')}
                  onChange={(event) => setFormField('body', event.target.value)}
                />
              </label>

              <GothicButton type="submit" size="small" disabled={saving}>
                {saving ? t('feedback.posting') : t('feedback.post')}
              </GothicButton>
            </form>
          ) : (
            <div className={styles.loginPrompt}>
              <p>{t('feedback.loginPrompt')}</p>
              <GothicButton to="/login" size="small">{t('feedback.loginToPost')}</GothicButton>
            </div>
          )}
          {message && <p className={styles.message}>{message}</p>}
        </section>

        <section className={styles.feed}>
          <div className={styles.feedHeader}>
            <h2>{t('feedback.playerPosts')}</h2>
            <input
              type="search"
              value={filter}
              placeholder={t('feedback.search')}
              onChange={(event) => setFilter(event.target.value)}
            />
          </div>

          {loading && <LoadingSpinner message={t('feedback.loading')} />}
          <ErrorMessage message={error} onRetry={loadPosts} />

          {!loading && !error && posts.length === 0 && (
            <div className={styles.empty}>
              {t('feedback.empty')}
            </div>
          )}

          {!loading && !error && posts.length > 0 && (
            <>
              <p className={styles.count}>
                {t('feedback.countNotice', { visible: visiblePosts.length, total: posts.length })}
              </p>
              <div className={styles.posts}>
                {visiblePosts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    canModerate={isAdmin}
                    onDelete={handleDelete}
                    language={language}
                    t={t}
                  />
                ))}
              </div>
            </>
          )}

          <p className={styles.privacyNote}>
            {t('feedback.privacy')}<Link to="/privacy-policy">{t('feedback.privacyLink')}</Link>.
          </p>
        </section>
      </div>
    </div>
  );
}
