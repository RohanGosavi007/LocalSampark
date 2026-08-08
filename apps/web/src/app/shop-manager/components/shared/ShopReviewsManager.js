'use client';
import React, { useState } from 'react';
import {
  Star, MessageCircle, Flag, ThumbsUp, CheckCircle,
  Filter, Search, Clock, Reply, User
} from 'lucide-react';

const DEMO_REVIEWS = [
  { id: 'r1', customer: 'Anjali Verma', rating: 5, date: 'Today, 10:30 AM', text: 'Great service! The vegetables were extremely fresh and delivered very quickly.', status: 'Pending Reply', reply: '' },
  { id: 'r2', customer: 'Rajesh K.', rating: 4, date: 'Yesterday', text: 'Good variety of products, but the delivery took a bit longer than expected.', status: 'Responded', reply: 'We apologize for the delay Rajesh. We are working on improving our delivery speed.' },
  { id: 'r3', customer: 'Smita P.', rating: 5, date: 'Aug 04, 2026', text: 'My go-to store for all daily needs. Love the new loyalty points feature!', status: 'Responded', reply: 'Thank you Smita! We are glad you love it.' },
  { id: 'r4', customer: 'Kunal M.', rating: 2, date: 'Aug 02, 2026', text: 'One of the milk packets was leaking when it arrived.', status: 'Pending Reply', reply: '' },
  { id: 'r5', customer: 'Pooja J.', rating: 5, date: 'Jul 28, 2026', text: 'Excellent behavior by the store staff.', status: 'Pending Reply', reply: '' },
];

export default function ShopReviewsManager() {
  const [reviews, setReviews] = useState(DEMO_REVIEWS);
  const [filterRating, setFilterRating] = useState('All'); // All | 5 | 4 | 3 | 2 | 1
  const [filterStatus, setFilterStatus] = useState('All'); // All | Pending Reply | Responded
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');

  const handleReplySubmit = (id) => {
    if (!replyText.trim()) return;
    setReviews(prev => prev.map(r => r.id === id ? { ...r, reply: replyText, status: 'Responded' } : r));
    setReplyingTo(null);
    setReplyText('');
  };

  const avgRating = (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1);

  const filtered = reviews.filter(r => {
    const matchRating = filterRating === 'All' || r.rating.toString() === filterRating;
    const matchStatus = filterStatus === 'All' || r.status === filterStatus;
    return matchRating && matchStatus;
  });

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1000 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Star size={20} style={{ color: '#f59e0b' }} /> Customer Reviews
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Manage your shop's reputation and reply to customers</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: 'var(--surface)', padding: '1.25rem', borderRadius: '1rem', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#f59e0b' }}>{avgRating}</div>
          <div>
            <div style={{ display: 'flex', gap: '0.1rem', color: '#f59e0b', marginBottom: '0.25rem' }}>
              {[1,2,3,4,5].map(s => <Star key={s} size={16} fill={s <= avgRating ? 'currentColor' : 'none'} />)}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Based on {reviews.length} reviews</div>
          </div>
        </div>
        
        <div style={{ background: 'var(--surface)', padding: '1.25rem', borderRadius: '1rem', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 800 }}>{reviews.filter(r => r.status === 'Pending Reply').length}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Pending Replies</div>
          </div>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MessageCircle size={24} />
          </div>
        </div>
      </div>

      <div style={{ background: 'var(--surface)', borderRadius: '1rem', border: '1px solid var(--border)', overflow: 'hidden' }}>
        {/* Filters */}
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '1rem', background: 'var(--background)' }}>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: '0.5rem', background: 'var(--surface)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
            <option value="All">All Reviews</option>
            <option value="Pending Reply">Pending Reply</option>
            <option value="Responded">Responded</option>
          </select>
          <select value={filterRating} onChange={e => setFilterRating(e.target.value)}
            style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: '0.5rem', background: 'var(--surface)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
            <option value="All">All Ratings</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
          </select>
        </div>

        {/* List */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {filtered.map(r => (
            <div key={r.id} style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--primary-light, rgba(99,102,241,0.1))', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{r.customer}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', gap: '0.1rem', color: '#f59e0b' }}>
                        {[1,2,3,4,5].map(s => <Star key={s} size={12} fill={s <= r.rating ? 'currentColor' : 'none'} />)}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.date}</span>
                    </div>
                  </div>
                </div>
                {r.status === 'Pending Reply' ? (
                  <span style={{ padding: '0.2rem 0.6rem', borderRadius: '2rem', fontSize: '0.7rem', fontWeight: 700, background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>NEEDS REPLY</span>
                ) : (
                  <span style={{ padding: '0.2rem 0.6rem', borderRadius: '2rem', fontSize: '0.7rem', fontWeight: 700, background: 'rgba(16,185,129,0.1)', color: '#10b981' }}><CheckCircle size={10} style={{ display: 'inline', marginRight: '0.2rem' }}/> RESPONDED</span>
                )}
              </div>
              
              <p style={{ fontSize: '0.9rem', lineHeight: 1.5, color: 'var(--text)', marginBottom: '1rem' }}>"{r.text}"</p>
              
              {r.reply ? (
                <div style={{ background: 'var(--background)', padding: '1rem', borderRadius: '0.75rem', borderLeft: '3px solid var(--primary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <Reply size={14} style={{ color: 'var(--primary)' }} />
                    <span style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--primary)' }}>Your Reply</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{r.reply}</p>
                </div>
              ) : replyingTo === r.id ? (
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                  <textarea 
                    autoFocus
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    placeholder="Write your response to the customer..."
                    style={{ flex: 1, padding: '0.625rem 0.875rem', border: '1px solid var(--primary)', borderRadius: '0.5rem', background: 'var(--background)', fontSize: '0.85rem', outline: 'none', resize: 'vertical', minHeight: 60 }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <button onClick={() => handleReplySubmit(r.id)} style={{ padding: '0.5rem 1rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}>Post Reply</button>
                    <button onClick={() => { setReplyingTo(null); setReplyText(''); }} style={{ padding: '0.5rem 1rem', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => { setReplyingTo(r.id); setReplyText(''); }} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.875rem', background: 'transparent', border: '1px solid var(--border)', borderRadius: '2rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', color: 'var(--text)' }}>
                  <Reply size={14} /> Reply to Customer
                </button>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No reviews found matching criteria.</div>
          )}
        </div>
      </div>
    </div>
  );
}
