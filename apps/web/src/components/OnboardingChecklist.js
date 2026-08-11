import React, { useState } from 'react';
import { CheckCircle, Circle, ChevronRight, Store, CreditCard, Image as ImageIcon } from 'lucide-react';

export default function OnboardingChecklist() {
  const [isOpen, setIsOpen] = useState(true);

  const steps = [
    { id: 1, title: 'Upload Store Logo', icon: ImageIcon, completed: true },
    { id: 2, title: 'Add 5 Initial Products', icon: Store, completed: false },
    { id: 3, title: 'Connect Bank Account', icon: CreditCard, completed: false },
  ];

  const completedCount = steps.filter(s => s.completed).length;
  const progress = (completedCount / steps.length) * 100;

  if (completedCount === steps.length) return null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl mb-8">
      
      {/* Header */}
      <div 
        className="p-6 flex items-center justify-between cursor-pointer hover:bg-slate-800/50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div>
          <h2 className="text-xl font-bold text-white mb-2">Welcome to LocalSampark!</h2>
          <div className="flex items-center gap-4">
            <span className="text-sm font-bold text-slate-400">Setup Progress: {completedCount}/{steps.length}</span>
            <div className="w-48 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 rounded-full transition-all duration-1000 ease-out" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        </div>
        
        <div className={`w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`}>
          <ChevronRight size={20} />
        </div>
      </div>

      {/* Expanded Content */}
      {isOpen && (
        <div className="border-t border-slate-800 p-6 bg-slate-950/50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {steps.map(step => (
              <div 
                key={step.id} 
                className={`flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${
                  step.completed 
                    ? 'bg-green-500/10 border-green-500/30' 
                    : 'bg-slate-900 border-slate-700 hover:border-blue-500 hover:shadow-[0_0_15px_rgba(37,99,235,0.2)]'
                }`}
              >
                <div className={`mt-0.5 ${step.completed ? 'text-green-500' : 'text-slate-600'}`}>
                  {step.completed ? <CheckCircle size={24} /> : <Circle size={24} />}
                </div>
                <div>
                  <h3 className={`font-bold ${step.completed ? 'text-slate-300' : 'text-white'}`}>{step.title}</h3>
                  {!step.completed && (
                    <button className="mt-3 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg transition-colors">
                      Complete Step
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
