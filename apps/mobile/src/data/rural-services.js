export const MANDI_RATES = [
  { crop: 'Onion (कांदा)', market: 'Lasalgaon APMC', price: '₹42/kg', trend: 'up', change: '+₹3' },
  { crop: 'Tomato (टोमॅटो)', market: 'Narayangaon APMC', price: '₹28/kg', trend: 'down', change: '-₹2' },
  { crop: 'Soyabean (सोयाबीन)', market: 'Latur APMC', price: '₹4,800/Qtl', trend: 'up', change: '+₹150' },
  { crop: 'Cotton (कापूस)', market: 'Yavatmal APMC', price: '₹7,200/Qtl', trend: 'up', change: '+₹200' },
  { crop: 'Tur/Arhar (तूर)', market: 'Akola APMC', price: '₹9,500/Qtl', trend: 'stable', change: '₹0' },
  { crop: 'Grapes (द्राक्षे)', market: 'Nashik APMC', price: '₹65/kg', trend: 'down', change: '-₹5' },
  { crop: 'Pomegranate (डाळिंब)', market: 'Solapur APMC', price: '₹120/kg', trend: 'up', change: '+₹10' }
];

export const RURAL_CATEGORIES = [
  {
    id: 'finance',
    title_key: 'Finance',
    color: '#eab308',
    features: [
      { id: 'jan-dhan', icon: '🏦', title_key: 'Jan Dhan', desc_key: 'Banking', color: '#eab308', path: '/krishi/jan-dhan' },
      { id: 'credit-score', icon: '📊', title_key: 'Credit Score', desc_key: 'Check Score', color: '#eab308', path: '/krishi/credit-score' },
      { id: 'fpo-loans', icon: '💰', title_key: 'FPO Loans', desc_key: 'Agri Loans', color: '#eab308', path: '/krishi/fpo-loans' },
      { id: 'pm-kisan', icon: '🧾', title_key: 'PM Kisan', desc_key: 'Scheme Status', color: '#eab308', path: '/krishi/pm-kisan' },
    ]
  },
  {
    id: 'intelligence',
    title_key: 'Intelligence',
    color: '#10b981',
    features: [
      { id: 'drone-spray', icon: '🛰️', title_key: 'Drone Spray', desc_key: 'Book Drone', color: '#10b981', path: '/krishi/drone-spray' },
      { id: 'crop-disease-ai', icon: '🧬', title_key: 'Crop Disease AI', desc_key: 'AI Scanner', color: '#10b981', path: '/krishi/crop-disease-ai' },
      { id: 'weather', icon: '🌦️', title_key: 'Weather', desc_key: 'Forecast', color: '#10b981', path: '/krishi/weather' },
      { id: 'mandi', icon: '📈', title_key: 'Mandi Rates', desc_key: 'Live Prices', color: '#10b981', path: '/krishi/mandi' },
    ]
  },
  {
    id: 'dairy',
    title_key: 'Dairy & Livestock',
    color: '#8b5cf6',
    features: [
      { id: 'milk-collection', icon: '🥛', title_key: 'Milk Collection', desc_key: 'Dairy Logs', color: '#8b5cf6', path: '/krishi/milk-collection' },
      { id: 'vet-on-call', icon: '💉', title_key: 'Vet on Call', desc_key: 'Doctor', color: '#8b5cf6', path: '/krishi/vet-on-call' },
      { id: 'poultry-rates', icon: '🐔', title_key: 'Poultry Rates', desc_key: 'Live Rates', color: '#8b5cf6', path: '/krishi/poultry-rates' },
      { id: 'livestock', icon: '🐄', title_key: 'Buy/Sell Animals', desc_key: 'Market', color: '#8b5cf6', path: '/krishi/livestock' },
    ]
  },
  {
    id: 'infrastructure',
    title_key: 'Infrastructure',
    color: '#f97316',
    features: [
      { id: 'solar-pump', icon: '⚡', title_key: 'Solar Pumps', desc_key: 'Apply Now', color: '#f97316', path: '/krishi/solar-pump' },
      { id: 'borewell', icon: '💧', title_key: 'Borewell', desc_key: 'Booking', color: '#f97316', path: '/krishi/borewell' },
      { id: 'machinery', icon: '🚜', title_key: 'Machinery', desc_key: 'Rentals', color: '#f97316', path: '/krishi/machinery' },
      { id: 'cold-storage', icon: '❄️', title_key: 'Cold Storage', desc_key: 'Find Space', color: '#f97316', path: '/krishi/cold-storage' },
    ]
  }
];

export const TOP_FEATURES = [
  { id: 'farm-diary', icon: '📒', title_key: 'Farm Diary', desc_key: 'Track expenses & yield', color: '#64748b', path: '/krishi/farm-diary' },
  { id: 'food-processing', icon: '🏭', title_key: 'Food Processing', desc_key: 'Setup rural units', color: '#fbbf24', path: '/krishi/food-processing' },
  { id: 'farm-labor', icon: '👷', title_key: 'Farm Labor', desc_key: 'Hire daily workers', color: '#64748b', path: '/krishi/farm-labor' },
  { id: 'warehouse-receipt', icon: '🌾', title_key: 'Warehouse Receipt', desc_key: 'e-NWR pledge loans', color: '#fbbf24', path: '/krishi/warehouse-receipt' },
];
