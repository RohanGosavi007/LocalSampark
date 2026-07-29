'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { Map as MapIcon } from 'lucide-react';

export default function InteractiveMapInternal({ location, sortedShops, onSelectShop }) {
  return (
    <div className="h-[600px] w-full rounded-3xl overflow-hidden relative border border-border bg-background shadow-inner">
      <iframe
        width="100%"
        height="100%"
        frameBorder="0"
        scrolling="no"
        marginHeight="0"
        marginWidth="0"
        src={`https://www.openstreetmap.org/export/embed.html?bbox=${(location?.lng || 73.87) - 0.05}%2C${(location?.lat || 18.57) - 0.05}%2C${(location?.lng || 73.87) + 0.05}%2C${(location?.lat || 18.57) + 0.05}&layer=mapnik`}
        className="absolute inset-0 opacity-50 grayscale"
      ></iframe>
      {sortedShops.map((shop, i) => (
        <motion.div
          key={shop.id}
          onClick={() => onSelectShop(shop)}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: Math.min(i * 0.03, 0.3) }}
          className="absolute bg-primary text-white p-2 rounded-full cursor-pointer z-10 shadow-lg hover:scale-125 hover:bg-secondary transition-all"
          style={{ top: `${20 + ((i * 17) % 60)}%`, left: `${20 + ((i * 23) % 60)}%` }}
          title={shop.name}
        >
          <MapIcon className="w-4 h-4" />
        </motion.div>
      ))}
      <div className="absolute bottom-6 left-6 right-6 md:right-auto md:w-80 bg-background/90 backdrop-blur-md p-6 rounded-2xl z-20 shadow-xl border border-border">
        <h4 className="text-lg font-heading font-bold mb-1">Interactive Map</h4>
        <p className="text-sm text-text-muted">Showing {sortedShops.length} shops near your location</p>
      </div>
    </div>
  );
}
