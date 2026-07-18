'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  GraduationCap, Calendar, Users, Clock, Star, BookOpen,
  ClipboardCheck, BarChart3, Settings, Plus, CheckCircle,
  FileText, Award, Bell, Video
} from 'lucide-react';
import AppointmentManagementPanel from './shared/AppointmentManagementPanel';

import { API_BASE } from '@/lib/api';

// ═══════════════════════════════════════════════════════════════════════
// EDUCATION & COACHING MANAGER
// For: Tutors, Coaching Institutes, Test Prep, Driving Schools
// Features: Courses, Attendance, Batch Scheduling, Student Directory
// ═══════════════════════════════════════════════════════════════════════

const SECTION_TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'courses', label: 'Courses / Batches', icon: BookOpen },
  { id: 'schedule', label: 'Class Schedule', icon: Calendar },
  { id: 'students', label: 'Students', icon: Users },
  { id: 'attendance', label: 'Attendance', icon: ClipboardCheck },
  { id: 'results', label: 'Tests & Results', icon: Award },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function EducationCoachingManager({ token, shopId, shop }) {
  const [activeSection, setActiveSection] = useState('dashboard');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{
        display: 'flex', gap: '6px', overflowX: 'auto', padding: '6px',
        background: 'rgba(255,255,255,0.04)', borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.08)',
      }}>
        {SECTION_TABS.map(tab => {
          const isActive = activeSection === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveSection(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 18px', borderRadius: '12px', border: 'none',
                cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '13px', fontWeight: 600,
                background: isActive ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent',
                color: isActive ? '#fff' : '#94a3b8', transition: 'all 0.2s',
              }}>
              <tab.icon size={16} /> {tab.label}
            </button>
          );
        })}
      </div>

      {activeSection === 'dashboard' && <EducationDashboard />}
      {activeSection === 'courses' && <CourseManager token={token} />}
      {activeSection === 'schedule' && <ClassSchedule token={token} />}
      {activeSection === 'students' && <StudentDirectory token={token} />}
      {activeSection === 'attendance' && <AttendanceTracker token={token} />}
      {activeSection === 'results' && <TestResults token={token} />}
      {activeSection === 'settings' && <Placeholder title="Institute Settings" icon="⚙️" desc="Academic calendar, fee structure, batch timings, SMS/WhatsApp notifications" />}
    </div>
  );
}

function EducationDashboard() {
  const stats = [
    { label: 'Total Students', value: '—', icon: Users, color: '#6366f1' },
    { label: 'Active Batches', value: '—', icon: BookOpen, color: '#22c55e' },
    { label: 'Classes Today', value: '—', icon: Calendar, color: '#3b82f6' },
    { label: 'Fee Pending', value: '₹—', icon: Bell, color: '#f59e0b', pulse: true },
    { label: 'Avg Attendance', value: '—%', icon: ClipboardCheck, color: '#8b5cf6' },
    { label: 'Avg Rating', value: '⭐ —', icon: Star, color: '#eab308' },
  ];
  return (
    <div>
      <h2 style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: 800, marginBottom: '16px' }}>🎓 Institute Dashboard</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
        {stats.map((card, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            style={{ padding: '18px', borderRadius: '16px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${card.color}25`, position: 'relative' }}>
            {card.pulse && <div style={{ position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: '50%', background: card.color, animation: 'pulse 1.5s infinite' }} />}
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${card.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
              <card.icon size={18} color={card.color} />
            </div>
            <p style={{ color: '#64748b', fontSize: '11px', fontWeight: 600, margin: 0, textTransform: 'uppercase' }}>{card.label}</p>
            <p style={{ color: '#e2e8f0', fontSize: '22px', fontWeight: 800, margin: '4px 0 0' }}>{card.value}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function CourseManager({ token }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: 800, margin: 0 }}>📚 Courses / Batches</h2>
        <button style={{
          display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', borderRadius: '12px', border: 'none',
          background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
        }}>
          <Plus size={14} /> Add Course
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
        {[
          { name: 'Class 10 Maths', batch: 'Morning Batch (7-9 AM)', students: 25, duration: '6 months', fee: 3000, color: '#6366f1', status: 'Active' },
          { name: 'Class 12 Physics', batch: 'Evening Batch (5-7 PM)', students: 18, duration: '8 months', fee: 4000, color: '#22c55e', status: 'Active' },
          { name: 'JEE Crash Course', batch: 'Weekend (Sat-Sun)', students: 30, duration: '3 months', fee: 8000, color: '#f97316', status: 'Upcoming' },
          { name: 'NEET Biology', batch: 'Full Day (9-5)', students: 22, duration: '12 months', fee: 15000, color: '#ef4444', status: 'Active' },
        ].map((course, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            style={{
              padding: '20px', borderRadius: '16px', background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${course.color}30`, cursor: 'pointer',
            }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${course.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BookOpen size={20} color={course.color} />
              </div>
              <span style={{
                padding: '3px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 700,
                background: course.status === 'Active' ? '#22c55e20' : '#f59e0b20',
                color: course.status === 'Active' ? '#22c55e' : '#f59e0b',
              }}>{course.status}</span>
            </div>
            <h3 style={{ color: '#e2e8f0', fontSize: '16px', fontWeight: 800, margin: '0 0 4px' }}>{course.name}</h3>
            <p style={{ color: '#94a3b8', fontSize: '12px', margin: '0 0 12px' }}>{course.batch}</p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#64748b' }}>
                <Users size={12} /> {course.students} students
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#64748b' }}>
                <Clock size={12} /> {course.duration}
              </span>
              <span style={{ fontSize: '14px', fontWeight: 800, color: course.color }}>₹{course.fee}/mo</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function ClassSchedule({ token }) {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const slots = [
    { time: '7:00 - 9:00 AM', subject: 'Class 10 Maths', room: 'Room A' },
    { time: '9:30 - 11:30 AM', subject: 'NEET Biology', room: 'Room B' },
    { time: '2:00 - 4:00 PM', subject: 'JEE Physics', room: 'Lab 1' },
    { time: '5:00 - 7:00 PM', subject: 'Class 12 Physics', room: 'Room A' },
  ];

  return (
    <div>
      <h2 style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: 800, marginBottom: '16px' }}>📅 Today's Schedule</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {slots.map((slot, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
            style={{
              display: 'flex', alignItems: 'center', gap: '16px', padding: '16px',
              borderRadius: '14px', background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
            <div style={{
              padding: '8px 14px', borderRadius: '10px', background: '#6366f120',
              color: '#6366f1', fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap',
            }}>
              {slot.time}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: 700, margin: 0 }}>{slot.subject}</p>
              <p style={{ color: '#64748b', fontSize: '12px', margin: '2px 0 0' }}>{slot.room}</p>
            </div>
            <button style={{
              padding: '6px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
              background: 'transparent', color: '#94a3b8', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
            }}>
              Mark Attendance
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function StudentDirectory({ token }) {
  return (
    <div style={{
      padding: '60px 20px', textAlign: 'center', borderRadius: '16px',
      background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)',
    }}>
      <Users size={48} style={{ color: '#475569', marginBottom: '12px' }} />
      <h3 style={{ color: '#e2e8f0', fontSize: '18px', fontWeight: 700, margin: '0 0 8px' }}>Student Directory</h3>
      <p style={{ color: '#64748b', fontSize: '14px', maxWidth: '400px', margin: '0 auto' }}>
        Manage student profiles, fee payments, batch assignments, and performance history
      </p>
    </div>
  );
}

function AttendanceTracker({ token }) {
  return (
    <div>
      <h2 style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: 800, marginBottom: '16px' }}>✅ Attendance Tracker</h2>
      <div style={{
        padding: '24px', borderRadius: '16px', background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <p style={{ color: '#94a3b8', fontSize: '13px', fontWeight: 600, margin: '0 0 4px' }}>Today's Attendance</p>
            <p style={{ color: '#e2e8f0', fontSize: '18px', fontWeight: 800, margin: 0 }}>Class 10 Maths — Morning Batch</p>
          </div>
          <span style={{ padding: '4px 12px', borderRadius: '8px', background: '#22c55e20', color: '#22c55e', fontSize: '13px', fontWeight: 700 }}>
            0/25 Present
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px' }}>
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px',
              borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.03)', cursor: 'pointer',
            }}>
              <div style={{
                width: '20px', height: '20px', borderRadius: '6px', border: '2px solid rgba(255,255,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }} />
              <span style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 600 }}>Student {i + 1}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TestResults({ token }) {
  return (
    <div style={{
      padding: '60px 20px', textAlign: 'center', borderRadius: '16px',
      background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)',
    }}>
      <Award size={48} style={{ color: '#475569', marginBottom: '12px' }} />
      <h3 style={{ color: '#e2e8f0', fontSize: '18px', fontWeight: 700, margin: '0 0 8px' }}>Tests & Results</h3>
      <p style={{ color: '#64748b', fontSize: '14px', maxWidth: '400px', margin: '0 auto' }}>
        Create tests, upload marks, generate report cards, and share with parents
      </p>
    </div>
  );
}

function Placeholder({ title, icon, desc }) {
  return (
    <div style={{
      padding: '60px 20px', textAlign: 'center', borderRadius: '16px',
      background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)',
    }}>
      <span style={{ fontSize: '48px' }}>{icon}</span>
      <h3 style={{ color: '#e2e8f0', fontSize: '18px', fontWeight: 700, margin: '12px 0 4px' }}>{title}</h3>
      <p style={{ color: '#64748b', fontSize: '14px', maxWidth: '400px', margin: '0 auto' }}>{desc}</p>
    </div>
  );
}
