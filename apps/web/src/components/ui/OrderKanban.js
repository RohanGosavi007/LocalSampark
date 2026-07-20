import React from 'react';
import { motion } from 'framer-motion';

/**
 * A reusable Kanban Board component.
 * @param {Array} columns - Array of column objects { id, title, color }
 * @param {Array} items - Array of items { id, status, content }
 * @param {Function} onStatusChange - Callback when an item is moved
 * @param {Function} renderItem - Custom render function for the item card
 */
export default function OrderKanban({ columns, items, onStatusChange, renderItem }) {
  
  const handleDragStart = (e, itemId) => {
    e.dataTransfer.setData('itemId', itemId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, statusId) => {
    const itemId = e.dataTransfer.getData('itemId');
    if (itemId) {
      onStatusChange(itemId, statusId);
    }
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 w-full min-h-[60vh]">
      {columns.map(col => {
        const colItems = items.filter(item => item.status === col.id);
        
        return (
          <div 
            key={col.id}
            className="flex-shrink-0 w-80 bg-background-alt border border-border rounded-2xl flex flex-col"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.id)}
          >
            <div className={`p-4 border-b border-border rounded-t-2xl font-bold flex justify-between items-center`} style={{ backgroundColor: `${col.color}15`, color: col.color }}>
              <span>{col.title}</span>
              <span className="bg-background text-text-muted px-2 py-0.5 rounded-full text-xs">{colItems.length}</span>
            </div>
            
            <div className="flex-1 p-3 space-y-3 overflow-y-auto">
              {colItems.map(item => (
                <motion.div
                  key={item.id}
                  layoutId={item.id.toString()}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item.id)}
                  className="cursor-grab active:cursor-grabbing"
                >
                  {renderItem ? renderItem(item) : (
                    <div className="bg-background border border-border p-4 rounded-xl shadow-sm hover:shadow-md transition-all">
                      <p className="font-bold text-sm">#{item.id}</p>
                      <p className="text-xs text-text-muted mt-1">{item.content}</p>
                    </div>
                  )}
                </motion.div>
              ))}
              
              {colItems.length === 0 && (
                <div className="h-24 border-2 border-dashed border-border rounded-xl flex items-center justify-center text-text-muted text-sm">
                  Drop items here
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
