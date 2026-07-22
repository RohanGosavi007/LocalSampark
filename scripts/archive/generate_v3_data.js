const fs = require('fs');
const path = require('path');

const featuresData = [
  {
    catId: 'finance',
    catTitleKey: 'cat_finance',
    catTitleEn: 'Farmer Financial Services',
    color: '#eab308',
    features: [
      { id: 'jan-dhan', icon: '🏦', titleEn: 'Jan Dhan & Bank Account', descEn: 'Open accounts and get ATM cards via BC agents.' },
      { id: 'credit-score', icon: '📊', titleEn: 'Credit Score Builder', descEn: 'Build digital credit history using platform records.' },
      { id: 'fpo-loans', icon: '💰', titleEn: 'FPO/SHG Loan Pooling', descEn: 'Apply for group loans for farmer organizations.' },
      { id: 'pm-kisan', icon: '🧾', titleEn: 'PM-Kisan Tracker', descEn: 'Check PM-Kisan ₹6,000/year live status.' },
      { id: 'chit-fund', icon: '🤝', titleEn: 'Chit Fund/Bhishi', descEn: 'Digital rotating savings group for women SHGs.' },
      { id: 'loans', icon: '💳', titleEn: 'Kisan Loans', descEn: 'Apply for KCC and agriculture loans.' }
    ]
  },
  {
    catId: 'intelligence',
    catTitleKey: 'cat_intelligence',
    catTitleEn: 'Crop & Farming Intelligence',
    color: '#10b981',
    features: [
      { id: 'drone-spray', icon: '🛰️', titleEn: 'Drone Spraying', descEn: 'Book certified drone operators for spraying.' },
      { id: 'crop-disease-ai', icon: '🧬', titleEn: 'Crop Disease AI Scanner', descEn: 'AI identifies plant diseases from photos.' },
      { id: 'irrigation', icon: '💧', titleEn: 'Irrigation Scheduler', descEn: 'Drip/sprinkler scheduler based on crop & weather.' },
      { id: 'krishi-calendar', icon: '📅', titleEn: 'Krishi Calendar', descEn: 'Region-specific sowing & harvesting reminders.' },
      { id: 'crop-rotation', icon: '🌽', titleEn: 'Crop Rotation Advisor', descEn: 'AI advice on which crop to grow next season.' },
      { id: 'contract-farming', icon: '📦', titleEn: 'Contract Farming', descEn: 'Sign digital contracts directly with agri-companies.' },
      { id: 'water-testing', icon: '🔬', titleEn: 'Water Quality Testing', descEn: 'Doorstep water testing for borewells.' },
      { id: 'weather', icon: '🌦️', titleEn: 'Weather Advisory', descEn: 'Hyper-local weather and crop alerts.' },
      { id: 'soil', icon: '🌱', titleEn: 'Soil Testing', descEn: 'Book doorstep soil sample collection.' },
      { id: 'mandi', icon: '📈', titleEn: 'Mandi Rates', descEn: 'Check live APMC crop prices daily.' }
    ]
  },
  {
    catId: 'dairy',
    catTitleKey: 'cat_dairy',
    catTitleEn: 'Animal Husbandry & Dairy',
    color: '#8b5cf6',
    features: [
      { id: 'milk-collection', icon: '🥛', titleEn: 'Milk Collection Tracker', descEn: 'Log daily milk output for dairy cooperatives.' },
      { id: 'vet-on-call', icon: '💉', titleEn: 'Vet on Call', descEn: 'Book a veterinary doctor for home visits or video.' },
      { id: 'poultry-rates', icon: '🐔', titleEn: 'Poultry Price Tracker', descEn: 'Live prices for broiler chicken and eggs.' },
      { id: 'feed-calculator', icon: '🧪', titleEn: 'Animal Feed Calculator', descEn: 'Get optimal feed formula based on animal weight.' },
      { id: 'health-record', icon: '📋', titleEn: 'Livestock Health Record', descEn: 'Digital health card for vaccines and breeding.' },
      { id: 'livestock', icon: '🐄', titleEn: 'Pashu Bazar', descEn: 'Buy and sell cows, buffaloes, and goats.' }
    ]
  },
  {
    catId: 'infrastructure',
    catTitleKey: 'cat_infrastructure',
    catTitleEn: 'Rural Infrastructure & Utilities',
    color: '#f97316',
    features: [
      { id: 'solar-pump', icon: '⚡', titleEn: 'Solar Pump Subsidy', descEn: 'Guide for PM-KUSUM solar pump applications.' },
      { id: 'borewell', icon: '💧', titleEn: 'Borewell Drilling', descEn: 'Find and book certified borewell operators.' },
      { id: 'rural-construction', icon: '🏗️', titleEn: 'Construction Connect', descEn: 'Find masons and material suppliers for farm sheds.' },
      { id: 'battery-rental', icon: '🔋', titleEn: 'Battery & Inverter Rentals', descEn: 'Rent inverters during rural power outages.' },
      { id: 'water-tanker', icon: '🚰', titleEn: 'Water Tanker Booking', descEn: 'Book water tanker delivery during droughts.' },
      { id: 'machinery', icon: '🚜', titleEn: 'Machinery Rental', descEn: 'Rent tractors and harvesters by the hour.' },
      { id: 'cold-storage', icon: '❄️', titleEn: 'Cold Storage', descEn: 'Find and book local cold storage space.' }
    ]
  },
  {
    catId: 'health',
    catTitleKey: 'cat_health',
    catTitleEn: 'Rural Health & Welfare',
    color: '#ef4444',
    features: [
      { id: 'hospital-finder', icon: '🏥', titleEn: 'Hospital & PHC Finder', descEn: 'Find nearest Primary Health Centre & doctors.' },
      { id: 'ambulance', icon: '🚑', titleEn: 'Emergency Ambulance', descEn: 'One-tap ambulance booking in the taluka.' },
      { id: 'generic-medicine', icon: '💊', titleEn: 'Generic Medicine', descEn: 'Find Jan Aushadhi stores near your pincode.' },
      { id: 'health-camps', icon: '🩺', titleEn: 'Free Health Camps', descEn: 'Calendar of NGO-run health camps in district.' },
      { id: 'mental-health', icon: '🧘', titleEn: 'Mental Health Helpline', descEn: 'Connect distressed farmers to support helplines.' },
      { id: 'anganwadi', icon: '👶', titleEn: 'Anganwadi & Child Welfare', descEn: 'Track vaccinations and maternity benefits.' }
    ]
  },
  {
    catId: 'education',
    catTitleKey: 'cat_education',
    catTitleEn: 'Education & Youth',
    color: '#3b82f6',
    features: [
      { id: 'scholarships', icon: '🎓', titleEn: 'Rural Scholarship Finder', descEn: 'Database of scholarships for rural students.' },
      { id: 'digital-literacy', icon: '💻', titleEn: 'Digital Literacy Classes', descEn: 'Smartphone & UPI training for older farmers.' },
      { id: 'govt-jobs', icon: '📝', titleEn: 'Govt. Job Alerts', descEn: 'Alerts for Gram Rozgar, Police, and Railway.' },
      { id: 'iti-courses', icon: '🚜', titleEn: 'ITI Courses for Youth', descEn: 'Enroll in tractor mechanics & welding courses.' },
      { id: 'academy', icon: '📱', titleEn: 'Kisan Academy', descEn: 'Learn modern farming via video courses.' }
    ]
  },
  {
    catId: 'governance',
    catTitleKey: 'cat_governance',
    catTitleEn: 'Rural Governance & Legal',
    color: '#64748b',
    features: [
      { id: '712-utara', icon: '📜', titleEn: '7/12 Utara & Land Records', descEn: 'One-tap access to Mahabhumi land records.' },
      { id: 'legal-aid', icon: '⚖️', titleEn: 'Legal Aid Connect', descEn: 'Find lawyers for land disputes and domestic cases.' },
      { id: 'gram-panchayat', icon: '📋', titleEn: 'Gram Panchayat Services', descEn: 'Apply for certificates and ration card changes.' },
      { id: 'voter-id', icon: '🗳️', titleEn: 'Voter ID & Aadhaar', descEn: 'Guided form filling for corrections.' },
      { id: 'pmay-status', icon: '🏠', titleEn: 'PMAY Gramin Status', descEn: 'Check rural housing eligibility and status.' },
      { id: 'schemes', icon: '🏛️', titleEn: 'Sarkari Yojana', descEn: 'Check eligibility for Govt Schemes.' }
    ]
  },
  {
    catId: 'mobility',
    catTitleKey: 'cat_mobility',
    catTitleEn: 'Rural Mobility & Transport',
    color: '#0ea5e9',
    features: [
      { id: 'bus-tracker', icon: '🚌', titleEn: 'ST Bus Tracker', descEn: 'Real-time MSRTC schedule for rural routes.' },
      { id: 'rural-auto', icon: '🛺', titleEn: 'Rural Auto Booking', descEn: 'Book shared autos for last-mile connectivity.' },
      { id: 'bike-taxi', icon: '🏍️', titleEn: 'Bike Taxi Connect', descEn: 'Two-wheeler taxis for remote villages.' },
      { id: 'vehicle-rental', icon: '🚗', titleEn: 'Monthly Vehicle Rental', descEn: 'Rent Bolero or Sumo for farm usage.' },
      { id: 'transport', icon: '🚚', titleEn: 'Maal Gaadi', descEn: 'Book tempos/trucks for crop transport.' }
    ]
  },
  {
    catId: 'commerce',
    catTitleKey: 'cat_commerce',
    catTitleEn: 'Rural Digital Commerce',
    color: '#d946ef',
    features: [
      { id: 'handcrafts', icon: '🎨', titleEn: 'Handcraft Store', descEn: 'Rural artisans sell directly to urban buyers.' },
      { id: 'exotic-produce', icon: '🥭', titleEn: 'Organic Produce', descEn: 'Premium organic box delivered to cities.' },
      { id: 'aquaculture', icon: '🐟', titleEn: 'Aquaculture Market', descEn: 'Fishermen sell fresh fish to pan-Maharashtra.' },
      { id: 'forest-products', icon: '🍯', titleEn: 'Forest & Tribal Products', descEn: 'Mahua, honey, bamboo from tribal belts.' },
      { id: 'agri-waste', icon: '♻️', titleEn: 'Agri-Waste Exchange', descEn: 'Sell paddy straw and bagasse to biogas buyers.' },
      { id: 'bazaar', icon: '🛒', titleEn: 'Krishi Bazaar', descEn: 'Buy Seeds, Fertilizers & Pesticides locally.' },
      { id: 'sell', icon: '👨‍🌾', titleEn: 'Farm-to-City', descEn: 'Sell bulk produce directly to city buyers.' },
      { id: 'store', icon: '📦', titleEn: 'Rural E-Com', descEn: 'Order daily essentials & electronics.' }
    ]
  },
  {
    catId: 'smart-tech',
    catTitleKey: 'cat_smart_tech',
    catTitleEn: 'Smart Tech for Farmers',
    color: '#14b8a6',
    features: [
      { id: 'ivr-service', icon: '📻', titleEn: 'Voice-Based IVR', descEn: 'Basic phone service for mandi rates & weather.' },
      { id: 'whatsapp-bot', icon: '📲', titleEn: 'WhatsApp Bot', descEn: 'Get AI responses via WhatsApp.' },
      { id: 'field-mapping', icon: '🗺️', titleEn: 'Field Boundary Mapping', descEn: 'Draw on map to get precise area in acres.' },
      { id: 'satellite-crop', icon: '📡', titleEn: 'Satellite Crop Monitoring', descEn: 'Check NDVI health index via satellite.' },
      { id: 'chatbot', icon: '🤖', titleEn: 'AI Farming Assistant', descEn: 'Marathi/Hindi chatbot for farming questions.' },
      { id: 'insurance', icon: '🛡️', titleEn: 'Crop Insurance', descEn: 'Compare and buy PMFBY insurance.' }
    ]
  },
  {
    catId: 'women-empowerment',
    catTitleKey: 'cat_women',
    catTitleEn: 'Women & SHG Empowerment',
    color: '#ec4899',
    features: [
      { id: 'shg-food', icon: '👩‍🍳', titleEn: 'SHG Food Business', descEn: 'Sell pickles, papad, and masalas via platform.' },
      { id: 'tailoring', icon: '🧵', titleEn: 'Tailoring Orders', descEn: 'Women tailors get orders from nearby towns.' },
      { id: 'floriculture', icon: '🌼', titleEn: 'Floriculture Market', descEn: 'Sell flowers directly to city florists.' },
      { id: 'shg-training', icon: '📖', titleEn: 'SHG Skill Training', descEn: 'Training for soap making, agarbatti, etc.' },
      { id: 'forum', icon: '💬', titleEn: 'Kisan Forum', descEn: 'Ask experts, share photos, get help.' },
      { id: 'services', icon: '🔧', titleEn: 'Seva Kendra', descEn: 'Find local electricians, plumbers, vets.' }
    ]
  }
];

// Build the rural-services.js content
let ruralServicesContent = "export const MANDI_RATES = [\\n" +
"  { crop: 'Onion (कांदा)', market: 'Lasalgaon APMC', price: '₹42/kg', trend: 'up', change: '+₹3' },\\n" +
"  { crop: 'Tomato (टोमॅटो)', market: 'Narayangaon APMC', price: '₹28/kg', trend: 'down', change: '-₹2' },\\n" +
"  { crop: 'Soyabean (सोयाबीन)', market: 'Latur APMC', price: '₹4,800/Qtl', trend: 'up', change: '+₹150' },\\n" +
"  { crop: 'Cotton (कापूस)', market: 'Yavatmal APMC', price: '₹7,200/Qtl', trend: 'up', change: '+₹200' },\\n" +
"  { crop: 'Tur/Arhar (तूर)', market: 'Akola APMC', price: '₹9,500/Qtl', trend: 'stable', change: '₹0' },\\n" +
"  { crop: 'Grapes (द्राक्षे)', market: 'Nashik APMC', price: '₹65/kg', trend: 'down', change: '-₹5' },\\n" +
"  { crop: 'Pomegranate (डाळिंब)', market: 'Solapur APMC', price: '₹120/kg', trend: 'up', change: '+₹10' }\\n" +
"];\\n\\n" +
"export const RURAL_CATEGORIES = [\\n";

featuresData.forEach(cat => {
  ruralServicesContent += "  {\\n" +
"    id: '" + cat.catId + "',\\n" +
"    title_key: '" + cat.catTitleKey + "',\\n" +
"    color: '" + cat.color + "',\\n" +
"    features: [\\n";
  
  cat.features.forEach(f => {
    ruralServicesContent += "      { id: '" + f.id + "', icon: '" + f.icon + "', title_key: 'feat_" + f.id + "', desc_key: 'feat_" + f.id + "_desc', color: '" + cat.color + "', path: '/krishi/" + f.id + "' },\\n";
  });
  
  ruralServicesContent += "    ]\\n" +
"  },\\n";
});

ruralServicesContent += "];\\n\\n";

// Top 10 priority features defined by the user
ruralServicesContent += "export const TOP_FEATURES = [\\n" +
"  { id: 'drone-spray', icon: '🛰️', title_key: 'feat_drone-spray', desc_key: 'feat_drone-spray_desc', color: '#10b981', path: '/krishi/drone-spray' },\\n" +
"  { id: 'crop-disease-ai', icon: '🧬', title_key: 'feat_crop-disease-ai', desc_key: 'feat_crop-disease-ai_desc', color: '#10b981', path: '/krishi/crop-disease-ai' },\\n" +
"  { id: 'milk-collection', icon: '🥛', title_key: 'feat_milk-collection', desc_key: 'feat_milk-collection_desc', color: '#8b5cf6', path: '/krishi/milk-collection' },\\n" +
"  { id: '712-utara', icon: '📜', title_key: 'feat_712-utara', desc_key: 'feat_712-utara_desc', color: '#64748b', path: '/krishi/712-utara' },\\n" +
"  { id: 'krishi-calendar', icon: '📅', title_key: 'feat_krishi-calendar', desc_key: 'feat_krishi-calendar_desc', color: '#10b981', path: '/krishi/krishi-calendar' },\\n" +
"  { id: 'contract-farming', icon: '📦', title_key: 'feat_contract-farming', desc_key: 'feat_contract-farming_desc', color: '#10b981', path: '/krishi/contract-farming' },\\n" +
"  { id: 'handcrafts', icon: '🎨', title_key: 'feat_handcrafts', desc_key: 'feat_handcrafts_desc', color: '#d946ef', path: '/krishi/handcrafts' },\\n" +
"  { id: 'whatsapp-bot', icon: '📲', title_key: 'feat_whatsapp-bot', desc_key: 'feat_whatsapp-bot_desc', color: '#14b8a6', path: '/krishi/whatsapp-bot' },\\n" +
"  { id: 'mental-health', icon: '🧘', title_key: 'feat_mental-health', desc_key: 'feat_mental-health_desc', color: '#ef4444', path: '/krishi/mental-health' },\\n" +
"  { id: 'agri-waste', icon: '♻️', title_key: 'feat_agri-waste', desc_key: 'feat_agri-waste_desc', color: '#d946ef', path: '/krishi/agri-waste' }\\n" +
"];\\n";

fs.writeFileSync(path.join(__dirname, 'apps/web/src/app/data/rural-services.js'), ruralServicesContent);

// Build translations.js content
let translationObj = { en: {
  nav_krishi: 'Krishi (Rural)',
  nav_city: 'City Services',
  nav_franchise: 'Franchise',
  hero_krishi_title: 'Empowering Rural Bharat',
  hero_krishi_sub: 'The complete digital ecosystem for Farmers and Rural Citizens. Buy, sell, rent, and connect directly.',
  mandi_live: 'LIVE MANDI RATES:'
}, mr: {
  nav_krishi: 'कृषी (ग्रामीण)',
  nav_city: 'शहर सेवा',
  nav_franchise: 'फ्रेंचायझी',
  hero_krishi_title: 'ग्रामीण भारताचे सक्षमीकरण',
  hero_krishi_sub: 'शेतकरी आणि ग्रामीण नागरिकांसाठी संपूर्ण डिजिटल इकोसिस्टम. खरेदी, विक्री, भाड्याने घ्या आणि थेट संपर्क साधा.',
  mandi_live: 'थेट बाजारभाव:'
}, hi: {
  nav_krishi: 'कृषि (ग्रामीण)',
  nav_city: 'शहर सेवाएँ',
  nav_franchise: 'फ्रेंचाइजी',
  hero_krishi_title: 'ग्रामीण भारत का सशक्तिकरण',
  hero_krishi_sub: 'किसानों और ग्रामीण नागरिकों के लिए संपूर्ण डिजिटल इकोसिस्टम। खरीदें, बेचें, किराए पर लें और सीधा जुड़ें।',
  mandi_live: 'लाइव मंडी भाव:'
}};

featuresData.forEach(cat => {
  translationObj.en[cat.catTitleKey] = cat.catTitleEn;
  translationObj.mr[cat.catTitleKey] = cat.catTitleEn; // Defaulting to EN for now
  translationObj.hi[cat.catTitleKey] = cat.catTitleEn; // Defaulting to EN for now

  cat.features.forEach(f => {
    translationObj.en['feat_' + f.id] = f.titleEn;
    translationObj.en['feat_' + f.id + '_desc'] = f.descEn;
    translationObj.mr['feat_' + f.id] = f.titleEn;
    translationObj.mr['feat_' + f.id + '_desc'] = f.descEn;
    translationObj.hi['feat_' + f.id] = f.titleEn;
    translationObj.hi['feat_' + f.id + '_desc'] = f.descEn;
  });
});

const translationsContent = "export const translations = " + JSON.stringify(translationObj, null, 2) + ";\\n";
fs.writeFileSync(path.join(__dirname, 'apps/web/src/app/data/translations.js'), translationsContent);

console.log('Data and Translations generated successfully.');
