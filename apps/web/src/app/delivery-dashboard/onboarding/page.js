'use client';
import React, { useState } from 'react';
import Header from '../../../components/Header';
import Footer from '../../../components/Footer';
import { motion } from 'framer-motion';
import { CheckCircle, Upload, Shield, Truck, FileText, ArrowRight, Camera } from 'lucide-react';
import Link from 'next/link';

export default function DeliveryOnboarding() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    vehicleType: 'bike',
    drivingLicense: '',
    rcBook: '',
    aadhaar: '',
    pan: ''
  });

  const nextStep = () => setStep(prev => prev + 1);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-950 pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-black text-white mb-4">Become a Delivery Partner</h1>
            <p className="text-slate-400 text-lg">Join LocalSampark, earn weekly payouts, and deliver happiness.</p>
          </div>

          {/* Progress Bar */}
          <div className="flex justify-between items-center mb-12 relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-800 -z-10"></div>
            <div className={`absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-emerald-500 -z-10 transition-all duration-500`} style={{ width: `${(step - 1) * 50}%` }}></div>
            
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white transition ${step >= 1 ? 'bg-emerald-500' : 'bg-slate-800'}`}>1</div>
              <span className="text-sm font-medium mt-2 text-slate-400">Basic Info</span>
            </div>
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white transition ${step >= 2 ? 'bg-emerald-500' : 'bg-slate-800'}`}>2</div>
              <span className="text-sm font-medium mt-2 text-slate-400">Documents</span>
            </div>
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white transition ${step >= 3 ? 'bg-emerald-500' : 'bg-slate-800'}`}>3</div>
              <span className="text-sm font-medium mt-2 text-slate-400">Verification</span>
            </div>
          </div>

          {/* Step 1: Vehicle & Basic */}
          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-slate-900 border border-slate-800 p-8 rounded-3xl">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><Truck className="text-emerald-500" /> Vehicle Details</h2>
              <div className="grid grid-cols-2 gap-4 mb-8">
                <button 
                  onClick={() => setFormData({...formData, vehicleType: 'bike'})}
                  className={`p-6 border rounded-2xl flex flex-col items-center transition ${formData.vehicleType === 'bike' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'}`}
                >
                  <span className="text-4xl mb-2">🏍️</span>
                  <span className="font-bold">Two Wheeler</span>
                </button>
                <button 
                  onClick={() => setFormData({...formData, vehicleType: 'cycle'})}
                  className={`p-6 border rounded-2xl flex flex-col items-center transition ${formData.vehicleType === 'cycle' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'}`}
                >
                  <span className="text-4xl mb-2">🚲</span>
                  <span className="font-bold">Bicycle / Walk</span>
                </button>
              </div>

              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-slate-400 font-medium mb-2">Preferred Delivery Zone</label>
                  <input type="text" placeholder="Enter Pincode or Area Name" className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500" />
                </div>
              </div>

              <button onClick={nextStep} className="w-full py-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-500 transition shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2">
                Continue to Documents <ArrowRight className="w-5 h-5" />
              </button>
            </motion.div>
          )}

          {/* Step 2: Documents */}
          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-slate-900 border border-slate-800 p-8 rounded-3xl">
              <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2"><FileText className="text-emerald-500" /> KYC Documents</h2>
              <p className="text-slate-400 mb-8">Upload clear pictures of the following documents for background verification.</p>

              <div className="space-y-6 mb-8">
                <div className="p-6 border border-slate-700 border-dashed rounded-2xl bg-slate-800/50 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500 transition">
                  <Camera className="w-8 h-8 text-slate-400 mb-2" />
                  <p className="text-white font-bold mb-1">Aadhaar Card (Front & Back)</p>
                  <p className="text-xs text-slate-500">JPG, PNG, PDF up to 5MB</p>
                </div>
                
                {formData.vehicleType === 'bike' && (
                  <div className="p-6 border border-slate-700 border-dashed rounded-2xl bg-slate-800/50 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500 transition">
                    <Camera className="w-8 h-8 text-slate-400 mb-2" />
                    <p className="text-white font-bold mb-1">Driving License</p>
                    <p className="text-xs text-slate-500">JPG, PNG, PDF up to 5MB</p>
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <button onClick={() => setStep(1)} className="w-1/3 py-4 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 transition border border-slate-700">Back</button>
                <button onClick={nextStep} className="w-2/3 py-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-500 transition shadow-lg shadow-emerald-600/20">Submit Documents</button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Success / Verification */}
          {step === 3 && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-slate-900 border border-slate-800 p-12 rounded-3xl text-center">
              <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="w-12 h-12 text-emerald-500" />
              </div>
              <h2 className="text-3xl font-black text-white mb-4">Application Submitted!</h2>
              <p className="text-slate-400 mb-8 max-w-md mx-auto">Your documents are under review. Our local franchise partner will verify your application within 24 hours.</p>
              
              <Link href="/delivery/page.js" className="inline-block px-8 py-4 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 transition border border-slate-700">
                Return to Home
              </Link>
            </motion.div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
