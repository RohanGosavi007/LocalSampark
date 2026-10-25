'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { Clock } from 'lucide-react';
import { apiGet, apiPost } from '@/lib/api';

// A shop's live queue, from GET /token-queue/:shopId, and a button to join it. This used to
// show "Now serving #5 — your token #8" for every shop, whatever its queue was and whether or
// not the visitor had joined. It now says nothing at all when the shop is not running a queue
// today, and the visitor's own token is the one the server issued.
const storeKey = (shopId) => `queueToken:${shopId}:${new Date().toISOString().slice(0, 10)}`;

export default function TokenTrackerBar({ shopId }) {
  const [queue, setQueue] = useState(null);
  const [mine, setMine] = useState(null);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storeKey(shopId));
      if (saved) setMine(Number(saved));
    } catch (e) { /* storage blocked: the queue still shows, the token just is not remembered */ }
  }, [shopId]);

  const load = useCallback(async () => {
    try {
      setQueue(await apiGet(`/token-queue/${shopId}`));
    } catch (e) {
      setQueue(null);
    }
  }, [shopId]);

  useEffect(() => {
    if (!shopId) return undefined;
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [shopId, load]);

  const join = async () => {
    setJoining(true);
    setError(null);
    try {
      const r = await apiPost(`/token-queue/${shopId}/join`, { serviceType: 'visit' });
      setMine(r.tokenNumber);
      try { window.localStorage.setItem(storeKey(shopId), String(r.tokenNumber)); } catch (e) { /* ignore */ }
      load();
    } catch (e) {
      setError(e.status === 401 ? 'Please log in to join the queue.' : (e.message || 'Could not join the queue.'));
    } finally {
      setJoining(false);
    }
  };

  const running = queue && (queue.totalTokensToday > 0 || queue.currentToken > 0);
  if (!running) return <p className="text-sm text-text-muted">No queue is running at the moment.</p>;

  const ahead = mine ? Math.max(0, mine - queue.currentToken - 1) : null;
  const wait = ahead !== null ? ahead * (queue.avgServiceMinutes || 10) : null;

  return (
    <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-text font-bold flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${queue.isPaused ? 'bg-amber-500' : 'bg-green-500 animate-pulse'}`} />
            {queue.isPaused ? 'Queue paused' : 'Queue is active'}
          </p>
          <p className="text-text-muted text-sm mt-1">
            Now serving token <span className="font-bold text-blue-500">#{queue.currentToken}</span> · {queue.waitingCount} waiting
          </p>
        </div>
        {mine && (
          <div className="text-right">
            <p className="text-2xl font-black text-blue-500">#{mine}</p>
            <p className="text-xs text-text-muted font-bold uppercase">Your token</p>
          </div>
        )}
      </div>
      {mine ? (
        <div className="flex justify-between items-center text-xs text-text-muted font-bold">
          <span>{ahead === 0 ? "You're next" : `${ahead} ${ahead === 1 ? 'person' : 'people'} ahead`}</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> about {wait} min</span>
        </div>
      ) : (
        <button type="button" onClick={join} disabled={joining || queue.isPaused} className="bg-blue-600 text-white font-bold px-4 py-2 rounded-xl disabled:opacity-60">
          {joining ? 'Joining…' : 'Join the queue'}
        </button>
      )}
      {error && <p role="alert" className="text-red-500 text-sm font-bold mt-2">{error}</p>}
    </div>
  );
}
