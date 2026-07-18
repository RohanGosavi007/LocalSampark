'use client';
import React, { useState } from 'react';
import Header from '../../components/Header';
import { useRouter } from 'next/navigation';

export default function ServiceBookingWeb({ params }) {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1: Services, 2: Staff/Time, 3: Confirmation
  
  // State
  const [selectedServices, setSelectedServices] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState('any');
  const [selectedDate, setSelectedDate] = useState('today');
  const [selectedTime, setSelectedTime] = useState(null);
  
  // Data
  const shop = {
    name: 'Glow & Glamour Salon', category: 'Salon & Spa', rating: 4.9, reviews: 342,
    image: 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?q=80&w=1200&auto=format&fit=crop'
  };

  const services = [
    { id: 's1', name: 'Premium Haircut', price: 450, duration: 45, desc: 'Includes hair wash and blow dry' },
    { id: 's2', name: 'Beard Trim & Styling', price: 200, duration: 20, desc: 'Precision beard shaping' },
    { id: 's3', name: 'Classic Facial', price: 800, duration: 60, desc: 'Deep cleansing and glowing mask' },
    { id: 's4', name: 'Head Massage', price: 300, duration: 30, desc: 'Relaxing hot oil massage' },
  ];

  const staffList = [
    { id: 'any', name: 'Any Available', role: 'Fastest booking' },
    { id: 'st1', name: 'Meera', role: 'Senior Stylist' },
    { id: 'st2', name: 'Rohan', role: 'Barber' },
    { id: 'st3', name: 'Sneha', role: 'Skin Expert' },
  ];

  const timeSlots = [
    { time: '10:00 AM', active: false }, { time: '11:00 AM', active: true },
    { time: '12:00 PM', active: true }, { time: '01:00 PM', active: false },
    { time: '02:00 PM', active: true }, { time: '03:00 PM', active: true },
  ];

  // Helpers
  const toggleService = (s) => {
    if (selectedServices.find(x => x.id === s.id)) {
      setSelectedServices(selectedServices.filter(x => x.id !== s.id));
    } else {
      setSelectedServices([...selectedServices, s]);
    }
  };

  const totalAmount = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration, 0);

  // Renderers
  const renderStep1 = () => (
    <div className="grid grid-cols-2 gap-6">
      {services.map(s => {
        const isSelected = selectedServices.find(x => x.id === s.id);
        return (
          <div 
            key={s.id} 
            onClick={() => toggleService(s)}
            className={`p-6 rounded-xl border-2 cursor-pointer transition-colors flex justify-between items-center ${isSelected ? 'bg-blue-900/20 border-blue-500' : 'bg-slate-900 border-slate-800 hover:border-slate-600'}`}
          >
            <div>
              <h3 className="text-lg font-bold text-white">{s.name}</h3>
              <p className="text-slate-400 text-sm mt-1">{s.desc}</p>
              <div className="flex items-center space-x-4 mt-3">
                <span className="text-green-400 font-bold">₹{s.price}</span>
                <span className="text-slate-500 text-sm">⏱️ {s.duration} mins</span>
              </div>
            </div>
            <div className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center ${isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-600 text-transparent'}`}>
              ✓
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-12">
      {/* Staff */}
      <div>
        <h3 className="text-xl font-bold text-white mb-6">Choose Professional</h3>
        <div className="grid grid-cols-4 gap-4">
          {staffList.map(st => (
            <div 
              key={st.id} 
              onClick={() => setSelectedStaff(st.id)}
              className={`p-4 rounded-xl border-2 text-center cursor-pointer transition-colors ${selectedStaff === st.id ? 'bg-blue-900/20 border-blue-500' : 'bg-slate-900 border-slate-800 hover:border-slate-600'}`}
            >
              <div className="w-16 h-16 bg-slate-800 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl">👤</div>
              <div className="font-bold text-white">{st.name}</div>
              <div className="text-xs text-slate-400">{st.role}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Date & Time */}
      <div>
        <h3 className="text-xl font-bold text-white mb-6">Select Date & Time</h3>
        <div className="flex space-x-4 mb-6">
          {['today', 'tomorrow', 'wednesday'].map(d => (
            <button 
              key={d} 
              onClick={() => { setSelectedDate(d); setSelectedTime(null); }}
              className={`px-6 py-3 rounded-lg border-2 font-medium capitalize ${selectedDate === d ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'}`}
            >
              {d}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-4">
          {timeSlots.map(slot => (
            <button 
              key={slot.time}
              disabled={!slot.active}
              onClick={() => setSelectedTime(slot.time)}
              className={`py-3 rounded-lg border-2 font-medium transition-colors ${!slot.active ? 'bg-slate-950 border-slate-900 text-slate-700 cursor-not-allowed' : selectedTime === slot.time ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-blue-400'}`}
            >
              {slot.time} {!slot.active && '(Booked)'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-4">✓</div>
        <h2 className="text-3xl font-bold text-white">Booking Confirmed!</h2>
        <p className="text-slate-400 mt-2">Your appointment has been secured.</p>
      </div>

      <div className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden">
        <div className="bg-slate-800 p-6 text-center">
          <h3 className="text-xl font-bold text-white">{shop.name}</h3>
          <p className="text-slate-400 text-sm">Booking ID: APT-7281</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex justify-between border-b border-slate-800 pb-4">
            <span className="text-slate-400">Date & Time</span>
            <span className="text-white font-bold capitalize">{selectedDate}, {selectedTime}</span>
          </div>
          <div className="flex justify-between border-b border-slate-800 pb-4">
            <span className="text-slate-400">Professional</span>
            <span className="text-white font-bold">{staffList.find(s => s.id === selectedStaff)?.name}</span>
          </div>
          <div className="flex justify-between border-b border-slate-800 pb-4">
            <span className="text-slate-400">Services</span>
            <span className="text-white font-bold text-right">{selectedServices.map(s => s.name).join(', ')}</span>
          </div>
          <div className="flex justify-between pt-2">
            <span className="text-slate-400">Total Amount</span>
            <span className="text-green-400 font-bold text-xl">₹{totalAmount}</span>
          </div>
        </div>
        <div className="bg-slate-950 p-6 text-center border-t border-slate-800">
          <p className="text-sm text-slate-500 mb-4">Show this QR code at the counter</p>
          <div className="w-40 h-40 bg-white rounded-lg mx-auto flex items-center justify-center text-6xl">📱</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 pb-24">
      <Header />
      
      {/* Banner */}
      <div className="relative h-64 w-full">
        <img src={shop.image} alt="Shop Banner" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/50"></div>
        <div className="absolute bottom-0 left-0 p-8 w-full max-w-5xl mx-auto">
          <h1 className="text-4xl font-bold text-white mb-2">{shop.name}</h1>
          <p className="text-slate-300 text-lg">{shop.category} • ⭐ {shop.rating}</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 mt-12 flex space-x-12">
        {/* Main View */}
        <div className="flex-1">
          {step === 1 && (
            <>
              <h2 className="text-2xl font-bold text-white mb-6">1. Select Services</h2>
              {renderStep1()}
            </>
          )}
          {step === 2 && (
            <>
              <h2 className="text-2xl font-bold text-white mb-6">2. Select Staff & Time</h2>
              {renderStep2()}
            </>
          )}
          {step === 3 && renderStep3()}
        </div>

        {/* Sidebar Summary (Only on Step 1 & 2) */}
        {step < 3 && (
          <div className="w-96">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 sticky top-24">
              <h2 className="text-xl font-bold text-white mb-6 border-b border-slate-800 pb-4">Booking Summary</h2>
              
              {selectedServices.length === 0 ? (
                <div className="text-slate-500 text-center py-8">Select a service to proceed</div>
              ) : (
                <>
                  <div className="space-y-3 mb-6">
                    {selectedServices.map(s => (
                      <div key={s.id} className="flex justify-between text-sm">
                        <span className="text-slate-300">{s.name}</span>
                        <span className="text-white font-medium">₹{s.price}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="border-t border-slate-800 pt-4 space-y-2">
                    <div className="flex justify-between font-bold text-white text-lg">
                      <span>Total Amount</span>
                      <span className="text-green-400">₹{totalAmount}</span>
                    </div>
                    <div className="flex justify-between text-slate-400 text-sm">
                      <span>Duration</span>
                      <span>~{totalDuration} mins</span>
                    </div>
                  </div>

                  {step === 1 ? (
                    <button 
                      onClick={() => setStep(2)}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg mt-8 transition-colors"
                    >
                      Next: Select Time →
                    </button>
                  ) : (
                    <button 
                      disabled={!selectedTime}
                      onClick={() => setStep(3)}
                      className="w-full bg-green-500 hover:bg-green-400 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-3 rounded-lg mt-8 transition-colors"
                    >
                      Confirm Booking
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
