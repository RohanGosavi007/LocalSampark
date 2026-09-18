import React, { useState, useEffect } from 'react';
import TabError from '../TabError';
import { fetchJson } from '../../lib/api';

const cardStyle = { background: 'var(--surface-1)', padding: '2rem', borderRadius: '1rem', border: '1px solid var(--line)' };
const btnPrimary = { padding: '0.6rem 1.2rem', background: 'var(--accent)', border: 'none', color: 'var(--on-solid)', borderRadius: '0.5rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' };
const btnDanger = { ...btnPrimary, background: 'var(--danger)' };

export default function CommunityTab({ API_BASE, authHeaders }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPosts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJson(`${API_BASE}/admin/community/posts`, { headers: authHeaders() });
      setPosts(data.posts || data.data || []);
    } catch (e) {
      console.error('Failed to fetch community posts:', e);
      setError(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this community post?')) return;
    try {
      await fetch(`${API_BASE}/admin/community/posts/${id}`, { method: 'DELETE', headers: authHeaders() });
      fetchPosts();
    } catch (e) {
      console.error(e);
      setError(e);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <TabError error={error} onRetry={typeof fetchData === 'function' ? fetchData : undefined} />
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.5rem 0', color: 'var(--ink)' }}>🏡 Townsquare Community Moderation</h3>
            <p style={{ color: 'var(--ink-subtle)', fontSize: '0.85rem', margin: 0 }}>Review, audit, and moderate neighborhood alerts, discussions, and lost-and-found posts.</p>
          </div>
          <button onClick={fetchPosts} style={btnPrimary}>{loading ? 'Loading...' : 'Refresh'}</button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                {['Author', 'Category', 'Post Content', 'Pincode', 'Actions'].map(h => 
                  <th key={h} style={{ textAlign: 'left', padding: '0.75rem 1rem', color: 'var(--ink-muted)', fontWeight: 600 }}>{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {posts.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--ink-subtle)' }}>No community feed posts found.</td></tr>
              ) : posts.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--ink)' }}>{p.author_name}</td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--accent-text)', textTransform: 'uppercase', fontWeight: 700, fontSize: '0.75rem' }}>{p.category}</td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--ink)', maxWidth: '400px' }}>{p.content}</td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--ink-muted)' }}>{p.pincode || '411015'}</td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <button onClick={() => handleDelete(p.id)} style={{ ...btnDanger, padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
