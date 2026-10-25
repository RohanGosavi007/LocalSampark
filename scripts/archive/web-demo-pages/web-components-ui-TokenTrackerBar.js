import React from 'react';
import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';

export default function TokenTrackerBar({ shopId, userToken }) {
  // Mock data for display purposes
  const currentToken = 5;
  const estimatedWait = 25; // mins

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20 rounded-2xl p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-text font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Queue is Active
          </p>
          <p className="text-text-muted text-sm mt-1">
            Now serving token <span className="font-bold text-blue-500">#{currentToken}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-blue-500">#{userToken}</p>
          <p className="text-xs text-text-muted font-bold uppercase">Your Token</p>
        </div>
      </div>

      <div className="relative h-2 bg-background-alt rounded-full overflow-hidden mb-3">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${(currentToken / userToken) * 100}%` }}
          className="absolute left-0 top-0 bottom-0 bg-blue-500 rounded-full"
        />
      </div>

      <div className="flex justify-between items-center text-xs text-text-muted font-bold">
        <span>{userToken - currentToken} people ahead</span>
        <span className="flex items-center gap-1 text-amber-500">
          <Clock className="w-3 h-3" /> ~{estimatedWait} mins wait
        </span>
      </div>
    </motion.div>
  );
}
