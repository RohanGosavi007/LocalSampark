'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { cn } from './Button';
import DynamicIcon, { getCategoryIconInfo } from '../DynamicIcon';

/**
 * GlassIcon — Spatial 3D Glassmorphism icon wrapper
 * Enhanced with glow ring, radial glass sphere effect, and 3D depth
 *
 * Usage:
 *   <GlassIcon icon={ShoppingCart} />
 *   <GlassIcon categorySlug="grocery-supermarkets" />
 *   <GlassIcon categorySlug="pharmacy-healthcare" animated />
 */
export function GlassIcon({ 
  icon: Icon,
  categorySlug,
  iconName,
  colorClass = "text-primary", 
  bgClass = "bg-primary/10", 
  borderClass = "border-primary/20",
  size = "w-14 h-14",
  iconSize = "w-7 h-7",
  animated = false,
  glowColor,
  className 
}) {
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

  const renderIcon = () => {
    if (categorySlug) {
      const catInfo = getCategoryIconInfo(categorySlug);
      const sizeMatch = iconSize.match(/(\d+)/);
      const pixelSize = sizeMatch ? parseInt(sizeMatch[1]) * 4 : 28;
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
      const pixelSize = sizeMatch ? parseInt(sizeMatch[1]) * 4 : 28;
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

  const glowStyle = glowColor || (categorySlug ? getCategoryIconInfo(categorySlug)?.color : null);

  return (
    <motion.div 
      whileHover={{ scale: 1.12, rotate: 5 }} 
      whileTap={{ scale: 0.92 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className={cn(
        "relative flex items-center justify-center rounded-2xl border shadow-sm backdrop-blur-md cursor-pointer glow-ring overflow-hidden",
        !categorySlug && resolvedBgClass,
        !categorySlug && resolvedBorderClass,
        !categorySlug && resolvedColorClass,
        size,
        animated && "animate-pulseGlow",
        className
      )}
      style={{
        ...(categorySlug ? categoryStyle : undefined),
        ...(glowStyle ? { '--glow-color': `${glowStyle}40` } : {}),
      }}
    >
      {/* Radial glass sphere overlay — creates 3D depth illusion */}
      <div 
        className="absolute inset-0 rounded-[inherit] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.20) 0%, transparent 60%)',
        }}
      />
      {/* Bottom shadow for depth */}
      <div 
        className="absolute bottom-0 left-[10%] right-[10%] h-[30%] rounded-[inherit] pointer-events-none"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.15), transparent)',
        }}
      />
      {/* Icon */}
      <div className="relative z-10">
        {renderIcon()}
      </div>
    </motion.div>
  );
}
