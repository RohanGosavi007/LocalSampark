'use client';
import React from 'react';
import { SearchX, RefreshCw, MapPin, Compass, ShoppingBag } from 'lucide-react';
import { Button } from './Button';

export function EmptyState({
  icon: Icon = SearchX,
  title = 'No results found',
  description = 'We couldn\'t find what you\'re looking for in this area. Try adjusting your search query or location filters.',
  actionLabel = 'Reset Filters',
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className = ''
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 md:p-12 bg-background/40 border border-border/80 rounded-3xl backdrop-blur-xl shadow-2xl max-w-lg mx-auto my-8 ${className}`}>
      <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6 shadow-xl shadow-emerald-500/5 animate-pulse">
        <Icon className="w-10 h-10" />
      </div>

      <h3 className="text-2xl font-heading font-black text-text mb-2">
        {title}
      </h3>
      
      <p className="text-sm text-text-muted max-w-sm mb-8 leading-relaxed">
        {description}
      </p>

      <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
        {onAction && (
          <Button
            onClick={onAction}
            size="lg"
            variant="primary"
            className="w-full sm:w-auto shadow-xl shadow-emerald-600/20"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {actionLabel}
          </Button>
        )}
        
        {onSecondaryAction && (
          <Button
            onClick={onSecondaryAction}
            size="lg"
            variant="secondary"
            className="w-full sm:w-auto"
          >
            <Compass className="w-4 h-4 mr-2" />
            {secondaryActionLabel || 'Explore Nearby'}
          </Button>
        )}
      </div>
    </div>
  );
}
