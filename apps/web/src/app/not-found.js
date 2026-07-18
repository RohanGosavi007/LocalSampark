'use client';
import { motion } from 'framer-motion';
import { Home, ArrowLeft, MapPin, Search } from 'lucide-react';
import { Button } from './components/ui/Button';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 right-20 w-96 h-96 bg-primary/10 rounded-full blur-[120px] animate-blobBounce" />
        <div className="absolute bottom-20 left-20 w-80 h-80 bg-secondary/10 rounded-full blur-[100px] animate-blobBounce" style={{ animationDelay: '4s' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 text-center max-w-xl"
      >
        {/* 404 Number */}
        <motion.h1
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="text-[10rem] lg:text-[14rem] font-heading font-black leading-none tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-primary/30 to-primary/5 select-none"
        >
          404
        </motion.h1>

        {/* Map Pin Illustration */}
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="relative -mt-20 mb-8"
        >
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white shadow-xl shadow-primary/20 animate-float">
            <MapPin className="w-10 h-10" />
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <h2 className="text-2xl lg:text-3xl font-heading font-black text-text mb-3">
            This lane doesn't exist!
          </h2>
          <p className="text-lg text-text-muted mb-8 leading-relaxed">
            Looks like you took a wrong turn in the neighborhood. The page you're looking for has either moved or doesn't exist.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-3 justify-center"
        >
          <a href="/">
            <Button size="lg" className="shadow-xl shadow-primary/20">
              <Home className="w-4 h-4 mr-2" /> Go Home
            </Button>
          </a>
          <a href="/shops">
            <Button size="lg" variant="secondary">
              <Search className="w-4 h-4 mr-2" /> Browse Shops
            </Button>
          </a>
        </motion.div>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
          className="mt-8 text-xs text-text-muted"
        >
          Error Code: 404 • <button onClick={() => window.history.back()} className="text-primary hover:underline cursor-pointer"><ArrowLeft className="w-3 h-3 inline" /> Go back</button>
        </motion.p>
      </motion.div>
    </div>
  );
}
