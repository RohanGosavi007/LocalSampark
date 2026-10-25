'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { ThumbsUp, Send } from 'lucide-react';
import { apiGet, apiPost } from '@/lib/api';

// The neighbourhood feed, from GET /feed/posts, with posting (POST /feed/posts) and up-votes
// (POST /feed/posts/:id/vote). This page used to render six posts by invented neighbours and
// two polls that counted votes in the browser; "Post" added to this browser's list only.
const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'alert', label: 'Alerts' },
  { id: 'event', label: 'Events' },
  { id: 'question', label: 'Questions' },
  { id: 'discussion', label: 'Discussions' },
];

const ago = (iso) => {
  if (!iso) return '';
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins} min ago`;
  if (mins < 1440) return `${Math.round(mins / 60)} hr ago`;
  return `${Math.round(mins / 1440)} d ago`;
};

export default function CommunityPage() {
  const [posts, setPosts] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [text, setText] = useState('');
  const [kind, setKind] = useState('discussion');
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState(null);

  const load = useCallback(() => {
    apiGet('/feed/posts?limit=50')
      .then((r) => { setPosts(Array.isArray(r) ? r : (r && (r.data || r.rows)) || []); setError(null); })
      .catch((e) => setError(e.message || 'The feed could not be loaded.'));
  }, []);
  useEffect(() => { load(); }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim() || posting) return;
    setPosting(true);
    setPostError(null);
    try {
      await apiPost('/feed/posts', { content: text.trim(), postType: kind });
      setText('');
      load();
    } catch (err) {
      setPostError(err.status === 401 ? 'Please log in to post.' : (err.message || 'Your post could not be sent.'));
    } finally {
      setPosting(false);
    }
  };

  const upvote = async (id) => {
    try {
      await apiPost(`/feed/posts/${id}/vote`, { voteType: 'up' });
      load();
    } catch (err) {
      setPostError(err.status === 401 ? 'Please log in to vote.' : (err.message || 'Your vote was not saved.'));
    }
  };

  const shown = (posts || []).filter((p) => filter === 'all' || p.post_type === filter);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 pt-24 pb-16">
        <div className="max-w-2xl mx-auto px-4 space-y-5">
          <h1 className="text-3xl font-heading font-black text-text">Community</h1>

          <form onSubmit={submit} className="glass-card rounded-2xl border border-border p-4 space-y-3">
            <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={5000} rows={3} placeholder="What's happening in your neighbourhood?" className="w-full bg-background border border-border rounded-xl p-3 text-text" />
            <div className="flex items-center justify-between gap-3">
              <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Post type" className="bg-background border border-border rounded-xl px-3 py-2 text-sm">
                {FILTERS.filter((f) => f.id !== 'all').map((f) => <option key={f.id} value={f.id}>{f.label.replace(/s$/, '')}</option>)}
              </select>
              <button type="submit" disabled={posting || !text.trim()} className="flex items-center gap-2 bg-primary text-white font-bold px-5 py-2 rounded-xl disabled:opacity-60"><Send className="w-4 h-4" /> {posting ? 'Posting…' : 'Post'}</button>
            </div>
            {postError && <p role="alert" className="text-red-500 text-sm font-bold">{postError}</p>}
          </form>

          <div className="flex gap-2 flex-wrap">
            {FILTERS.map((f) => (
              <button key={f.id} type="button" onClick={() => setFilter(f.id)} className={`px-4 py-1.5 rounded-full text-sm font-bold border ${filter === f.id ? 'bg-primary text-white border-primary' : 'border-border text-text-muted'}`}>{f.label}</button>
            ))}
          </div>

          {error && <p role="alert" className="text-red-500 font-bold">{error}</p>}
          {posts === null && !error && <p className="text-text-muted">Loading…</p>}
          {posts && shown.length === 0 && <p className="text-text-muted">No posts yet. Be the first to say something.</p>}

          {shown.map((p) => (
            <article key={p.id} className="glass-card rounded-2xl border border-border p-5">
              <div className="flex justify-between mb-2">
                <p className="font-bold text-text">{p.full_name || 'Neighbour'}</p>
                <p className="text-xs text-text-muted">{ago(p.created_at)}{p.post_type ? ` • ${p.post_type}` : ''}</p>
              </div>
              <p className="text-text-muted whitespace-pre-wrap">{p.content}</p>
              <button type="button" onClick={() => upvote(p.id)} className="mt-3 flex items-center gap-2 text-sm font-bold text-text-muted hover:text-primary"><ThumbsUp className="w-4 h-4" /> {Number(p.upvotes) || 0}</button>
            </article>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
