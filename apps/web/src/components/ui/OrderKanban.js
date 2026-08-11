import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
            className="flex-1 min-w-[300px] bg-background-alt/50 rounded-2xl p-4 border border-border"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.id)}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold flex items-center gap-2" style={{ color: col.color }}>
                {col.title} <span className="bg-background px-2 py-0.5 rounded-full text-xs border border-border">{colItems.length}</span>
              </h3>
            </div>
            
            <div className="space-y-3">
              <AnimatePresence>
                {colItems.map(item => (
                  <motion.div 
                    key={item.id} 
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="bg-background rounded-xl p-3 border border-border shadow-sm"
                  >
                    {renderItem ? renderItem(item) : (
                      <div>
                        <div className="flex justify-between">
                          <span className="font-bold">#{item.id.toString().slice(-4)}</span>
                          <span className="text-xs text-text-muted">{new Date(item.created_at).toLocaleTimeString()}</span>
                        </div>
                        <div className="mt-2 text-sm">{item.total_amount ? `₹${item.total_amount}` : ''}</div>
                      </div>
                    )}

                    {/* Actions for Status Change */}
                    <div className="flex gap-2 mt-3 pt-3 border-t border-border overflow-x-auto pb-1 custom-scrollbar">
                      {columns.filter(c => c.id !== col.id).map(c => (
                        <button
                          key={c.id}
                          onClick={() => onStatusChange(item.id, c.id)}
                          className="text-[10px] font-bold px-2 py-1 rounded border border-border bg-background hover:bg-background-alt transition-colors whitespace-nowrap"
                          style={{ color: c.color }}
                        >
                          Move to {c.title}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        );
      })}
    </div>
  );
}
