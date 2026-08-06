// ═══════════════════════════════════════════════════════════════════════
// Slot Generator — 7-Day Rolling Appointment Calendar
// ═══════════════════════════════════════════════════════════════════════
// Generates realistic time slots for APPOINTMENT and HYBRID shops.
// Each shop gets a 7-day rolling calendar with category-appropriate
// slot durations, service names, provider names, and realistic status mix.
// ═══════════════════════════════════════════════════════════════════════

const { generatePersonName, pickRandom } = require('./pune-data');

/**
 * Category-specific service configurations.
 * Each category maps to: services offered, slot duration, provider titles.
 */
const SERVICE_CONFIGS = {
  // ─── APPOINTMENT CATEGORIES ────────────────────────────────────────
  SALON_SPA: {
    services: [
      { name: 'Haircut – Men', price: 25000, duration: 30 },
      { name: 'Haircut – Women', price: 50000, duration: 45 },
      { name: 'Hair Color & Highlights', price: 150000, duration: 90 },
      { name: 'Facial – Gold/Diamond', price: 120000, duration: 60 },
      { name: 'Full Body Massage – 60 min', price: 200000, duration: 60 },
      { name: 'Manicure & Pedicure Combo', price: 80000, duration: 60 },
      { name: 'Bridal Makeup Package', price: 500000, duration: 120 },
      { name: 'Threading – Eyebrow', price: 5000, duration: 15 },
      { name: 'Waxing – Full Arms', price: 40000, duration: 30 },
      { name: 'Beard Trim & Styling', price: 20000, duration: 20 },
    ],
    providerTitles: ['Senior Stylist', 'Hair Expert', 'Skin Specialist', 'Massage Therapist', 'Beauty Consultant'],
    slotsPerDay: 10,
  },

  MEDICAL_CLINIC: {
    services: [
      { name: 'General Consultation', price: 50000, duration: 15 },
      { name: 'Follow-up Visit', price: 30000, duration: 10 },
      { name: 'Health Checkup – Basic', price: 150000, duration: 30 },
      { name: 'Health Checkup – Comprehensive', price: 350000, duration: 45 },
      { name: 'Vaccination – Flu Shot', price: 80000, duration: 15 },
      { name: 'Blood Pressure Monitoring', price: 20000, duration: 10 },
      { name: 'Diabetes Screening', price: 60000, duration: 20 },
      { name: 'ECG Test', price: 40000, duration: 15 },
      { name: 'Pediatric Consultation', price: 60000, duration: 20 },
      { name: 'Prescription Renewal', price: 25000, duration: 10 },
    ],
    providerTitles: ['General Physician', 'MBBS, MD', 'Senior Doctor', 'Consulting Physician'],
    slotsPerDay: 16,
  },

  DENTAL_CLINIC: {
    services: [
      { name: 'Dental Check-up', price: 50000, duration: 20 },
      { name: 'Teeth Cleaning & Scaling', price: 120000, duration: 30 },
      { name: 'Tooth Extraction – Simple', price: 80000, duration: 30 },
      { name: 'Root Canal Treatment', price: 500000, duration: 60 },
      { name: 'Dental Filling – Composite', price: 150000, duration: 30 },
      { name: 'Teeth Whitening', price: 300000, duration: 45 },
      { name: 'Braces Consultation', price: 100000, duration: 30 },
      { name: 'Crown / Cap Fitting', price: 400000, duration: 45 },
      { name: 'X-Ray – Dental OPG', price: 40000, duration: 15 },
      { name: 'Wisdom Tooth Assessment', price: 60000, duration: 20 },
    ],
    providerTitles: ['BDS, MDS', 'Dental Surgeon', 'Orthodontist', 'Endodontist'],
    slotsPerDay: 12,
  },

  PATHOLOGY_DIAGNOSTIC_LAB: {
    services: [
      { name: 'Complete Blood Count (CBC)', price: 35000, duration: 15 },
      { name: 'Lipid Profile', price: 60000, duration: 15 },
      { name: 'Thyroid Profile (T3, T4, TSH)', price: 80000, duration: 15 },
      { name: 'Blood Sugar – Fasting', price: 15000, duration: 10 },
      { name: 'HbA1c Test', price: 50000, duration: 15 },
      { name: 'Liver Function Test (LFT)', price: 60000, duration: 15 },
      { name: 'Kidney Function Test (KFT)', price: 55000, duration: 15 },
      { name: 'Urine Routine & Microscopy', price: 20000, duration: 10 },
      { name: 'Vitamin D Test', price: 80000, duration: 15 },
      { name: 'Full Body Checkup Package', price: 250000, duration: 30 },
    ],
    providerTitles: ['Lab Technician', 'Pathologist', 'Phlebotomist', 'Senior Technician'],
    slotsPerDay: 20,
  },

  PHYSIOTHERAPY_REHAB: {
    services: [
      { name: 'Initial Assessment', price: 80000, duration: 45 },
      { name: 'Back Pain Therapy Session', price: 60000, duration: 30 },
      { name: 'Knee Rehabilitation', price: 60000, duration: 30 },
      { name: 'Neck & Shoulder Therapy', price: 50000, duration: 30 },
      { name: 'Post-Surgery Rehab Session', price: 80000, duration: 45 },
      { name: 'Sports Injury Treatment', price: 70000, duration: 30 },
      { name: 'Electrotherapy (TENS/IFT)', price: 40000, duration: 20 },
      { name: 'Ultrasound Therapy', price: 35000, duration: 20 },
      { name: 'Dry Needling Session', price: 60000, duration: 30 },
      { name: 'Home Visit – Physio', price: 120000, duration: 60 },
    ],
    providerTitles: ['BPT, MPT', 'Senior Physiotherapist', 'Sports Physio', 'Rehabilitation Specialist'],
    slotsPerDay: 10,
  },

  AYURVEDA_HOMEOPATHY: {
    services: [
      { name: 'Ayurvedic Consultation', price: 50000, duration: 30 },
      { name: 'Homeopathic Consultation', price: 40000, duration: 20 },
      { name: 'Panchakarma – Abhyanga', price: 150000, duration: 60 },
      { name: 'Shirodhara Treatment', price: 200000, duration: 45 },
      { name: 'Nasya Therapy', price: 80000, duration: 30 },
      { name: 'Pulse Diagnosis (Nadi Pariksha)', price: 30000, duration: 15 },
      { name: 'Kati Basti – Back Pain', price: 120000, duration: 45 },
      { name: 'Herbal Steam Bath', price: 80000, duration: 30 },
      { name: 'Diet & Lifestyle Planning', price: 60000, duration: 30 },
      { name: 'Follow-up Consultation', price: 25000, duration: 15 },
    ],
    providerTitles: ['BAMS, MD', 'Vaidya', 'Homeopathic Doctor', 'Ayurveda Practitioner'],
    slotsPerDay: 10,
  },

  VETERINARY_CLINIC: {
    services: [
      { name: 'General Pet Checkup', price: 50000, duration: 20 },
      { name: 'Vaccination – Dog/Cat', price: 80000, duration: 15 },
      { name: 'Deworming Treatment', price: 30000, duration: 10 },
      { name: 'Dental Cleaning – Pet', price: 200000, duration: 45 },
      { name: 'Spay/Neuter Consultation', price: 80000, duration: 20 },
      { name: 'Skin Allergy Treatment', price: 60000, duration: 20 },
      { name: 'X-Ray – Pet', price: 100000, duration: 20 },
      { name: 'Blood Test – Pet', price: 80000, duration: 15 },
      { name: 'Emergency Visit', price: 150000, duration: 30 },
      { name: 'Grooming Session', price: 60000, duration: 45 },
    ],
    providerTitles: ['BVSc, MVSc', 'Veterinary Surgeon', 'Animal Doctor', 'Pet Specialist'],
    slotsPerDay: 10,
  },

  COACHING_TUITION: {
    services: [
      { name: 'Maths Tuition – Class 10', price: 50000, duration: 60 },
      { name: 'Science Tuition – Class 10', price: 50000, duration: 60 },
      { name: 'English Speaking Course', price: 40000, duration: 45 },
      { name: 'JEE/NEET Foundation – Demo', price: 0, duration: 60 },
      { name: 'SSC/Banking Exam Coaching', price: 30000, duration: 60 },
      { name: 'Spoken Marathi Class', price: 20000, duration: 45 },
      { name: 'Computer Basics Course', price: 25000, duration: 60 },
      { name: 'Guitar/Keyboard Lesson', price: 40000, duration: 45 },
      { name: 'Drawing & Painting Class', price: 30000, duration: 60 },
      { name: 'Yoga & Meditation Class', price: 20000, duration: 45 },
    ],
    providerTitles: ['Senior Faculty', 'Subject Expert', 'Trainer', 'Instructor', 'Guru'],
    slotsPerDay: 8,
  },

  PHOTOGRAPHY_STUDIO: {
    services: [
      { name: 'Passport Photo Session', price: 10000, duration: 15 },
      { name: 'Portrait Photography', price: 150000, duration: 30 },
      { name: 'Family Photo Session', price: 250000, duration: 45 },
      { name: 'Product Photography (10 items)', price: 300000, duration: 60 },
      { name: 'Wedding Photography – Full Day', price: 2500000, duration: 480 },
      { name: 'Pre-Wedding Shoot', price: 1500000, duration: 180 },
      { name: 'Baby/Maternity Shoot', price: 500000, duration: 60 },
      { name: 'Corporate Headshots', price: 200000, duration: 30 },
      { name: 'Event Photography – 4 Hours', price: 800000, duration: 240 },
      { name: 'Photo Editing & Retouching (10 photos)', price: 100000, duration: 60 },
    ],
    providerTitles: ['Senior Photographer', 'Creative Director', 'Photo Editor', 'Studio Manager'],
    slotsPerDay: 6,
  },

  CA_LEGAL_SERVICES: {
    services: [
      { name: 'ITR Filing – Individual', price: 100000, duration: 30 },
      { name: 'ITR Filing – Business', price: 250000, duration: 45 },
      { name: 'GST Registration', price: 200000, duration: 30 },
      { name: 'GST Return Filing – Monthly', price: 150000, duration: 30 },
      { name: 'Company Registration – Pvt Ltd', price: 800000, duration: 60 },
      { name: 'Legal Consultation', price: 100000, duration: 30 },
      { name: 'Property Registration Advice', price: 150000, duration: 30 },
      { name: 'Trademark Registration', price: 500000, duration: 45 },
      { name: 'Audit & Compliance Review', price: 300000, duration: 60 },
      { name: 'Will / Succession Planning', price: 200000, duration: 45 },
    ],
    providerTitles: ['CA', 'CS', 'Advocate', 'Tax Consultant', 'Legal Advisor'],
    slotsPerDay: 8,
  },

  INSURANCE_FINANCIAL: {
    services: [
      { name: 'Health Insurance Consultation', price: 0, duration: 30 },
      { name: 'Term Life Insurance Planning', price: 0, duration: 30 },
      { name: 'Mutual Fund SIP Advisory', price: 50000, duration: 30 },
      { name: 'Car/Bike Insurance Renewal', price: 0, duration: 20 },
      { name: 'Loan Pre-Approval Consultation', price: 0, duration: 30 },
      { name: 'Tax Saving Investment Plan', price: 50000, duration: 30 },
      { name: 'Retirement Planning Session', price: 100000, duration: 45 },
      { name: 'NPS Account Opening', price: 0, duration: 20 },
      { name: 'Fixed Deposit Advisory', price: 0, duration: 15 },
      { name: 'Portfolio Review Meeting', price: 100000, duration: 45 },
    ],
    providerTitles: ['Financial Advisor', 'Insurance Agent', 'MFD', 'Investment Planner'],
    slotsPerDay: 8,
  },

  PEST_CONTROL: {
    services: [
      { name: 'General Pest Control – 1BHK', price: 100000, duration: 60 },
      { name: 'General Pest Control – 2BHK', price: 150000, duration: 90 },
      { name: 'Termite Treatment – Per Room', price: 200000, duration: 120 },
      { name: 'Cockroach Gel Treatment', price: 80000, duration: 45 },
      { name: 'Bed Bug Treatment', price: 200000, duration: 90 },
      { name: 'Mosquito Fogging', price: 80000, duration: 30 },
      { name: 'Rat Control – Baiting', price: 100000, duration: 45 },
      { name: 'Wood Borer Treatment', price: 150000, duration: 60 },
      { name: 'Commercial Pest Control', price: 300000, duration: 120 },
      { name: 'Inspection & Assessment – Free', price: 0, duration: 30 },
    ],
    providerTitles: ['Pest Control Technician', 'Senior Technician', 'Fumigation Expert'],
    slotsPerDay: 6,
  },

  PACKERS_MOVERS: {
    services: [
      { name: 'Pre-Move Survey – Free', price: 0, duration: 30 },
      { name: 'Local Shifting – 1BHK', price: 500000, duration: 240 },
      { name: 'Local Shifting – 2BHK', price: 800000, duration: 360 },
      { name: 'Local Shifting – 3BHK', price: 1200000, duration: 480 },
      { name: 'Intercity Move – Estimate', price: 0, duration: 30 },
      { name: 'Office Relocation – Small', price: 1500000, duration: 480 },
      { name: 'Vehicle Transport – Bike', price: 300000, duration: 30 },
      { name: 'Vehicle Transport – Car', price: 600000, duration: 30 },
      { name: 'Storage – Per Month (50 sqft)', price: 300000, duration: 15 },
      { name: 'Packing Material Only', price: 200000, duration: 30 },
    ],
    providerTitles: ['Moving Coordinator', 'Logistics Manager', 'Packing Specialist'],
    slotsPerDay: 4,
  },

  TRAVEL_AGENT: {
    services: [
      { name: 'Domestic Flight Booking', price: 20000, duration: 20 },
      { name: 'International Flight Booking', price: 50000, duration: 30 },
      { name: 'Hotel Reservation', price: 20000, duration: 15 },
      { name: 'Goa Package – 3N/4D', price: 1500000, duration: 30 },
      { name: 'Kerala Package – 5N/6D', price: 2500000, duration: 30 },
      { name: 'Visa Application Assistance', price: 200000, duration: 45 },
      { name: 'Passport Application Help', price: 50000, duration: 30 },
      { name: 'Travel Insurance', price: 30000, duration: 15 },
      { name: 'Group Tour Planning', price: 0, duration: 45 },
      { name: 'Customized Itinerary', price: 100000, duration: 30 },
    ],
    providerTitles: ['Travel Consultant', 'Tour Planner', 'Visa Expert'],
    slotsPerDay: 8,
  },

  LAUNDRY_DRYCLEAN: {
    services: [
      { name: 'Wash & Fold – per kg', price: 6000, duration: 15 },
      { name: 'Wash & Iron – per kg', price: 10000, duration: 15 },
      { name: 'Dry Clean – Suit (2-piece)', price: 30000, duration: 15 },
      { name: 'Dry Clean – Saree', price: 20000, duration: 15 },
      { name: 'Dry Clean – Blanket/Quilt', price: 40000, duration: 15 },
      { name: 'Ironing – per piece', price: 1500, duration: 5 },
      { name: 'Stain Removal – Special', price: 15000, duration: 15 },
      { name: 'Curtain Cleaning (per panel)', price: 20000, duration: 15 },
      { name: 'Shoe Cleaning & Polish', price: 15000, duration: 15 },
      { name: 'Premium Fabric Care – Silk/Wool', price: 25000, duration: 15 },
    ],
    providerTitles: ['Laundry Expert', 'Dry Clean Specialist', 'Garment Care Expert'],
    slotsPerDay: 12,
  },

  COBBLER_SHOE_REPAIR: {
    services: [
      { name: 'Sole Replacement – Shoes', price: 30000, duration: 30 },
      { name: 'Heel Repair', price: 15000, duration: 20 },
      { name: 'Shoe Polish & Shine', price: 5000, duration: 10 },
      { name: 'Zipper Replacement – Bag/Boot', price: 20000, duration: 20 },
      { name: 'Stitch Repair', price: 10000, duration: 15 },
      { name: 'Belt Shortening', price: 10000, duration: 10 },
      { name: 'Color Restoration – Leather', price: 25000, duration: 30 },
      { name: 'Sandal Strap Repair', price: 10000, duration: 15 },
      { name: 'Shoe Stretching', price: 15000, duration: 20 },
      { name: 'Complete Shoe Restoration', price: 50000, duration: 45 },
    ],
    providerTitles: ['Master Cobbler', 'Shoe Repair Specialist', 'Leather Worker'],
    slotsPerDay: 10,
  },

  KEY_LOCKSMITH: {
    services: [
      { name: 'Duplicate Key – Standard', price: 5000, duration: 10 },
      { name: 'Duplicate Key – Dimple/Security', price: 15000, duration: 15 },
      { name: 'Car Key Duplicate', price: 50000, duration: 20 },
      { name: 'Lock Installation – Mortise', price: 30000, duration: 30 },
      { name: 'Lock Repair', price: 20000, duration: 20 },
      { name: 'Digital Lock Installation', price: 80000, duration: 45 },
      { name: 'Emergency Lockout Service', price: 40000, duration: 30 },
      { name: 'Safe/Almirah Lock Change', price: 30000, duration: 25 },
      { name: 'Padlock – Heavy Duty Sale', price: 25000, duration: 5 },
      { name: 'Master Key System Setup', price: 60000, duration: 60 },
    ],
    providerTitles: ['Master Locksmith', 'Key Expert', 'Security Specialist'],
    slotsPerDay: 12,
  },

  EVENT_WEDDING_PLANNER: {
    services: [
      { name: 'Wedding Planning Consultation', price: 0, duration: 60 },
      { name: 'Birthday Party Planning', price: 200000, duration: 45 },
      { name: 'Corporate Event – Planning', price: 0, duration: 60 },
      { name: 'Mehendi Ceremony Setup', price: 500000, duration: 60 },
      { name: 'Sangeet Night Setup', price: 800000, duration: 60 },
      { name: 'Mandap Decoration – Standard', price: 1500000, duration: 60 },
      { name: 'Venue Scouting Visit', price: 0, duration: 120 },
      { name: 'Catering Menu Tasting', price: 100000, duration: 60 },
      { name: 'DJ & Sound System Booking', price: 300000, duration: 30 },
      { name: 'Engagement Ring Ceremony', price: 300000, duration: 45 },
    ],
    providerTitles: ['Event Coordinator', 'Wedding Planner', 'Decoration Specialist', 'Creative Head'],
    slotsPerDay: 4,
  },

  COURIER_LOGISTICS: {
    services: [
      { name: 'Same-Day Delivery – Within City', price: 10000, duration: 10 },
      { name: 'Next-Day Delivery – State', price: 8000, duration: 10 },
      { name: 'Express Courier – National', price: 15000, duration: 10 },
      { name: 'International Courier – 500g', price: 120000, duration: 15 },
      { name: 'Document Courier – Local', price: 5000, duration: 10 },
      { name: 'Bulk Shipment Pickup', price: 0, duration: 20 },
      { name: 'Fragile Item Packing', price: 10000, duration: 15 },
      { name: 'COD Delivery Setup', price: 5000, duration: 10 },
      { name: 'Return Pickup Service', price: 8000, duration: 10 },
      { name: 'Tracking & Status Check', price: 0, duration: 5 },
    ],
    providerTitles: ['Delivery Coordinator', 'Logistics Manager', 'Courier Executive'],
    slotsPerDay: 16,
  },

  // ─── HYBRID CATEGORIES (services portion) ─────────────────────────
  RESTAURANT: {
    services: [
      { name: 'Table Reservation – 2 Pax', price: 0, duration: 90 },
      { name: 'Table Reservation – 4 Pax', price: 0, duration: 90 },
      { name: 'Private Dining Room – 8 Pax', price: 200000, duration: 120 },
      { name: 'Birthday Party Booking', price: 500000, duration: 180 },
      { name: 'Catering Order Consultation', price: 0, duration: 30 },
    ],
    providerTitles: ['Host', 'Restaurant Manager', 'Maître d\''],
    slotsPerDay: 8,
  },

  TIFFIN_CATERING: {
    services: [
      { name: 'Menu Consultation – Catering', price: 0, duration: 30 },
      { name: 'Tasting Session Booking', price: 50000, duration: 45 },
      { name: 'Event Catering Consultation', price: 0, duration: 30 },
    ],
    providerTitles: ['Head Chef', 'Catering Manager'],
    slotsPerDay: 4,
  },

  TEA_COFFEE_CAFE: {
    services: [
      { name: 'Table Booking – Window Seat', price: 0, duration: 60 },
      { name: 'Private Space – Book Club', price: 50000, duration: 120 },
      { name: 'Coffee Tasting Workshop', price: 30000, duration: 60 },
    ],
    providerTitles: ['Barista', 'Cafe Manager'],
    slotsPerDay: 6,
  },

  OPTICAL: {
    services: [
      { name: 'Eye Test – Comprehensive', price: 50000, duration: 30 },
      { name: 'Contact Lens Fitting', price: 30000, duration: 20 },
      { name: 'Frame Adjustment – Free', price: 0, duration: 10 },
      { name: 'Lens Power Check', price: 20000, duration: 15 },
      { name: 'Children Eye Screening', price: 30000, duration: 20 },
    ],
    providerTitles: ['Optometrist', 'Eye Care Specialist', 'Optician'],
    slotsPerDay: 10,
  },

  GARAGE_AUTO: {
    services: [
      { name: 'General Service – 2 Wheeler', price: 80000, duration: 60 },
      { name: 'General Service – 4 Wheeler', price: 200000, duration: 120 },
      { name: 'Oil Change & Filter', price: 60000, duration: 30 },
      { name: 'Brake Inspection & Service', price: 80000, duration: 45 },
      { name: 'AC Gas Refill – Car', price: 150000, duration: 30 },
      { name: 'Wheel Alignment & Balancing', price: 60000, duration: 30 },
      { name: 'Battery Check & Replacement', price: 40000, duration: 20 },
      { name: 'Denting & Painting – Estimate', price: 0, duration: 30 },
    ],
    providerTitles: ['Head Mechanic', 'Auto Technician', 'Service Advisor'],
    slotsPerDay: 6,
  },

  COMPUTER_MOBILE_REPAIR: {
    services: [
      { name: 'Phone Screen Replacement', price: 150000, duration: 45 },
      { name: 'Laptop Format & OS Install', price: 80000, duration: 60 },
      { name: 'Data Recovery – HDD/SSD', price: 200000, duration: 60 },
      { name: 'Virus Removal & Cleanup', price: 50000, duration: 30 },
      { name: 'Battery Replacement – Phone', price: 80000, duration: 30 },
      { name: 'Laptop Keyboard Replacement', price: 120000, duration: 30 },
      { name: 'Motherboard Diagnosis', price: 50000, duration: 30 },
    ],
    providerTitles: ['Service Engineer', 'Mobile Technician', 'Hardware Specialist'],
    slotsPerDay: 8,
  },

  AC_APPLIANCE_REPAIR: {
    services: [
      { name: 'AC Service – Split (1 unit)', price: 60000, duration: 60 },
      { name: 'AC Installation – Split', price: 150000, duration: 120 },
      { name: 'AC Gas Refill', price: 150000, duration: 30 },
      { name: 'Washing Machine Repair', price: 80000, duration: 60 },
      { name: 'Refrigerator Repair', price: 80000, duration: 60 },
      { name: 'Microwave Repair', price: 50000, duration: 30 },
      { name: 'Geyser Service / Install', price: 60000, duration: 45 },
    ],
    providerTitles: ['AC Technician', 'Appliance Engineer', 'Service Technician'],
    slotsPerDay: 6,
  },

  WATER_PURIFIER_RO: {
    services: [
      { name: 'RO Service – Annual', price: 150000, duration: 45 },
      { name: 'Filter Replacement', price: 50000, duration: 30 },
      { name: 'New RO Installation', price: 100000, duration: 60 },
      { name: 'TDS Check & Calibration', price: 20000, duration: 15 },
      { name: 'Leak Repair', price: 30000, duration: 20 },
    ],
    providerTitles: ['RO Technician', 'Water Purifier Expert', 'Service Engineer'],
    slotsPerDay: 8,
  },

  CAR_BIKE_DEALER: {
    services: [
      { name: 'Test Drive – Car', price: 0, duration: 30 },
      { name: 'Test Drive – Bike/Scooter', price: 0, duration: 20 },
      { name: 'Insurance Renewal', price: 0, duration: 20 },
      { name: 'Service Booking – Car', price: 0, duration: 15 },
      { name: 'Loan/Finance Consultation', price: 0, duration: 30 },
    ],
    providerTitles: ['Sales Advisor', 'Showroom Manager', 'Finance Executive'],
    slotsPerDay: 8,
  },

  GYM_YOGA_STUDIO: {
    services: [
      { name: 'Personal Training Session', price: 80000, duration: 60 },
      { name: 'Group Yoga Class', price: 20000, duration: 60 },
      { name: 'Zumba/Aerobics Class', price: 20000, duration: 45 },
      { name: 'Body Composition Analysis', price: 30000, duration: 15 },
      { name: 'Diet Consultation', price: 50000, duration: 30 },
      { name: 'CrossFit Session', price: 30000, duration: 45 },
      { name: 'Trial Session – Free', price: 0, duration: 60 },
    ],
    providerTitles: ['Certified Trainer', 'Yoga Instructor', 'Fitness Coach', 'Nutritionist'],
    slotsPerDay: 10,
  },

  INTERIOR_DESIGNER: {
    services: [
      { name: 'Design Consultation – Home', price: 100000, duration: 60 },
      { name: 'Site Visit & Measurement', price: 0, duration: 90 },
      { name: '3D Rendering – Per Room', price: 300000, duration: 30 },
      { name: 'Modular Kitchen Design', price: 200000, duration: 60 },
      { name: 'Full Home Interior Package', price: 0, duration: 90 },
    ],
    providerTitles: ['Interior Designer', 'Design Consultant', 'Project Manager'],
    slotsPerDay: 4,
  },

  PRINTING_XEROX: {
    services: [
      { name: 'Design Service – Brochure', price: 50000, duration: 30 },
      { name: 'Design Service – Logo', price: 100000, duration: 60 },
      { name: 'Bulk Print Consultation', price: 0, duration: 20 },
    ],
    providerTitles: ['Print Specialist', 'Graphic Designer'],
    slotsPerDay: 8,
  },

  TAILORING_ALTERATION: {
    services: [
      { name: 'Custom Shirt Stitching', price: 40000, duration: 15 },
      { name: 'Custom Blouse Stitching', price: 30000, duration: 15 },
      { name: 'Trouser Stitching', price: 35000, duration: 15 },
      { name: 'Kurta/Kurti Stitching', price: 40000, duration: 15 },
      { name: 'Alteration – Hemming', price: 10000, duration: 10 },
      { name: 'Alteration – Waist Adjustment', price: 15000, duration: 10 },
      { name: 'Measurement & Fitting', price: 0, duration: 15 },
    ],
    providerTitles: ['Master Tailor', 'Senior Tailor', 'Alteration Expert'],
    slotsPerDay: 10,
  },
};

/**
 * Generates a 7-day rolling calendar of service slots for a shop.
 *
 * @param {string} categorySlug - The category of the shop
 * @param {string} shopId - The shop ID
 * @returns {Array} Array of service slot objects ready for Prisma create
 */
function generateSlotsForCategory(categorySlug, shopId) {
  const config = SERVICE_CONFIGS[categorySlug];
  if (!config) return [];

  const slots = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Generate 2 providers per shop
  const providers = [
    { name: generatePersonName(), title: pickRandom(config.providerTitles) },
    { name: generatePersonName(), title: pickRandom(config.providerTitles) },
  ];

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const slotDate = new Date(today);
    slotDate.setDate(slotDate.getDate() + dayOffset);

    // Skip Sundays for most categories
    if (slotDate.getDay() === 0 && !['RESTAURANT', 'SALON_SPA', 'PHARMACY'].includes(categorySlug)) {
      continue;
    }

    const provider = providers[dayOffset % providers.length];
    const slotsPerDay = Math.min(config.slotsPerDay, 16);

    // Generate slots from 09:00 to 19:00 with lunch break 13:00-14:00
    let currentHour = 9;
    let currentMinute = 0;
    let slotCount = 0;

    while (currentHour < 19 && slotCount < slotsPerDay) {
      // Lunch break
      if (currentHour === 13) {
        slots.push({
          shopId,
          serviceName: 'Lunch Break',
          serviceCategory: 'Break',
          providerName: provider.name,
          providerRole: provider.title,
          date: new Date(slotDate),
          startTime: '13:00',
          endTime: '14:00',
          durationMinutes: 60,
          pricePaise: 0,
          status: 'BREAK',
          maxCapacity: 0,
          currentBookings: 0,
        });
        currentHour = 14;
        currentMinute = 0;
        continue;
      }

      // Pick a random service for this slot
      const service = pickRandom(config.services);
      const duration = service.duration || 30;

      const startTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
      const endMinutes = currentHour * 60 + currentMinute + duration;
      const endHour = Math.floor(endMinutes / 60);
      const endMin = endMinutes % 60;

      if (endHour > 19) break;

      const endTime = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;

      // Determine slot status — mix of AVAILABLE (60%), BOOKED (30%), BUFFER (10%)
      let status;
      const rand = Math.random();
      if (dayOffset === 0 && currentHour < new Date().getHours()) {
        // Past slots today are BOOKED or completed
        status = 'BOOKED';
      } else if (rand < 0.6) {
        status = 'AVAILABLE';
      } else if (rand < 0.9) {
        status = 'BOOKED';
      } else {
        status = 'BUFFER';
      }

      // For group classes (yoga, gym), set higher capacity
      const isGroupService = service.name.toLowerCase().includes('class') ||
                             service.name.toLowerCase().includes('group') ||
                             service.name.toLowerCase().includes('zumba');
      const maxCapacity = isGroupService ? 15 : 1;

      slots.push({
        shopId,
        serviceName: service.name,
        serviceCategory: categorySlug.replace(/_/g, ' '),
        providerName: provider.name,
        providerRole: provider.title,
        date: new Date(slotDate),
        startTime,
        endTime,
        durationMinutes: duration,
        pricePaise: service.price,
        status,
        maxCapacity,
        currentBookings: status === 'BOOKED' ? (isGroupService ? Math.floor(Math.random() * 10) + 1 : 1) : 0,
      });

      // Advance time
      currentHour = endHour;
      currentMinute = endMin;
      slotCount++;
    }
  }

  return slots;
}

module.exports = {
  SERVICE_CONFIGS,
  generateSlotsForCategory,
};
