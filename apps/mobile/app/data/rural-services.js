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
    title_key: 'cat_finance',
    color: '#eab308',
    features: [
      { id: 'jan-dhan', icon: '🏦', title_key: 'feat_jan-dhan', desc_key: 'feat_jan-dhan_desc', color: '#eab308', path: '/krishi/jan-dhan' },
      { id: 'credit-score', icon: '📊', title_key: 'feat_credit-score', desc_key: 'feat_credit-score_desc', color: '#eab308', path: '/krishi/credit-score' },
      { id: 'fpo-loans', icon: '💰', title_key: 'feat_fpo-loans', desc_key: 'feat_fpo-loans_desc', color: '#eab308', path: '/krishi/fpo-loans' },
      { id: 'pm-kisan', icon: '🧾', title_key: 'feat_pm-kisan', desc_key: 'feat_pm-kisan_desc', color: '#eab308', path: '/krishi/pm-kisan' },
      { id: 'chit-fund', icon: '🤝', title_key: 'feat_chit-fund', desc_key: 'feat_chit-fund_desc', color: '#eab308', path: '/krishi/chit-fund' },
      { id: 'loans', icon: '💳', title_key: 'feat_loans', desc_key: 'feat_loans_desc', color: '#eab308', path: '/krishi/loans' },
    ]
  },
  {
    id: 'intelligence',
    title_key: 'cat_intelligence',
    color: '#10b981',
    features: [
      { id: 'drone-spray', icon: '🛰️', title_key: 'feat_drone-spray', desc_key: 'feat_drone-spray_desc', color: '#10b981', path: '/krishi/drone-spray' },
      { id: 'crop-disease-ai', icon: '🧬', title_key: 'feat_crop-disease-ai', desc_key: 'feat_crop-disease-ai_desc', color: '#10b981', path: '/krishi/crop-disease-ai' },
      { id: 'irrigation', icon: '💧', title_key: 'feat_irrigation', desc_key: 'feat_irrigation_desc', color: '#10b981', path: '/krishi/irrigation' },
      { id: 'krishi-calendar', icon: '📅', title_key: 'feat_krishi-calendar', desc_key: 'feat_krishi-calendar_desc', color: '#10b981', path: '/krishi/krishi-calendar' },
      { id: 'crop-rotation', icon: '🌽', title_key: 'feat_crop-rotation', desc_key: 'feat_crop-rotation_desc', color: '#10b981', path: '/krishi/crop-rotation' },
      { id: 'contract-farming', icon: '📦', title_key: 'feat_contract-farming', desc_key: 'feat_contract-farming_desc', color: '#10b981', path: '/krishi/contract-farming' },
      { id: 'water-testing', icon: '🔬', title_key: 'feat_water-testing', desc_key: 'feat_water-testing_desc', color: '#10b981', path: '/krishi/water-testing' },
      { id: 'weather', icon: '🌦️', title_key: 'feat_weather', desc_key: 'feat_weather_desc', color: '#10b981', path: '/krishi/weather' },
      { id: 'soil', icon: '🌱', title_key: 'feat_soil', desc_key: 'feat_soil_desc', color: '#10b981', path: '/krishi/soil' },
      { id: 'mandi', icon: '📈', title_key: 'feat_mandi', desc_key: 'feat_mandi_desc', color: '#10b981', path: '/krishi/mandi' },
    ]
  },
  {
    id: 'dairy',
    title_key: 'cat_dairy',
    color: '#8b5cf6',
    features: [
      { id: 'milk-collection', icon: '🥛', title_key: 'feat_milk-collection', desc_key: 'feat_milk-collection_desc', color: '#8b5cf6', path: '/krishi/milk-collection' },
      { id: 'vet-on-call', icon: '💉', title_key: 'feat_vet-on-call', desc_key: 'feat_vet-on-call_desc', color: '#8b5cf6', path: '/krishi/vet-on-call' },
      { id: 'poultry-rates', icon: '🐔', title_key: 'feat_poultry-rates', desc_key: 'feat_poultry-rates_desc', color: '#8b5cf6', path: '/krishi/poultry-rates' },
      { id: 'feed-calculator', icon: '🧪', title_key: 'feat_feed-calculator', desc_key: 'feat_feed-calculator_desc', color: '#8b5cf6', path: '/krishi/feed-calculator' },
      { id: 'health-record', icon: '📋', title_key: 'feat_health-record', desc_key: 'feat_health-record_desc', color: '#8b5cf6', path: '/krishi/health-record' },
      { id: 'livestock', icon: '🐄', title_key: 'feat_livestock', desc_key: 'feat_livestock_desc', color: '#8b5cf6', path: '/krishi/livestock' },
    ]
  },
  {
    id: 'infrastructure',
    title_key: 'cat_infrastructure',
    color: '#f97316',
    features: [
      { id: 'solar-pump', icon: '⚡', title_key: 'feat_solar-pump', desc_key: 'feat_solar-pump_desc', color: '#f97316', path: '/krishi/solar-pump' },
      { id: 'borewell', icon: '💧', title_key: 'feat_borewell', desc_key: 'feat_borewell_desc', color: '#f97316', path: '/krishi/borewell' },
      { id: 'rural-construction', icon: '🏗️', title_key: 'feat_rural-construction', desc_key: 'feat_rural-construction_desc', color: '#f97316', path: '/krishi/rural-construction' },
      { id: 'battery-rental', icon: '🔋', title_key: 'feat_battery-rental', desc_key: 'feat_battery-rental_desc', color: '#f97316', path: '/krishi/battery-rental' },
      { id: 'water-tanker', icon: '🚰', title_key: 'feat_water-tanker', desc_key: 'feat_water-tanker_desc', color: '#f97316', path: '/krishi/water-tanker' },
      { id: 'machinery', icon: '🚜', title_key: 'feat_machinery', desc_key: 'feat_machinery_desc', color: '#f97316', path: '/krishi/machinery' },
      { id: 'cold-storage', icon: '❄️', title_key: 'feat_cold-storage', desc_key: 'feat_cold-storage_desc', color: '#f97316', path: '/krishi/cold-storage' },
    ]
  },
  {
    id: 'health',
    title_key: 'cat_health',
    color: '#ef4444',
    features: [
      { id: 'hospital-finder', icon: '🏥', title_key: 'feat_hospital-finder', desc_key: 'feat_hospital-finder_desc', color: '#ef4444', path: '/krishi/hospital-finder' },
      { id: 'ambulance', icon: '🚑', title_key: 'feat_ambulance', desc_key: 'feat_ambulance_desc', color: '#ef4444', path: '/krishi/ambulance' },
      { id: 'generic-medicine', icon: '💊', title_key: 'feat_generic-medicine', desc_key: 'feat_generic-medicine_desc', color: '#ef4444', path: '/krishi/generic-medicine' },
      { id: 'health-camps', icon: '🩺', title_key: 'feat_health-camps', desc_key: 'feat_health-camps_desc', color: '#ef4444', path: '/krishi/health-camps' },
      { id: 'mental-health', icon: '🧘', title_key: 'feat_mental-health', desc_key: 'feat_mental-health_desc', color: '#ef4444', path: '/krishi/mental-health' },
      { id: 'anganwadi', icon: '👶', title_key: 'feat_anganwadi', desc_key: 'feat_anganwadi_desc', color: '#ef4444', path: '/krishi/anganwadi' },
    ]
  },
  {
    id: 'education',
    title_key: 'cat_education',
    color: '#3b82f6',
    features: [
      { id: 'scholarships', icon: '🎓', title_key: 'feat_scholarships', desc_key: 'feat_scholarships_desc', color: '#3b82f6', path: '/krishi/scholarships' },
      { id: 'digital-literacy', icon: '💻', title_key: 'feat_digital-literacy', desc_key: 'feat_digital-literacy_desc', color: '#3b82f6', path: '/krishi/digital-literacy' },
      { id: 'govt-jobs', icon: '📝', title_key: 'feat_govt-jobs', desc_key: 'feat_govt-jobs_desc', color: '#3b82f6', path: '/krishi/govt-jobs' },
      { id: 'iti-courses', icon: '🚜', title_key: 'feat_iti-courses', desc_key: 'feat_iti-courses_desc', color: '#3b82f6', path: '/krishi/iti-courses' },
      { id: 'academy', icon: '📱', title_key: 'feat_academy', desc_key: 'feat_academy_desc', color: '#3b82f6', path: '/krishi/academy' },
    ]
  },
  {
    id: 'governance',
    title_key: 'cat_governance',
    color: '#64748b',
    features: [
      { id: '712-utara', icon: '📜', title_key: 'feat_712-utara', desc_key: 'feat_712-utara_desc', color: '#64748b', path: '/krishi/712-utara' },
      { id: 'legal-aid', icon: '⚖️', title_key: 'feat_legal-aid', desc_key: 'feat_legal-aid_desc', color: '#64748b', path: '/krishi/legal-aid' },
      { id: 'gram-panchayat', icon: '📋', title_key: 'feat_gram-panchayat', desc_key: 'feat_gram-panchayat_desc', color: '#64748b', path: '/krishi/gram-panchayat' },
      { id: 'voter-id', icon: '🗳️', title_key: 'feat_voter-id', desc_key: 'feat_voter-id_desc', color: '#64748b', path: '/krishi/voter-id' },
      { id: 'pmay-status', icon: '🏠', title_key: 'feat_pmay-status', desc_key: 'feat_pmay-status_desc', color: '#64748b', path: '/krishi/pmay-status' },
      { id: 'schemes', icon: '🏛️', title_key: 'feat_schemes', desc_key: 'feat_schemes_desc', color: '#64748b', path: '/krishi/schemes' },
    ]
  },
  {
    id: 'mobility',
    title_key: 'cat_mobility',
    color: '#0ea5e9',
    features: [
      { id: 'bus-tracker', icon: '🚌', title_key: 'feat_bus-tracker', desc_key: 'feat_bus-tracker_desc', color: '#0ea5e9', path: '/krishi/bus-tracker' },
      { id: 'rural-auto', icon: '🛺', title_key: 'feat_rural-auto', desc_key: 'feat_rural-auto_desc', color: '#0ea5e9', path: '/krishi/rural-auto' },
      { id: 'bike-taxi', icon: '🏍️', title_key: 'feat_bike-taxi', desc_key: 'feat_bike-taxi_desc', color: '#0ea5e9', path: '/krishi/bike-taxi' },
      { id: 'vehicle-rental', icon: '🚗', title_key: 'feat_vehicle-rental', desc_key: 'feat_vehicle-rental_desc', color: '#0ea5e9', path: '/krishi/vehicle-rental' },
      { id: 'transport', icon: '🚚', title_key: 'feat_transport', desc_key: 'feat_transport_desc', color: '#0ea5e9', path: '/krishi/transport' },
    ]
  },
  {
    id: 'commerce',
    title_key: 'cat_commerce',
    color: '#d946ef',
    features: [
      { id: 'handcrafts', icon: '🎨', title_key: 'feat_handcrafts', desc_key: 'feat_handcrafts_desc', color: '#d946ef', path: '/krishi/handcrafts' },
      { id: 'exotic-produce', icon: '🥭', title_key: 'feat_exotic-produce', desc_key: 'feat_exotic-produce_desc', color: '#d946ef', path: '/krishi/exotic-produce' },
      { id: 'aquaculture', icon: '🐟', title_key: 'feat_aquaculture', desc_key: 'feat_aquaculture_desc', color: '#d946ef', path: '/krishi/aquaculture' },
      { id: 'forest-products', icon: '🍯', title_key: 'feat_forest-products', desc_key: 'feat_forest-products_desc', color: '#d946ef', path: '/krishi/forest-products' },
      { id: 'agri-waste', icon: '♻️', title_key: 'feat_agri-waste', desc_key: 'feat_agri-waste_desc', color: '#d946ef', path: '/krishi/agri-waste' },
      { id: 'bazaar', icon: '🛒', title_key: 'feat_bazaar', desc_key: 'feat_bazaar_desc', color: '#d946ef', path: '/krishi/bazaar' },
      { id: 'sell', icon: '👨‍🌾', title_key: 'feat_sell', desc_key: 'feat_sell_desc', color: '#d946ef', path: '/krishi/sell' },
      { id: 'store', icon: '📦', title_key: 'feat_store', desc_key: 'feat_store_desc', color: '#d946ef', path: '/krishi/store' },
    ]
  },
  {
    id: 'smart-tech',
    title_key: 'cat_smart_tech',
    color: '#14b8a6',
    features: [
      { id: 'ivr-service', icon: '📻', title_key: 'feat_ivr-service', desc_key: 'feat_ivr-service_desc', color: '#14b8a6', path: '/krishi/ivr-service' },
      { id: 'whatsapp-bot', icon: '📲', title_key: 'feat_whatsapp-bot', desc_key: 'feat_whatsapp-bot_desc', color: '#14b8a6', path: '/krishi/whatsapp-bot' },
      { id: 'field-mapping', icon: '🗺️', title_key: 'feat_field-mapping', desc_key: 'feat_field-mapping_desc', color: '#14b8a6', path: '/krishi/field-mapping' },
      { id: 'satellite-crop', icon: '📡', title_key: 'feat_satellite-crop', desc_key: 'feat_satellite-crop_desc', color: '#14b8a6', path: '/krishi/satellite-crop' },
      { id: 'chatbot', icon: '🤖', title_key: 'feat_chatbot', desc_key: 'feat_chatbot_desc', color: '#14b8a6', path: '/krishi/chatbot' },
      { id: 'insurance', icon: '🛡️', title_key: 'feat_insurance', desc_key: 'feat_insurance_desc', color: '#14b8a6', path: '/krishi/insurance' },
    ]
  },
  {
    id: 'women-empowerment',
    title_key: 'cat_women',
    color: '#ec4899',
    features: [
      { id: 'shg-food', icon: '👩‍🍳', title_key: 'feat_shg-food', desc_key: 'feat_shg-food_desc', color: '#ec4899', path: '/krishi/shg-food' },
      { id: 'tailoring', icon: '🧵', title_key: 'feat_tailoring', desc_key: 'feat_tailoring_desc', color: '#ec4899', path: '/krishi/tailoring' },
      { id: 'floriculture', icon: '🌼', title_key: 'feat_floriculture', desc_key: 'feat_floriculture_desc', color: '#ec4899', path: '/krishi/floriculture' },
      { id: 'shg-training', icon: '📖', title_key: 'feat_shg-training', desc_key: 'feat_shg-training_desc', color: '#ec4899', path: '/krishi/shg-training' },
      { id: 'forum', icon: '💬', title_key: 'feat_forum', desc_key: 'feat_forum_desc', color: '#ec4899', path: '/krishi/forum' },
      { id: 'services', icon: '🔧', title_key: 'feat_services', desc_key: 'feat_services_desc', color: '#ec4899', path: '/krishi/services' },
    ]
  },
  {
    id: 'post-harvest',
    title_key: 'cat_post_harvest',
    color: '#fbbf24',
    features: [
      { id: 'food-processing', icon: '🏭', title_key: 'feat_food-processing', desc_key: 'feat_food-processing_desc', color: '#fbbf24', path: '/krishi/food-processing' },
      { id: 'packaging', icon: '📦', title_key: 'feat_packaging', desc_key: 'feat_packaging_desc', color: '#fbbf24', path: '/krishi/packaging' },
      { id: 'fssai', icon: '🧪', title_key: 'feat_fssai', desc_key: 'feat_fssai_desc', color: '#fbbf24', path: '/krishi/fssai' },
      { id: 'agri-processing', icon: '🍷', title_key: 'feat_agri-processing', desc_key: 'feat_agri-processing_desc', color: '#fbbf24', path: '/krishi/agri-processing' },
      { id: 'warehouse-receipt', icon: '🌾', title_key: 'feat_warehouse-receipt', desc_key: 'feat_warehouse-receipt_desc', color: '#fbbf24', path: '/krishi/warehouse-receipt' },
      { id: 'commodity-alerts', icon: '📊', title_key: 'feat_commodity-alerts', desc_key: 'feat_commodity-alerts_desc', color: '#fbbf24', path: '/krishi/commodity-alerts' },
    ]
  },
  {
    id: 'export',
    title_key: 'cat_export',
    color: '#0284c7',
    features: [
      { id: 'export-checker', icon: '🌐', title_key: 'feat_export-checker', desc_key: 'feat_export-checker_desc', color: '#0284c7', path: '/krishi/export-checker' },
      { id: 'apeda', icon: '📋', title_key: 'feat_apeda', desc_key: 'feat_apeda_desc', color: '#0284c7', path: '/krishi/apeda' },
      { id: 'export-buyer', icon: '🚢', title_key: 'feat_export-buyer', desc_key: 'feat_export-buyer_desc', color: '#0284c7', path: '/krishi/export-buyer' },
      { id: 'organic-cert', icon: '📜', title_key: 'feat_organic-cert', desc_key: 'feat_organic-cert_desc', color: '#0284c7', path: '/krishi/organic-cert' },
      { id: 'gi-tag', icon: '🏷️', title_key: 'feat_gi-tag', desc_key: 'feat_gi-tag_desc', color: '#0284c7', path: '/krishi/gi-tag' },
    ]
  },
  {
    id: 'sustainable',
    title_key: 'cat_sustainable',
    color: '#16a34a',
    features: [
      { id: 'vermicompost', icon: '🪱', title_key: 'feat_vermicompost', desc_key: 'feat_vermicompost_desc', color: '#16a34a', path: '/krishi/vermicompost' },
      { id: 'beekeeping', icon: '🐝', title_key: 'feat_beekeeping', desc_key: 'feat_beekeeping_desc', color: '#16a34a', path: '/krishi/beekeeping' },
      { id: 'carbon-credit', icon: '☀️', title_key: 'feat_carbon-credit', desc_key: 'feat_carbon-credit_desc', color: '#16a34a', path: '/krishi/carbon-credit' },
      { id: 'tree-tracker', icon: '🌳', title_key: 'feat_tree-tracker', desc_key: 'feat_tree-tracker_desc', color: '#16a34a', path: '/krishi/tree-tracker' },
      { id: 'biogas', icon: '💨', title_key: 'feat_biogas', desc_key: 'feat_biogas_desc', color: '#16a34a', path: '/krishi/biogas' },
      { id: 'alt-protein', icon: '🦗', title_key: 'feat_alt-protein', desc_key: 'feat_alt-protein_desc', color: '#16a34a', path: '/krishi/alt-protein' },
    ]
  },
  {
    id: 'agri-tourism',
    title_key: 'cat_agri_tourism',
    color: '#e879f9',
    features: [
      { id: 'farm-stay', icon: '🏕️', title_key: 'feat_farm-stay', desc_key: 'feat_farm-stay_desc', color: '#e879f9', path: '/krishi/farm-stay' },
      { id: 'fruit-picking', icon: '🍊', title_key: 'feat_fruit-picking', desc_key: 'feat_fruit-picking_desc', color: '#e879f9', path: '/krishi/fruit-picking' },
      { id: 'fishing-tour', icon: '🎣', title_key: 'feat_fishing-tour', desc_key: 'feat_fishing-tour_desc', color: '#e879f9', path: '/krishi/fishing-tour' },
      { id: 'dairy-visit', icon: '🐄', title_key: 'feat_dairy-visit', desc_key: 'feat_dairy-visit_desc', color: '#e879f9', path: '/krishi/dairy-visit' },
      { id: 'art-workshop', icon: '🎨', title_key: 'feat_art-workshop', desc_key: 'feat_art-workshop_desc', color: '#e879f9', path: '/krishi/art-workshop' },
      { id: 'festival-calendar', icon: '🎪', title_key: 'feat_festival-calendar', desc_key: 'feat_festival-calendar_desc', color: '#e879f9', path: '/krishi/festival-calendar' },
    ]
  },
  {
    id: 'farm-management',
    title_key: 'cat_farm_management',
    color: '#64748b',
    features: [
      { id: 'farm-diary', icon: '📒', title_key: 'feat_farm-diary', desc_key: 'feat_farm-diary_desc', color: '#64748b', path: '/krishi/farm-diary' },
      { id: 'expense-tracker', icon: '💸', title_key: 'feat_expense-tracker', desc_key: 'feat_expense-tracker_desc', color: '#64748b', path: '/krishi/expense-tracker' },
      { id: 'farm-labor', icon: '👷', title_key: 'feat_farm-labor', desc_key: 'feat_farm-labor_desc', color: '#64748b', path: '/krishi/farm-labor' },
      { id: 'land-lease', icon: '📐', title_key: 'feat_land-lease', desc_key: 'feat_land-lease_desc', color: '#64748b', path: '/krishi/land-lease' },
      { id: 'seed-bank', icon: '🌾', title_key: 'feat_seed-bank', desc_key: 'feat_seed-bank_desc', color: '#64748b', path: '/krishi/seed-bank' },
      { id: 'roi-calculator', icon: '🧮', title_key: 'feat_roi-calculator', desc_key: 'feat_roi-calculator_desc', color: '#64748b', path: '/krishi/roi-calculator' },
      { id: 'chc-connect', icon: '🗓️', title_key: 'feat_chc-connect', desc_key: 'feat_chc-connect_desc', color: '#64748b', path: '/krishi/chc-connect' },
    ]
  },
  {
    id: 'connectivity',
    title_key: 'cat_connectivity',
    color: '#06b6d4',
    features: [
      { id: 'internet-check', icon: '📶', title_key: 'feat_internet-check', desc_key: 'feat_internet-check_desc', color: '#06b6d4', path: '/krishi/internet-check' },
      { id: 'csc-locator', icon: '🖥️', title_key: 'feat_csc-locator', desc_key: 'feat_csc-locator_desc', color: '#06b6d4', path: '/krishi/csc-locator' },
      { id: 'refurbished-phones', icon: '📱', title_key: 'feat_refurbished-phones', desc_key: 'feat_refurbished-phones_desc', color: '#06b6d4', path: '/krishi/refurbished-phones' },
      { id: 'mobile-recharge', icon: '🔌', title_key: 'feat_mobile-recharge', desc_key: 'feat_mobile-recharge_desc', color: '#06b6d4', path: '/krishi/mobile-recharge' },
      { id: 'digital-locker', icon: '📧', title_key: 'feat_digital-locker', desc_key: 'feat_digital-locker_desc', color: '#06b6d4', path: '/krishi/digital-locker' },
      { id: 'print-demand', icon: '🖨️', title_key: 'feat_print-demand', desc_key: 'feat_print-demand_desc', color: '#06b6d4', path: '/krishi/print-demand' },
    ]
  },
  {
    id: 'social-services',
    title_key: 'cat_social_services',
    color: '#f43f5e',
    features: [
      { id: 'rural-matrimony', icon: '💍', title_key: 'feat_rural-matrimony', desc_key: 'feat_rural-matrimony_desc', color: '#f43f5e', path: '/krishi/rural-matrimony' },
      { id: 'temple-services', icon: '🕌', title_key: 'feat_temple-services', desc_key: 'feat_temple-services_desc', color: '#f43f5e', path: '/krishi/temple-services' },
      { id: 'event-planners', icon: '🎉', title_key: 'feat_event-planners', desc_key: 'feat_event-planners_desc', color: '#f43f5e', path: '/krishi/event-planners' },
      { id: 'local-news', icon: '📰', title_key: 'feat_local-news', desc_key: 'feat_local-news_desc', color: '#f43f5e', path: '/krishi/local-news' },
      { id: 'death-services', icon: '☠️', title_key: 'feat_death-services', desc_key: 'feat_death-services_desc', color: '#f43f5e', path: '/krishi/death-services' },
      { id: 'animal-rescue', icon: '🐾', title_key: 'feat_animal-rescue', desc_key: 'feat_animal-rescue_desc', color: '#f43f5e', path: '/krishi/animal-rescue' },
      { id: 'rural-helpline', icon: '📞', title_key: 'feat_rural-helpline', desc_key: 'feat_rural-helpline_desc', color: '#f43f5e', path: '/krishi/rural-helpline' },
    ]
  },
  {
    id: 'entrepreneurship',
    title_key: 'cat_entrepreneurship',
    color: '#8b5cf6',
    features: [
      { id: 'kirana-digital', icon: '🏪', title_key: 'feat_kirana-digital', desc_key: 'feat_kirana-digital_desc', color: '#8b5cf6', path: '/krishi/kirana-digital' },
      { id: 'fmcg-distrib', icon: '🧊', title_key: 'feat_fmcg-distrib', desc_key: 'feat_fmcg-distrib_desc', color: '#8b5cf6', path: '/krishi/fmcg-distrib' },
      { id: 'petrol-pump', icon: '⛽', title_key: 'feat_petrol-pump', desc_key: 'feat_petrol-pump_desc', color: '#8b5cf6', path: '/krishi/petrol-pump' },
      { id: 'micro-atm', icon: '🏦', title_key: 'feat_micro-atm', desc_key: 'feat_micro-atm_desc', color: '#8b5cf6', path: '/krishi/micro-atm' },
      { id: 'tuition-tutor', icon: '🧑‍🏫', title_key: 'feat_tuition-tutor', desc_key: 'feat_tuition-tutor_desc', color: '#8b5cf6', path: '/krishi/tuition-tutor' },
      { id: 'timber-market', icon: '🪵', title_key: 'feat_timber-market', desc_key: 'feat_timber-market_desc', color: '#8b5cf6', path: '/krishi/timber-market' },
      { id: 'welding', icon: '🔨', title_key: 'feat_welding', desc_key: 'feat_welding_desc', color: '#8b5cf6', path: '/krishi/welding' },
    ]
  },
];

export const TOP_FEATURES = [
  { id: 'farm-diary', icon: '📒', title_key: 'feat_farm-diary', desc_key: 'feat_farm-diary_desc', color: '#64748b', path: '/krishi/farm-diary' },
  { id: 'food-processing', icon: '🏭', title_key: 'feat_food-processing', desc_key: 'feat_food-processing_desc', color: '#fbbf24', path: '/krishi/food-processing' },
  { id: 'farm-labor', icon: '👷', title_key: 'feat_farm-labor', desc_key: 'feat_farm-labor_desc', color: '#64748b', path: '/krishi/farm-labor' },
  { id: 'warehouse-receipt', icon: '🌾', title_key: 'feat_warehouse-receipt', desc_key: 'feat_warehouse-receipt_desc', color: '#fbbf24', path: '/krishi/warehouse-receipt' },
  { id: 'farm-stay', icon: '🏕️', title_key: 'feat_farm-stay', desc_key: 'feat_farm-stay_desc', color: '#e879f9', path: '/krishi/farm-stay' },
  { id: 'rural-matrimony', icon: '💍', title_key: 'feat_rural-matrimony', desc_key: 'feat_rural-matrimony_desc', color: '#f43f5e', path: '/krishi/rural-matrimony' },
  { id: 'land-lease', icon: '📐', title_key: 'feat_land-lease', desc_key: 'feat_land-lease_desc', color: '#64748b', path: '/krishi/land-lease' },
  { id: 'vermicompost', icon: '🪱', title_key: 'feat_vermicompost', desc_key: 'feat_vermicompost_desc', color: '#16a34a', path: '/krishi/vermicompost' },
  { id: 'organic-cert', icon: '📜', title_key: 'feat_organic-cert', desc_key: 'feat_organic-cert_desc', color: '#0284c7', path: '/krishi/organic-cert' },
  { id: 'kirana-digital', icon: '🏪', title_key: 'feat_kirana-digital', desc_key: 'feat_kirana-digital_desc', color: '#8b5cf6', path: '/krishi/kirana-digital' },
  { id: 'carbon-credit', icon: '☀️', title_key: 'feat_carbon-credit', desc_key: 'feat_carbon-credit_desc', color: '#16a34a', path: '/krishi/carbon-credit' },
  { id: 'gi-tag', icon: '🏷️', title_key: 'feat_gi-tag', desc_key: 'feat_gi-tag_desc', color: '#0284c7', path: '/krishi/gi-tag' },
  { id: 'digital-locker', icon: '📧', title_key: 'feat_digital-locker', desc_key: 'feat_digital-locker_desc', color: '#06b6d4', path: '/krishi/digital-locker' },
  { id: 'roi-calculator', icon: '🧮', title_key: 'feat_roi-calculator', desc_key: 'feat_roi-calculator_desc', color: '#64748b', path: '/krishi/roi-calculator' },
  { id: 'internet-check', icon: '📶', title_key: 'feat_internet-check', desc_key: 'feat_internet-check_desc', color: '#06b6d4', path: '/krishi/internet-check' },
];
