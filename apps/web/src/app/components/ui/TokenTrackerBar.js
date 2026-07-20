'use client';
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Users, Bell } from 'lucide-react';

/**
 * TokenTrackerBar — Real-time queue position indicator
 * Shows: "Currently Serving Token #18 | You are Token #22 (Est. wait 12 mins)"
 * Connects to Socket.io for live updates
 */
export default function TokenTrackerBar({ shopId, userToken = null, socket = null }) {
  const [queueState, setQueueState] = useState({
    currentlyServing: 0,
    waitingCount: 0,
    estimatedWaitMinutes: 0,
    isPaused: false,
  });

  useEffect(() => {
    if (!socket || !shopId) return;

    // Join shop room for live updates
    socket.emit('join:shop', shopId);
    socket.emit('token:get_state', { shopId });

    // Listen for live queue updates
    const handleLiveUpdate = (data) => {
      setQueueState(prev => ({
        ...prev,
        currentlyServing: data.currentlyServing ?? prev.currentlyServing,
        waitingCount: data.waitingCount ?? prev.waitingCount,
        estimatedWaitMinutes: data.estimatedWaitMinutes ?? prev.estimatedWaitMinutes,
        isPaused: data.isPaused ?? prev.isPaused,
      }));
    };

    const handleState = (data) => {
      setQueueState({
        currentlyServing: data.currentlyServing || 0,
        waitingCount: data.waitingCount || 0,
        estimatedWaitMinutes: (data.waitingCount || 0) * (data.avgServiceMinutes || 10),
        isPaused: data.isPaused || false,
      });
    };

    socket.on('token:live_update', handleLiveUpdate);
    socket.on('token:state', handleState);

    return () => {
      socket.off('token:live_update', handleLiveUpdate);
      socket.off('token:state', handleState);
      socket.emit('leave:shop', shopId);
    };
  }, [socket, shopId]);

  const userPosition = userToken ? userToken - queueState.currentlyServing : null;
  const userWait = userPosition && userPosition > 0
    ? Math.round(userPosition * (queueState.estimatedWaitMinutes / Math.max(queueState.waitingCount, 1)))
    : 0;

  const isYourTurn = userToken && userToken === queueState.currentlyServing;

  return (
    <div className="w-full">
      {/* Main Tracker Bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-2xl border overflow-hidden ${
          isYourTurn
            ? 'bg-green-500/10 border-green-500/30'
            : queueState.isPaused
              ? 'bg-yellow-500/10 border-yellow-500/30'
              : 'bg-cat-primary-light border-cat-primary/20'
        }`}
        style={!isYourTurn && !queueState.isPaused ? { borderColor: 'var(--cat-primary-glass)' } : {}}
      >
        {/* Progress Bar */}
        {queueState.currentlyServing > 0 && (
          <div className="h-1 bg-background-alt">
            <motion.div
              className="h-full rounded-full"
              style={{ background: isYourTurn ? '#22c55e' : 'var(--cat-gradient, var(--primary))' }}
              initial={{ width: '0%' }}
              animate={{ width: queueState.waitingCount > 0 ? `${Math.min(90, (queueState.currentlyServing / (queueState.currentlyServing + queueState.waitingCount)) * 100)}%` : '100%' }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
        )}

        <div className="p-4">
          {/* Paused State */}
          {queueState.isPaused && (
            <div className="flex items-center gap-2 text-yellow-600 mb-2">
              <span className="text-lg">⏸️</span>
              <span className="text-sm font-bold">Queue is temporarily paused</span>
            </div>
          )}

          {/* Your Turn */}
          {isYourTurn && (
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-3 mb-2"
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center"
              >
                <Bell className="w-5 h-5 text-white" />
              </motion.div>
              <div>
                <p className="text-lg font-heading font-black text-green-600">It's Your Turn!</p>
                <p className="text-sm text-green-700/70">Token #{userToken} — Please proceed</p>
              </div>
            </motion.div>
          )}

          {/* Normal Queue Display */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            {/* Currently Serving */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center font-heading font-black text-lg text-white"
                style={{ background: 'var(--cat-gradient, var(--primary))' }}>
                {queueState.currentlyServing || '—'}
              </div>
              <div>
                <p className="text-xs text-text-muted font-medium">Currently Serving</p>
                <p className="font-heading font-bold text-text">Token #{queueState.currentlyServing || '—'}</p>
              </div>
            </div>

            {/* Divider */}
            <div className="hidden sm:block w-px h-10 bg-border" />

            {/* Waiting Count */}
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-text-muted" />
              <div>
                <p className="text-xs text-text-muted font-medium">In Queue</p>
                <p className="font-bold text-text">{queueState.waitingCount} waiting</p>
              </div>
            </div>

            {/* Divider */}
            <div className="hidden sm:block w-px h-10 bg-border" />

            {/* Estimated Wait / Your Position */}
            {userToken && !isYourTurn && userPosition > 0 ? (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-cat-primary" />
                <div>
                  <p className="text-xs text-text-muted font-medium">Your Token: #{userToken}</p>
                  <p className="font-bold" style={{ color: 'var(--cat-primary)' }}>
                    ~{userWait} min wait ({userPosition} ahead)
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-text-muted" />
                <div>
                  <p className="text-xs text-text-muted font-medium">Est. Wait</p>
                  <p className="font-bold text-text">~{queueState.estimatedWaitMinutes} mins</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
