'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import StoryViewer from './StoryViewer';
import Link from 'next/link';

const MOCK_STORIES = [
  { id: 1, user: 'Your Story', avatar: 'https://ui-avatars.com/api/?name=User&background=0D8ABC&color=fff', hasStory: false, isUser: true },
  { id: 2, user: 'Society Admin', avatar: 'https://ui-avatars.com/api/?name=Admin&background=f59e0b&color=fff', hasStory: true, isUser: false, items: [{ id: 101, image: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800', userName: 'Society Admin', userAvatar: 'https://ui-avatars.com/api/?name=Admin&background=f59e0b&color=fff', time: '2h ago', text: 'Important Society Meeting Tomorrow at 10 AM in the Clubhouse.' }] },
  { id: 3, user: 'Glow Salon', avatar: 'https://ui-avatars.com/api/?name=Salon&background=ec4899&color=fff', hasStory: true, isUser: false, items: [{ id: 102, image: 'https://images.unsplash.com/photo-1521590832167-7bfcfaa6362f?w=800', userName: 'Glow Salon', userAvatar: 'https://ui-avatars.com/api/?name=Salon&background=ec4899&color=fff', time: '3h ago', text: 'Flat 20% OFF on all Spa Services this weekend!' }] },
  { id: 4, user: 'Pharmacy', avatar: 'https://ui-avatars.com/api/?name=Pharma&background=10b981&color=fff', hasStory: true, isUser: false, items: [{ id: 103, image: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800', userName: 'Pharmacy', userAvatar: 'https://ui-avatars.com/api/?name=Pharma&background=10b981&color=fff', time: '5h ago', text: 'New stock of Vitamin C supplements arrived.' }] },
  { id: 5, user: 'Neha P.', avatar: 'https://ui-avatars.com/api/?name=Neha&background=8b5cf6&color=fff', hasStory: false, isUser: false }
];

export default function StoriesRow() {
  const [viewerVisible, setViewerVisible] = useState(false);
  const [currentStories, setCurrentStories] = useState([]);

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
        {MOCK_STORIES.map((story) => (
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
