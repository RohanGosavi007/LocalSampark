'use client';
import React, { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, Search, Filter, Stethoscope, 
  MapPin, AlertTriangle, Syringe, FileText, 
  Phone, Plus, ShieldCheck
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';

const INITIAL_PETS = [
  { id: 1, type: 'adopt', name: 'Luna', species: 'Cat', breed: 'Persian Cross', age: '2 years', area: 'Viman Nagar', image: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=500&h=500&fit=crop', health: ['Vaccinated', 'Spayed'], matchScore: 92 },
  { id: 2, type: 'adopt', name: 'Max', species: 'Dog', breed: 'Golden Retriever', age: '8 months', area: 'Kalyani Nagar', image: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=500&h=500&fit=crop', health: ['Vaccinated', 'Dewormed'], matchScore: 88 },
  { id: 3, type: 'lost', name: 'Coco', species: 'Dog', breed: 'Shih Tzu', age: '4 years', area: 'Koregaon Park', image: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=500&h=500&fit=crop', lastSeen: '2 hours ago', reward: '₹2000' }
];

export default function PetsPage() {
  const [activeTab, setActiveTab] = useState('adopt');
  const [filter, setFilter] = useState('All');
  
  const filteredPets = INITIAL_PETS.filter(pet => {
      if (activeTab === 'adopt' && pet.type !== 'adopt') return false;
      if (activeTab === 'lost' && pet.type !== 'lost') return false;
      if (filter !== 'All' && pet.species !== filter) return false;
      return true;
  });

  return (
    <div className="min-h-screen bg-section-alt flex flex-col">
      <Header />
      <main className="flex-1 py-12">
        <div className="container max-w-6xl">
            
          <div className="text-center mb-12">
            <Badge variant="primary" className="mb-4 bg-rose-500/10 text-rose-500 border-rose-500/20 px-4 py-1.5"><Heart className="w-4 h-4 mr-2"/> Paw-some Community</Badge>
            <h1 className="text-4xl md:text-5xl font-heading font-black mb-4">Find Your New Best Friend</h1>
            <p className="text-text-muted max-w-xl mx-auto text-lg">Adopt verified local pets, help find lost ones, and manage your pet's health records all in one place.</p>
          </div>

          <div className="flex flex-col md:flex-row gap-8 mb-12">
              <div className="flex bg-background border border-border p-1 rounded-2xl md:w-fit">
                  <button onClick={() => setActiveTab('adopt')} className={`flex-1 md:px-8 py-3 rounded-xl font-bold transition-all ${activeTab === 'adopt' ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-text'}`}>Adopt a Pet</button>
                  <button onClick={() => setActiveTab('lost')} className={`flex-1 md:px-8 py-3 rounded-xl font-bold transition-all ${activeTab === 'lost' ? 'bg-rose-500 text-white shadow-sm' : 'text-text-muted hover:text-text'}`}>Lost & Found</button>
                  <button onClick={() => setActiveTab('health')} className={`flex-1 md:px-8 py-3 rounded-xl font-bold transition-all ${activeTab === 'health' ? 'bg-emerald-500 text-white shadow-sm' : 'text-text-muted hover:text-text'}`}>Health Records</button>
              </div>

              {activeTab !== 'health' && (
                  <div className="flex gap-2 ml-auto overflow-x-auto pb-2 md:pb-0">
                      {['All', 'Dog', 'Cat', 'Other'].map(f => (
                          <button key={f} onClick={() => setFilter(f)} className={`px-6 py-3 rounded-2xl font-bold border whitespace-nowrap transition-all ${filter === f ? 'bg-primary/10 border-primary text-primary' : 'bg-background border-border text-text hover:border-primary/50'}`}>
                              {f}
                          </button>
                      ))}
                  </div>
              )}
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'health' ? (
                <motion.div key="health" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="col-span-1">
                            <Card className="p-6 text-center bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-none shadow-lg">
                                <div className="w-24 h-24 rounded-full border-4 border-white/20 mx-auto mb-4 overflow-hidden bg-white/10 flex items-center justify-center">
                                    <span className="text-4xl">🐕</span>
                                </div>
                                <h2 className="text-2xl font-black mb-1">Bruno</h2>
                                <p className="text-white/80 font-medium mb-6">Golden Retriever • 3 Yrs</p>
                                <Button className="w-full bg-white text-teal-700 hover:bg-white/90">Edit Profile</Button>
                            </Card>
                        </div>
                        <div className="col-span-1 md:col-span-2 space-y-6">
                            <div className="glass-card p-6 rounded-3xl border border-border bg-background shadow-sm">
                                <h3 className="text-xl font-bold flex items-center gap-2 mb-6"><Syringe className="text-emerald-500"/> Vaccination Schedule</h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/20">
                                        <div>
                                            <div className="font-bold text-emerald-700 dark:text-emerald-400">Anti-Rabies</div>
                                            <div className="text-sm text-text-muted">Given on: 12 Jan 2026</div>
                                        </div>
                                        <Badge className="bg-emerald-500 text-white border-transparent">Done</Badge>
                                    </div>
                                    <div className="flex justify-between items-center p-4 bg-amber-500/5 rounded-2xl border border-amber-500/20">
                                        <div>
                                            <div className="font-bold text-amber-700 dark:text-amber-400">DHLPPi Booster</div>
                                            <div className="text-sm text-text-muted">Due on: 15 Aug 2026</div>
                                        </div>
                                        <Badge className="bg-amber-500 text-white border-transparent">Upcoming</Badge>
                                    </div>
                                </div>
                            </div>
                            <div className="glass-card p-6 rounded-3xl border border-border bg-background shadow-sm">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-bold flex items-center gap-2"><FileText className="text-blue-500"/> Medical History</h3>
                                    <Button variant="outline" size="sm" icon={Plus}>Add Record</Button>
                                </div>
                                <div className="text-center py-8 border-2 border-dashed border-border rounded-2xl">
                                    <Stethoscope className="w-12 h-12 text-border mx-auto mb-3" />
                                    <p className="text-text-muted font-medium">No past medical records uploaded.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            ) : (
                <motion.div key="list" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                    {filteredPets.length === 0 ? (
                        <div className="text-center py-20">
                            <Search className="w-16 h-16 text-text-muted/30 mx-auto mb-4" />
                            <h3 className="text-xl font-bold mb-2">No Pets Found</h3>
                            <p className="text-text-muted">Try adjusting your filters.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {filteredPets.map(pet => (
                                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} key={pet.id} className="glass-card rounded-3xl border border-border bg-background shadow-sm overflow-hidden group hover:shadow-xl hover:shadow-primary/5 transition-all">
                                    <div className="relative h-64 overflow-hidden">
                                        <img src={pet.image} alt={pet.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                        <div className="absolute top-4 left-4 flex flex-col gap-2">
                                            {pet.type === 'lost' ? (
                                                <Badge className="bg-rose-500 text-white border-transparent shadow-lg"><AlertTriangle className="w-3 h-3 mr-1"/> LOST PET</Badge>
                                            ) : (
                                                <Badge className="bg-emerald-500 text-white border-transparent shadow-lg"><Heart className="w-3 h-3 mr-1"/> FOR ADOPTION</Badge>
                                            )}
                                        </div>
                                        {pet.matchScore && (
                                            <div className="absolute top-4 right-4 bg-background/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-border shadow-lg flex items-center gap-1.5">
                                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                                <span className="font-black text-sm">{pet.matchScore}% Match</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-6">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="text-2xl font-black">{pet.name}</h3>
                                            {pet.reward && <span className="font-bold text-rose-500 bg-rose-500/10 px-3 py-1 rounded-lg">Reward: {pet.reward}</span>}
                                        </div>
                                        <p className="text-text-muted font-medium mb-4">{pet.breed} • {pet.age}</p>
                                        
                                        <div className="space-y-3 mb-6">
                                            <div className="flex items-center gap-2 text-sm text-text-muted">
                                                <MapPin className="w-4 h-4 text-primary" /> {pet.area}
                                            </div>
                                            {pet.health && (
                                                <div className="flex flex-wrap gap-2">
                                                    {pet.health.map(h => (
                                                        <span key={h} className="text-xs font-bold text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded-md flex items-center gap-1">
                                                            <ShieldCheck className="w-3 h-3"/> {h}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                            {pet.lastSeen && (
                                                <div className="text-sm font-bold text-rose-600 flex items-center gap-2">
                                                    <AlertTriangle className="w-4 h-4"/> Last seen {pet.lastSeen}
                                                </div>
                                            )}
                                        </div>
                                        
                                        <Button className="w-full shadow-lg shadow-primary/20" icon={Phone}>
                                            Contact Owner
                                        </Button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
      <Footer />
    </div>
  );
}
