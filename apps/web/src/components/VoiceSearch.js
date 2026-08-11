import React, { useState, useEffect } from 'react';
import { Mic, X, Search, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function VoiceSearch({ onClose }) {
  const router = useRouter();
  const [status, setStatus] = useState('listening'); // listening, processing, done
  const [transcript, setTranscript] = useState('');

  // Simulating Voice Recognition Process
  useEffect(() => {
    let timeout1, timeout2, timeout3;
    
    if (status === 'listening') {
      timeout1 = setTimeout(() => {
        setTranscript('Mujhe 1 kilo aashirvaad atta...');
      }, 1500);
      
      timeout2 = setTimeout(() => {
        setTranscript('Mujhe 1 kilo aashirvaad atta chahiye');
        setStatus('processing');
      }, 3000);
    }
    
    if (status === 'processing') {
      timeout3 = setTimeout(() => {
        setStatus('done');
        // Route to search with the parsed intent
        router.push('/search?q=aashirvaad+atta');
        onClose();
      }, 2000);
    }

    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      clearTimeout(timeout3);
    };
  }, [status, router, onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-end md:justify-center bg-slate-950/90 backdrop-blur-md animate-fade-in pb-12 md:pb-0">
      
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 w-12 h-12 bg-slate-800/50 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
      >
        <X size={24} />
      </button>

      <div className="text-center w-full max-w-md px-6">
        
        {/* Pulsating Mic Icon */}
        <div className="relative w-32 h-32 mx-auto mb-12">
          {status === 'listening' && (
            <>
              <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-20"></div>
              <div className="absolute inset-2 bg-blue-500 rounded-full animate-pulse opacity-40"></div>
            </>
          )}
          <div className={`absolute inset-4 rounded-full flex items-center justify-center transition-colors shadow-2xl ${
            status === 'listening' ? 'bg-blue-600 text-white shadow-blue-500/50' : 
            status === 'processing' ? 'bg-orange-500 text-white shadow-orange-500/50' : 
            'bg-green-500 text-white shadow-green-500/50'
          }`}>
            {status === 'processing' ? <Loader2 size={40} className="animate-spin" /> : <Mic size={40} />}
          </div>
        </div>

        {/* Text Area */}
        <div className="h-24">
          <h2 className="text-2xl font-black text-white mb-2">
            {status === 'listening' ? 'Listening...' : status === 'processing' ? 'Finding products...' : 'Done!'}
          </h2>
          <p className="text-blue-400 font-medium text-lg min-h-[1.75rem] transition-all">
            {transcript || 'Speak now (e.g. "I want 1kg Atta")'}
          </p>
        </div>

        {/* Fake Equalizer (Visual only) */}
        {status === 'listening' && (
          <div className="flex items-center justify-center gap-1 mt-8 h-12">
            {[...Array(12)].map((_, i) => (
              <div 
                key={i} 
                className="w-1.5 bg-blue-500 rounded-full animate-pulse"
                style={{
                  height: `${Math.max(20, Math.random() * 100)}%`,
                  animationDelay: `${i * 0.1}s`,
                  animationDuration: `${0.5 + Math.random() * 0.5}s`
                }}
              ></div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
