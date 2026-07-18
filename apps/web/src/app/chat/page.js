'use client';
import React, { useState, useEffect, useRef } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Send, Search, Phone, Video, MoreVertical, ArrowLeft, MessageCircle, Store, User, Clock } from 'lucide-react';

import { API_URL } from '@/lib/api';

export default function ChatPage() {
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : '';
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    // Fetch conversations
    fetch(`${API_URL}/api/v1/chat/conversations`, { headers })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setConversations(data);
        } else {
          // Demo conversations
          setConversations([
            { id: 1, name: 'FreshMart Store', lastMessage: 'Your order is ready for pickup!', time: '10:30 AM', unread: 2, type: 'shop', avatar: '🏪' },
            { id: 2, name: 'Delivery Agent - Raj', lastMessage: 'On my way, 5 mins away', time: '9:45 AM', unread: 0, type: 'delivery', avatar: '🚴' },
            { id: 3, name: 'LocalSampark Support', lastMessage: 'How can we help you?', time: 'Yesterday', unread: 1, type: 'support', avatar: '💬' },
            { id: 4, name: 'Glow Salon', lastMessage: 'Your appointment is confirmed for tomorrow', time: 'Yesterday', unread: 0, type: 'shop', avatar: '✂️' },
          ]);
        }
      })
      .catch(() => {
        setConversations([
          { id: 1, name: 'FreshMart Store', lastMessage: 'Your order is ready for pickup!', time: '10:30 AM', unread: 2, type: 'shop', avatar: '🏪' },
          { id: 2, name: 'Delivery Agent - Raj', lastMessage: 'On my way, 5 mins away', time: '9:45 AM', unread: 0, type: 'delivery', avatar: '🚴' },
          { id: 3, name: 'LocalSampark Support', lastMessage: 'How can we help you?', time: 'Yesterday', unread: 1, type: 'support', avatar: '💬' },
        ]);
      })
      .finally(() => setLoading(false));

    // Socket.io connection
    try {
      const { io } = require('socket.io-client');
      const socketUrl = API_URL.replace('/api/v1', '');
      socketRef.current = io(socketUrl, { auth: { token }, transports: ['websocket', 'polling'] });
      
      socketRef.current.on('new_message', (msg) => {
        setMessages(prev => [...prev, msg]);
      });

      return () => { if (socketRef.current) socketRef.current.disconnect(); };
    } catch (e) {
      // Socket.io not available, handled silently
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const openChat = (conv) => {
    setActiveChat(conv);
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : '';
    
    // Fetch messages for this conversation
    fetch(`${API_URL}/api/v1/chat/messages/${conv.id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length) {
          setMessages(data);
        } else {
          setMessages([
            { id: 1, text: `Hi! Welcome to ${conv.name}`, sender: 'other', time: '10:00 AM' },
            { id: 2, text: conv.lastMessage, sender: 'other', time: conv.time },
          ]);
        }
      })
      .catch(() => {
        setMessages([
          { id: 1, text: `Hi! Welcome to ${conv.name}`, sender: 'other', time: '10:00 AM' },
          { id: 2, text: conv.lastMessage, sender: 'other', time: conv.time },
        ]);
      });
  };

  const sendMessage = () => {
    if (!newMessage.trim()) return;
    const msg = { id: Date.now(), text: newMessage, sender: 'me', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setMessages(prev => [...prev, msg]);
    
    if (socketRef.current) {
      socketRef.current.emit('send_message', { conversationId: activeChat?.id, message: newMessage });
    }
    setNewMessage('');
  };

  const filtered = conversations.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="min-h-screen bg-section-alt flex flex-col font-sans">
      <Header />
      <main className="flex-1 py-6">
        <div className="container max-w-6xl">
          <div className="glass-card rounded-2xl border border-border bg-background overflow-hidden" style={{ height: 'calc(100vh - 200px)', display: 'flex' }}>
            
            {/* Sidebar - Conversations */}
            <div className={`w-full sm:w-96 border-r border-border flex flex-col ${activeChat ? 'hidden sm:flex' : 'flex'}`}>
              <div className="p-4 border-b border-border">
                <h2 className="text-xl font-black mb-3 flex items-center gap-2"><MessageCircle className="w-5 h-5 text-primary" /> Messages</h2>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input type="text" placeholder="Search conversations..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-section-alt text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {filtered.map(conv => (
                  <button key={conv.id} onClick={() => openChat(conv)}
                    className={`w-full flex items-center gap-3 p-4 hover:bg-section-alt transition-colors text-left border-b border-border/50 ${activeChat?.id === conv.id ? 'bg-primary/5' : ''}`}>
                    <div className="w-12 h-12 rounded-full bg-section-alt flex items-center justify-center text-xl border border-border shrink-0">{conv.avatar}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-sm truncate">{conv.name}</span>
                        <span className="text-xs text-text-muted shrink-0 ml-2">{conv.time}</span>
                      </div>
                      <p className="text-xs text-text-muted truncate mt-0.5">{conv.lastMessage}</p>
                    </div>
                    {conv.unread > 0 && (
                      <div className="w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">{conv.unread}</div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Area */}
            <div className={`flex-1 flex flex-col ${!activeChat ? 'hidden sm:flex' : 'flex'}`}>
              {activeChat ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button onClick={() => setActiveChat(null)} className="sm:hidden"><ArrowLeft className="w-5 h-5" /></button>
                      <div className="w-10 h-10 rounded-full bg-section-alt flex items-center justify-center text-lg border border-border">{activeChat.avatar}</div>
                      <div>
                        <h3 className="font-bold text-sm">{activeChat.name}</h3>
                        <p className="text-xs text-emerald-500">Online</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="w-9 h-9 rounded-full hover:bg-section-alt flex items-center justify-center"><Phone className="w-4 h-4 text-text-muted" /></button>
                      <button className="w-9 h-9 rounded-full hover:bg-section-alt flex items-center justify-center"><Video className="w-4 h-4 text-text-muted" /></button>
                    </div>
                  </div>
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messages.map(msg => (
                      <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm ${msg.sender === 'me' ? 'bg-primary text-white rounded-br-md' : 'bg-section-alt text-text border border-border rounded-bl-md'}`}>
                          <p>{msg.text}</p>
                          <p className={`text-xs mt-1 ${msg.sender === 'me' ? 'text-white/60' : 'text-text-muted'}`}>{msg.time}</p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                  {/* Input */}
                  <div className="p-4 border-t border-border">
                    <div className="flex gap-2">
                      <input type="text" placeholder="Type a message..." value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && sendMessage()}
                        className="flex-1 px-4 py-3 rounded-xl border border-border bg-section-alt text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                      <button onClick={sendMessage} className="w-12 h-12 bg-primary text-white rounded-xl flex items-center justify-center hover:opacity-90 transition-opacity">
                        <Send className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-center p-8">
                  <div>
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                      <MessageCircle className="w-10 h-10 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Your Messages</h3>
                    <p className="text-text-muted text-sm">Select a conversation to start chatting with shops, delivery agents, or support.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
