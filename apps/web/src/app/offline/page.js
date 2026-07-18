'use client';
import { motion } from 'framer-motion';
import { WifiOff, RefreshCw, Home } from 'lucide-react';
import { Button } from '../components/ui/Button';

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-primary/10 rounded-full blur-[100px]" />
      </div>
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 text-center max-w-xl">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white shadow-xl shadow-blue-500/20 mb-8"
        >
          <WifiOff className="w-12 h-12" />
        </motion.div>
        <h2 className="text-2xl lg:text-3xl font-heading font-black text-text mb-3">You're Offline</h2>
        <p className="text-lg text-text-muted mb-8 leading-relaxed">
          No internet connection detected. Some features may be limited. Check your connection and try again.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button size="lg" onClick={() => window.location.reload()} className="shadow-xl shadow-primary/20">
            <RefreshCw className="w-4 h-4 mr-2" /> Try Again
          </Button>
          <a href="/"><Button size="lg" variant="secondary"><Home className="w-4 h-4 mr-2" /> Cached Home</Button></a>
        </div>
      </motion.div>
    </div>
  );
}
