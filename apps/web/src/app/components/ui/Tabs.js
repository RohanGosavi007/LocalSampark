import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from './Button';

const Tabs = ({ 
  tabs, 
  activeTab, 
  onChange, 
  className,
  variant = 'underline' // underline, pill
}) => {
  return (
    <div className={cn("flex overflow-x-auto hide-scrollbar", className)}>
      <div className="flex space-x-1 p-1 bg-background-alt/50 backdrop-blur-md rounded-xl border border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap outline-none",
              activeTab === tab.id 
                ? "text-primary" 
                : "text-text-muted hover:text-text hover:bg-border/30"
            )}
          >
            {activeTab === tab.id && variant === 'pill' && (
              <motion.div
                layoutId="active-tab-pill"
                className="absolute inset-0 bg-primary/10 rounded-lg"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
            
            <span className="relative flex items-center gap-2 z-10">
              {tab.icon && <tab.icon className="w-4 h-4" />}
              {tab.label}
              {tab.badge && (
                <span className="ml-1 bg-primary text-white text-[10px] px-1.5 py-0.5 rounded-full">
                  {tab.badge}
                </span>
              )}
            </span>

            {activeTab === tab.id && variant === 'underline' && (
              <motion.div
                layoutId="active-tab-underline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export { Tabs };
