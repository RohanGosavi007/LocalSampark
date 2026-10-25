'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import StoryViewer from './StoryViewer';
import Link from 'next/link';
import { API_URL, apiGet } from '@/lib/api';

const avatarFor = (name, url) => (url ? (url.startsWith('http') ? url : `${API_URL}${url}`) : `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=0D8ABC&color=fff`);
const absolute = (url) => (/^https?:/.test(url) ? url : `${API_URL}${url}`);
const ago = (iso) => {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  return mins < 60 ? `${mins}m ago` : `${Math.round(mins / 60)}h ago`;
};

export default function StoriesRow() {
  const [viewerVisible, setViewerVisible] = useState(false);
  const [currentStories, setCurrentStories] = useState([]);
  const [people, setPeople] = useState([{ id: 'me', user: 'Your Story', avatar: avatarFor('You'), hasStory: false, isUser: true }]);

  // Live stories (the last 24 hours), grouped by who posted them.
  useEffect(() => {
    let alive = true;
    apiGet('/stories').then((res) => {
      if (!alive) return;
      const byUser = new Map();
      for (const s of res.data || []) {
        if (!byUser.has(s.user_id)) byUser.set(s.user_id, { id: s.user_id, user: s.full_name || 'Neighbour', avatar: avatarFor(s.full_name, s.avatar_url), hasStory: true, isUser: false, items: [] });
        byUser.get(s.user_id).items.push({ image: absolute(s.media_url), text: s.caption, userName: s.full_name, userAvatar: avatarFor(s.full_name, s.avatar_url), time: ago(s.created_at) });
      }
      setPeople((prev) => [prev[0], ...byUser.values()]);
    }).catch(() => { /* not signed in or offline: just the "Your Story" tile */ });
    return () => { alive = false; };
  }, []);

  const handleStoryPress = (story) => {
    if (story.isUser && !story.hasStory) {
      // For Next.js, we can use a Link or just redirect. We'll use window.location here for simplicity,
      // but ideally this is handled by wrapping in a Link.
      window.location.href = '/story-create';
    } else if (story.hasStory && story.items) {
      setCurrentStories(story.items);
      setViewerVisible(true);
    }
  };

  return (
    <div className="mb-8 overflow-hidden">
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none px-1">
        {people.map((story) => (
          <div 
            key={story.id} 
            className="flex flex-col items-center gap-1.5 cursor-pointer shrink-0 w-20 group"
            onClick={() => handleStoryPress(story)}
          >
            <div className={`relative p-[3px] rounded-full transition-transform group-hover:scale-105 ${story.hasStory ? 'bg-gradient-to-tr from-yellow-400 to-pink-500' : 'bg-border'}`}>
              <div className="bg-background rounded-full p-[2px]">
                <img src={story.avatar} alt={story.user} className="w-14 h-14 rounded-full object-cover border border-border/50" />
              </div>
              {story.isUser && !story.hasStory && (
                <div className="absolute bottom-0 right-0 w-5 h-5 bg-primary border-2 border-background rounded-full flex items-center justify-center text-white">
                  <Plus className="w-3 h-3" />
                </div>
              )}
            </div>
            <span className="text-[11px] font-medium text-text-muted text-center w-full truncate px-1">
              {story.user}
            </span>
          </div>
        ))}
      </div>
      
      <StoryViewer 
        visible={viewerVisible} 
        stories={currentStories} 
        onClose={() => setViewerVisible(false)} 
      />
    </div>
  );
}
