import React, { useState, useEffect } from 'react';

const cardStyle = { background: '#1e293b', padding: '2rem', borderRadius: '1rem', border: '1px solid #334155' };
const btnPrimary = { padding: '0.6rem 1.2rem', background: '#4f46e5', border: 'none', color: '#fff', borderRadius: '0.5rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' };
const btnDanger = { ...btnPrimary, background: '#ef4444' };

export default function CommunityTab({ API_BASE, authHeaders }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/community/posts`, { headers: authHeaders() });
      const data = await res.json();
      setPosts(data.posts || data.data || []);
    } catch (e) {
      console.error('Failed to fetch community posts:', e);
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
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.5rem 0', color: '#f8fafc' }}>🏡 Townsquare Community Moderation</h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>Review, audit, and moderate neighborhood alerts, discussions, and lost-and-found posts.</p>
          </div>
          <button onClick={fetchPosts} style={btnPrimary}>{loading ? 'Loading...' : 'Refresh'}</button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                {['Author', 'Category', 'Post Content', 'Pincode', 'Actions'].map(h => 
                  <th key={h} style={{ textAlign: 'left', padding: '0.75rem 1rem', color: '#94a3b8', fontWeight: 600 }}>{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {posts.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No community feed posts found.</td></tr>
              ) : posts.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #1e293b' }}>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#f8fafc' }}>{p.author_name}</td>
                  <td style={{ padding: '0.85rem 1rem', color: '#6366f1', textTransform: 'uppercase', fontWeight: 700, fontSize: '0.75rem' }}>{p.category}</td>
                  <td style={{ padding: '0.85rem 1rem', color: '#cbd5e1', maxWidth: '400px' }}>{p.content}</td>
                  <td style={{ padding: '0.85rem 1rem', color: '#94a3b8' }}>{p.pincode || '411015'}</td>
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
