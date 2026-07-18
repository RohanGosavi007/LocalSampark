'use client';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from './components/ui/Button';

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error('Application Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-96 h-96 bg-red-500/10 rounded-full blur-[120px] animate-blobBounce" />
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-orange-500/10 rounded-full blur-[100px] animate-blobBounce" style={{ animationDelay: '4s' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 text-center max-w-xl"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white shadow-xl shadow-red-500/20 mb-8"
        >
          <AlertTriangle className="w-12 h-12" />
        </motion.div>

        <h2 className="text-2xl lg:text-3xl font-heading font-black text-text mb-3">
          Something went wrong!
        </h2>
        <p className="text-lg text-text-muted mb-8 leading-relaxed">
          Don't worry — our team has been notified. This is usually a temporary hiccup. Try refreshing or head back home.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button size="lg" onClick={reset} className="shadow-xl shadow-primary/20">
            <RefreshCw className="w-4 h-4 mr-2" /> Try Again
          </Button>
          <a href="/">
            <Button size="lg" variant="secondary">
              <Home className="w-4 h-4 mr-2" /> Go Home
            </Button>
          </a>
        </div>

        <p className="mt-8 text-xs text-text-muted font-mono">
          {error?.message || 'Unknown error'}
        </p>
      </motion.div>
    </div>
  );
}
