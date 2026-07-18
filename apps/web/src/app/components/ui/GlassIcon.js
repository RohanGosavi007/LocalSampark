'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { cn } from './Button'; // Assuming cn is exported from Button.js based on page.js
import DynamicIcon, { getCategoryIconInfo } from '../DynamicIcon';

/**
 * GlassIcon — Animated glassmorphism icon wrapper
 * Enhanced: Accepts categorySlug for auto-resolve from 55-category registry
 *
 * Usage:
 *   <GlassIcon icon={ShoppingCart} />                          // Direct icon component
 *   <GlassIcon categorySlug="grocery-supermarkets" />          // Auto-resolve from registry
 *   <GlassIcon categorySlug="pharmacy-healthcare" animated />  // With pulse animation
 */
export function GlassIcon({ 
  icon: Icon,
  categorySlug,
  iconName,
  colorClass = "text-primary", 
  bgClass = "bg-primary/10", 
  borderClass = "border-primary/20",
  size = "w-12 h-12",
  iconSize = "w-6 h-6",
  animated = false,
  className 
}) {
  // If categorySlug provided, auto-resolve colors
  let resolvedBgClass = bgClass;
  let resolvedBorderClass = borderClass;
  let resolvedColorClass = colorClass;

  if (categorySlug) {
    const catInfo = getCategoryIconInfo(categorySlug);
    if (catInfo?.color) {
      resolvedBgClass = '';
      resolvedBorderClass = '';
      resolvedColorClass = '';
    }
  }

  // Determine what to render inside
  const renderIcon = () => {
    if (categorySlug) {
      const catInfo = getCategoryIconInfo(categorySlug);
      // Parse iconSize to pixel number
      const sizeMatch = iconSize.match(/(\d+)/);
      const pixelSize = sizeMatch ? parseInt(sizeMatch[1]) * 4 : 24;
      return (
        <DynamicIcon
          categorySlug={categorySlug}
          size={pixelSize}
          color={catInfo?.color || 'currentColor'}
        />
      );
    }
    if (iconName) {
      const sizeMatch = iconSize.match(/(\d+)/);
      const pixelSize = sizeMatch ? parseInt(sizeMatch[1]) * 4 : 24;
      return <DynamicIcon name={iconName} size={pixelSize} />;
    }
    if (Icon) {
      return <Icon className={iconSize} />;
    }
    return null;
  };

  const categoryStyle = categorySlug ? (() => {
    const catInfo = getCategoryIconInfo(categorySlug);
    return {
      backgroundColor: `${catInfo.color}15`,
      borderColor: `${catInfo.color}30`,
      color: catInfo.color,
    };
  })() : {};

  return (
    <motion.div 
      whileHover={{ scale: 1.1, rotate: 5 }} 
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className={cn(
        "flex items-center justify-center rounded-xl border shadow-sm backdrop-blur-md cursor-pointer",
        !categorySlug && resolvedBgClass,
        !categorySlug && resolvedBorderClass,
        !categorySlug && resolvedColorClass,
        size,
        animated && "animate-pulse",
        className
      )}
      style={categorySlug ? categoryStyle : undefined}
    >
      {renderIcon()}
    </motion.div>
  );
}
