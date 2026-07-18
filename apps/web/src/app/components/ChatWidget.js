'use client';
import React, { useState } from 'react';
import { ChatCircleDots, X, PaperPlaneRight } from '@phosphor-icons/react';

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999 }}>
      {isOpen ? (
        <div style={{
          width: '320px', height: '450px', background: '#fff', borderRadius: '1rem',
          boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', display: 'flex', flexDirection: 'column',
          border: '1px solid #e2e8f0', overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{ background: '#4f46e5', padding: '1rem', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 600 }}>LocalSampark Support</div>
            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
              <X size={20} weight="bold" />
            </button>
          </div>
          
          {/* Messages */}
          <div style={{ flex: 1, padding: '1rem', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto' }}>
            <div style={{ background: '#e0e7ff', color: '#3730a3', padding: '0.75rem', borderRadius: '0.5rem 0.5rem 0.5rem 0', alignSelf: 'flex-start', maxWidth: '80%', fontSize: '0.85rem' }}>
              Hi there! 👋 How can we help you today?
            </div>
          </div>

          {/* Input */}
          <div style={{ padding: '0.75rem', borderTop: '1px solid #e2e8f0', background: '#fff', display: 'flex', gap: '0.5rem' }}>
            <input 
              type="text" 
              placeholder="Type your message..." 
              style={{ flex: 1, padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
              disabled
            />
            <button disabled style={{ background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '0.5rem', padding: '0.5rem', cursor: 'not-allowed', opacity: 0.7 }}>
              <PaperPlaneRight size={18} weight="fill" />
            </button>
          </div>
        </div>
      ) : (
        <button 
          onClick={() => setIsOpen(true)}
          style={{
            background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '50%',
            width: '60px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
            transition: 'transform 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <ChatCircleDots size={32} weight="fill" />
        </button>
      )}
    </div>
  );
}
