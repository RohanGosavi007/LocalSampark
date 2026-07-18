'use client';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle, Send, X, Image, Paperclip, Phone,
  ChevronDown, Smile, Clock, CheckCheck
} from 'lucide-react';

import { API_BASE } from '@/lib/api';

// ═══════════════════════════════════════════════════════════════════════
// CHAT WITH SHOP OWNER — Visitor side
// WhatsApp-style chat widget (floating + full panel modes)
// ═══════════════════════════════════════════════════════════════════════

export default function ShopChat({ shopId, shopName, shopLogo, mode = 'floating' }) {
  const [isOpen, setIsOpen] = useState(mode === 'panel');
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      fetchMessages();
      setUnread(0);
      // Poll for new messages every 5 seconds
      const interval = setInterval(fetchMessages, 5000);
      return () => clearInterval(interval);
    }
  }, [isOpen, shopId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function fetchMessages() {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch(`${API_BASE}/shops/${shopId}/chat`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      // Silent fail
    }
  }

  async function sendMessage(e) {
    e?.preventDefault();
    if (!newMessage.trim() || sending) return;
    setSending(true);

    // Optimistic update
    const optimistic = {
      id: Date.now(),
      message: newMessage,
      sender: 'visitor',
      created_at: new Date().toISOString(),
      status: 'sending',
    };
    setMessages(prev => [...prev, optimistic]);
    const msgText = newMessage;
    setNewMessage('');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/shops/${shopId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: msgText }),
      });
      if (res.ok) {
        fetchMessages();
      }
    } catch (err) {
      console.error('Chat send failed:', err);
    } finally {
      setSending(false);
    }
  }

  function formatTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  // Quick reply suggestions
  const quickReplies = [
    'Is this available?',
    'What are your timings?',
    'Do you deliver?',
    'Price check',
  ];

  // Floating Button
  if (mode === 'floating' && !isOpen) {
    return (
      <motion.button
        initial={{ scale: 0 }} animate={{ scale: 1 }}
        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-green-500 text-white shadow-2xl shadow-green-500/30 flex items-center justify-center"
      >
        <MessageCircle className="w-6 h-6" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
            {unread}
          </span>
        )}
      </motion.button>
    );
  }

  const chatContent = (
    <div className={`flex flex-col ${mode === 'floating' ? 'h-[480px]' : 'h-full min-h-[400px]'}`}>
      {/* Chat Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border bg-green-500/5 shrink-0">
        <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-lg">
          {shopLogo ? <img src={shopLogo} className="w-full h-full rounded-full object-cover" /> : '🏪'}
        </div>
        <div className="flex-1">
          <p className="font-bold text-text text-sm">{shopName || 'Shop'}</p>
          <p className="text-xs text-green-500 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Usually replies within 5 min
          </p>
        </div>
        {mode === 'floating' && (
          <button onClick={() => setIsOpen(false)} className="p-2 rounded-lg hover:bg-border/30">
            <X className="w-4 h-4 text-text-muted" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ background: 'var(--background-alt, #f8f9fa)' }}>
        {/* Welcome message */}
        {messages.length === 0 && (
          <div className="text-center py-8">
            <span className="text-4xl">👋</span>
            <p className="text-text font-bold mt-2">Start a conversation</p>
            <p className="text-text-muted text-sm mt-1">Ask about products, services, or availability</p>
          </div>
        )}

        {messages.map((msg, i) => {
          const isVisitor = msg.sender === 'visitor';
          return (
            <motion.div
              key={msg.id || i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${isVisitor ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl ${
                isVisitor
                  ? 'bg-green-500 text-white rounded-br-md'
                  : 'bg-background border border-border text-text rounded-bl-md'
              }`}>
                <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                <div className={`flex items-center gap-1 mt-1 ${isVisitor ? 'justify-end' : ''}`}>
                  <span className={`text-[10px] ${isVisitor ? 'text-green-200' : 'text-text-muted'}`}>
                    {formatTime(msg.created_at)}
                  </span>
                  {isVisitor && msg.status !== 'sending' && (
                    <CheckCheck className="w-3 h-3 text-green-200" />
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Replies */}
      {messages.length === 0 && (
        <div className="px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar shrink-0 border-t border-border">
          {quickReplies.map((qr, i) => (
            <button key={i} onClick={() => { setNewMessage(qr); inputRef.current?.focus(); }}
              className="px-3 py-1.5 rounded-full bg-green-500/10 text-green-600 text-xs font-bold whitespace-nowrap border border-green-500/20 hover:bg-green-500/20 transition-colors">
              {qr}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={sendMessage} className="p-3 border-t border-border flex items-center gap-2 shrink-0">
        <input
          ref={inputRef}
          type="text"
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-text text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <button type="submit" disabled={!newMessage.trim() || sending}
          className="w-10 h-10 rounded-xl bg-green-500 text-white flex items-center justify-center disabled:opacity-50 hover:bg-green-600 transition-colors shrink-0">
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );

  // Floating Window
  if (mode === 'floating') {
    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-48px)] bg-background rounded-2xl border border-border shadow-2xl overflow-hidden"
          >
            {chatContent}
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // Panel mode (embedded in page)
  return (
    <div className="bg-background-alt rounded-2xl border border-border overflow-hidden">
      {chatContent}
    </div>
  );
}
