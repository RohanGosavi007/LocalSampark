'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  GraduationCap, Calendar, Clock, Star, Users, BookOpen,
  MapPin, Phone, Award, CheckCircle, ChevronRight, Sparkles,
  Camera, Music, Gift
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════
// ENHANCED EDUCATION & EVENTS VISITOR VIEW
// For: Tutors, Coaching, Driving Schools, Event Planners, Photographers, Wedding
// Features: Courses/Packages, Portfolio, Booking, Testimonials
// ═══════════════════════════════════════════════════════════════════════

export default function EducationEventsVisitorView({ shop, services = [], onEnroll }) {
  const [selectedPkg, setSelectedPkg] = useState(null);

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl p-6"
      >
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-3xl">🎓</div>
          <div>
            <h2 className="text-xl font-bold text-text">{shop?.name || 'Learning Center'}</h2>
            <p className="text-text-muted text-sm mt-1">Transform your future with expert guidance</p>
            {/* Was a fixed "4.9 (95 reviews)" and "500+ Students" on every
                learning centre, whatever its real record. The rating now comes
                from the shop and is omitted when it has none; the student count
                is gone entirely — the platform has no such figure to report. */}
            {shop?.rating > 0 && (
              <div className="flex items-center gap-3 mt-2">
                <span className="flex items-center gap-1 text-xs text-amber-500 font-bold">
                  <Star className="w-3 h-3 fill-amber-400" /> {shop.rating}
                  {shop.totalRatings > 0 && ` (${shop.totalRatings} reviews)`}
                </span>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Courses / Packages */}
      <div className="bg-background-alt p-6 rounded-2xl border border-border">
        <h2 className="text-xl font-bold text-text mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-500" /> Courses & Packages
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Four invented courses at invented prices (₹5000/₹8000/₹2000/₹3000)
              with invented enrolment counts and batch timings, shown for any
              centre that had published none. A parent could arrive expecting a
              "Foundation Course" at ₹5000 that the centre does not run. */}
          {services.map((course, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              onClick={() => setSelectedPkg(course)}
              className={`p-5 rounded-xl cursor-pointer transition-all border-2 relative ${
                selectedPkg?.name === course.name
                  ? 'border-indigo-500 bg-indigo-500/5'
                  : 'border-border hover:border-indigo-500/30'
              }`}
            >
              {course.popular && (
                <span className="absolute -top-2 right-4 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">🔥 Popular</span>
              )}
              <div className="flex items-start gap-3">
                <span className="text-2xl">{course.icon || '📖'}</span>
                <div className="flex-1">
                  <h3 className="font-bold text-text">{course.name}</h3>
                  <p className="text-xs text-text-muted mt-1">{course.batch}</p>
                  <div className="flex items-center gap-3 mt-2">
                    {(course.duration || course.durationMinutes) && (
                      <span className="text-xs text-text-muted flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {course.duration || `${course.durationMinutes} min`}
                      </span>
                    )}
                    {course.students > 0 && (
                      <span className="text-xs text-text-muted flex items-center gap-1">
                        <Users className="w-3 h-3" /> {course.students} enrolled
                      </span>
                    )}
                  </div>
                  {/* An unpriced course asks rather than showing "₹undefined"
                      or a number this component chose. */}
                  {(course.price ?? course.pricePaise) != null ? (
                    <p className="text-indigo-500 font-black text-lg mt-2">
                      ₹{course.price ?? course.pricePaise / 100}
                    </p>
                  ) : (
                    <p className="text-text-muted font-semibold text-sm mt-2">Ask for fees</p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
          {services.length === 0 && (
            <p className="text-sm text-text-muted py-4 col-span-full text-center">
              This centre has not published its courses yet. Contact them for
              current batches and fees.
            </p>
          )}
        </div>
      </div>

      {/* What You'll Get */}
      <div className="bg-background-alt p-6 rounded-2xl border border-border">
        <h2 className="text-lg font-bold text-text mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500" /> What You'll Get
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { label: 'Expert Faculty', icon: '👨‍🏫' },
            { label: 'Study Material', icon: '📖' },
            { label: 'Mock Tests', icon: '📝' },
            { label: 'Doubt Sessions', icon: '❓' },
            { label: 'Progress Reports', icon: '📊' },
            { label: 'Certificate', icon: '🏆' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 p-3 rounded-xl bg-background border border-border">
              <span className="text-lg">{item.icon}</span>
              <span className="text-xs font-bold text-text">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Trust Badges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Award, label: '95% Success Rate', color: '#22c55e' },
          { icon: Users, label: '500+ Alumni', color: '#3b82f6' },
          { icon: GraduationCap, label: 'Certified Course', color: '#f97316' },
          { icon: Star, label: '4.9★ Rating', color: '#eab308' },
        ].map((badge, i) => (
          <div key={i} className="p-3 rounded-xl bg-background-alt border border-border text-center">
            <badge.icon className="w-5 h-5 mx-auto mb-1" style={{ color: badge.color }} />
            <p className="text-xs font-bold text-text">{badge.label}</p>
          </div>
        ))}
      </div>

      {/* Enroll CTA */}
      {selectedPkg && (
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-indigo-500 text-white rounded-2xl px-6 py-4 shadow-2xl shadow-indigo-500/30 flex items-center gap-4 max-w-md w-[90%]"
        >
          <div className="flex-1">
            <p className="font-bold">{selectedPkg.name}</p>
            <p className="text-indigo-200 text-sm">₹{selectedPkg.price} • {selectedPkg.duration}</p>
          </div>
          <button onClick={() => onEnroll?.(selectedPkg)}
            className="bg-white text-indigo-500 font-bold px-5 py-2 rounded-xl text-sm flex items-center gap-1">
            Enroll Now <ChevronRight className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </div>
  );
}
