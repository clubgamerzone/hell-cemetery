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
import styles from './FeedbackPage.module.css';

const CATEGORIES = [
  'General Feedback',
  'Bug Report',
  'Balance',
  'Feature Idea',
  'Community',
];

function displayDate(value) {
  if (!value) return 'Just now';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(Number(value)));
}

function getAuthorName(user) {
  if (!user) return 'Cemetery Player';
  if (user.displayName) return user.displayName;
  if (user.email) return user.email.split('@')[0];
  return 'Cemetery Player';
}

function PostCard({ post, canModerate, onDelete }) {
  return (
    <article className={styles.post}>
      <div className={styles.postHeader}>
        <div>
          <span className={styles.category}>{post.category || 'General Feedback'}</span>
          <h2>{post.title}</h2>
        </div>
        {canModerate && (
          <button type="button" className={styles.deleteButton} onClick={() => onDelete(post.id)}>
            Delete
          </button>
        )}
      </div>
      <p className={styles.body}>{post.body}</p>
      <div className={styles.meta}>
        <span>{post.authorName || 'Cemetery Player'}</span>
        <span>{displayDate(post.createdAt)}</span>
      </div>
    </article>
  );
}

export default function FeedbackPage() {
  const { currentUser, isAdmin } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState('');
  const [form, setForm] = useState({
    title: '',
    category: CATEGORIES[0],
    body: '',
  });

  async function loadPosts() {
    setLoading(true);
    setError('');
    try {
      setPosts(await getFeedbackPosts());
    } catch {
      setError('Failed to load community feedback.');
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
      setError('Please add a clear title and at least a short message.');
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
        authorName: getAuthorName(currentUser),
      });
      setForm({ title: '', category: CATEGORIES[0], body: '' });
      setMessage('Feedback posted.');
      await loadPosts();
    } catch (exception) {
      const messageText = String(exception?.message || '').toLowerCase();
      setError(messageText.includes('permission_denied') || messageText.includes('permission denied')
        ? 'Firebase rejected the post. Update Realtime Database rules to allow signed-in users to write CommunityFeedback/posts.'
        : `Could not post feedback: ${exception.message || 'Please try again.'}`);
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
      setError('Could not delete that post.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page page--wide">
      <div className="page-header">
        <h1>Community Feedback</h1>
        <p>
          Share ideas, report issues, and help shape Hell Cemetery with other players.
        </p>
      </div>

      <div className={styles.layout}>
        <section className={styles.composer}>
          <h2>Leave Feedback</h2>
          {currentUser ? (
            <form onSubmit={handleSubmit} className={styles.form}>
              <label className={styles.field}>
                <span>Category</span>
                <select
                  value={form.category}
                  onChange={(event) => setFormField('category', event.target.value)}
                >
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </label>

              <label className={styles.field}>
                <span>Title</span>
                <input
                  value={form.title}
                  maxLength={120}
                  placeholder="Short summary"
                  onChange={(event) => setFormField('title', event.target.value)}
                />
              </label>

              <label className={styles.field}>
                <span>Comment</span>
                <textarea
                  value={form.body}
                  maxLength={2000}
                  placeholder="Tell us what you think..."
                  onChange={(event) => setFormField('body', event.target.value)}
                />
              </label>

              <GothicButton type="submit" size="small" disabled={saving}>
                {saving ? 'Posting...' : 'Post Feedback'}
              </GothicButton>
            </form>
          ) : (
            <div className={styles.loginPrompt}>
              <p>Players can read feedback here. Sign in to post your own comment.</p>
              <GothicButton to="/login" size="small">Login to Post</GothicButton>
            </div>
          )}
          {message && <p className={styles.message}>{message}</p>}
        </section>

        <section className={styles.feed}>
          <div className={styles.feedHeader}>
            <h2>Player Posts</h2>
            <input
              type="search"
              value={filter}
              placeholder="Search feedback..."
              onChange={(event) => setFilter(event.target.value)}
            />
          </div>

          {loading && <LoadingSpinner message="Loading community posts..." />}
          <ErrorMessage message={error} onRetry={loadPosts} />

          {!loading && !error && posts.length === 0 && (
            <div className={styles.empty}>
              No feedback yet. The first post is waiting for a brave soul.
            </div>
          )}

          {!loading && !error && posts.length > 0 && (
            <>
              <p className={styles.count}>
                Showing {visiblePosts.length} of {posts.length} posts.
              </p>
              <div className={styles.posts}>
                {visiblePosts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    canModerate={isAdmin}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </>
          )}

          <p className={styles.privacyNote}>
            Please avoid sharing private account details. Read the <Link to="/privacy-policy">privacy policy</Link>.
          </p>
        </section>
      </div>
    </div>
  );
}
