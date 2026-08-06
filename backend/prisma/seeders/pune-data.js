// ═══════════════════════════════════════════════════════════════════════
// Pune Localization Data — Real localities, landmarks, pincodes, names
// ═══════════════════════════════════════════════════════════════════════

/**
 * Real Pune localities with accurate GPS coordinates and pincodes.
 * Each entry represents a real neighborhood in Pune city.
 */
const PUNE_LOCALITIES = [
  { name: 'Kothrud', pincode: '411038', lat: 18.5074, lng: 73.8077, landmarks: ['Near MIT College', 'Opposite Paud Phata', 'Behind Dahanukar Colony'] },
  { name: 'Deccan Gymkhana', pincode: '411004', lat: 18.5167, lng: 73.8408, landmarks: ['Near Garware Bridge', 'Opposite Ferguson College', 'Behind JM Road'] },
  { name: 'Shivajinagar', pincode: '411005', lat: 18.5314, lng: 73.8446, landmarks: ['Near Shivaji Market', 'Opposite PMC Building', 'Behind District Court'] },
  { name: 'Koregaon Park', pincode: '411001', lat: 18.5362, lng: 73.8936, landmarks: ['Near Osho Ashram', 'Opposite German Bakery', 'Behind ABC Farms'] },
  { name: 'Baner', pincode: '411045', lat: 18.5590, lng: 73.7868, landmarks: ['Near Baner Road', 'Opposite Orchid School', 'Behind ICC Trade Tower'] },
  { name: 'Aundh', pincode: '411007', lat: 18.5580, lng: 73.8073, landmarks: ['Near Parihar Chowk', 'Opposite Bremen Chowk', 'Behind Aundh Chest Hospital'] },
  { name: 'Hinjewadi', pincode: '411057', lat: 18.5913, lng: 73.7389, landmarks: ['Near Rajiv Gandhi IT Park', 'Opposite Wipro Circle', 'Behind Phase 1 Gate'] },
  { name: 'Wakad', pincode: '411057', lat: 18.5972, lng: 73.7641, landmarks: ['Near Datta Mandir Chowk', 'Opposite Wakad Bridge', 'Behind Shankar Kalat Nagar'] },
  { name: 'Kharadi', pincode: '411014', lat: 18.5511, lng: 73.9406, landmarks: ['Near EON IT Park', 'Opposite World Trade Center', 'Behind Zensar IT Park'] },
  { name: 'Viman Nagar', pincode: '411014', lat: 18.5679, lng: 73.9143, landmarks: ['Near Phoenix Mall', 'Opposite Symbiosis College', 'Behind Lohegaon Airport'] },
  { name: 'Hadapsar', pincode: '411028', lat: 18.5089, lng: 73.9260, landmarks: ['Near Magarpatta City', 'Opposite Seasons Mall', 'Behind Fursungi Road'] },
  { name: 'Dhanori', pincode: '411015', lat: 18.5913, lng: 73.8987, landmarks: ['Near Dhanori Gaon', 'Opposite Tukai Darshan', 'Behind Lohegaon Cantonment'] },
  { name: 'Pimple Saudagar', pincode: '411027', lat: 18.5986, lng: 73.7987, landmarks: ['Near Shivar Garden', 'Opposite D-Mart', 'Behind Kunal Icon'] },
  { name: 'Kalyani Nagar', pincode: '411006', lat: 18.5469, lng: 73.9022, landmarks: ['Near Aga Khan Palace', 'Opposite Gold Adlabs', 'Behind Jogger Park'] },
  { name: 'Camp (MG Road)', pincode: '411001', lat: 18.5110, lng: 73.8803, landmarks: ['Near MG Road', 'Opposite Pune Station', 'Behind East Street'] },
  { name: 'Pimpri-Chinchwad', pincode: '411018', lat: 18.6279, lng: 73.7997, landmarks: ['Near Pimpri Chowk', 'Opposite PCMC Building', 'Behind Bhosari MIDC'] },
  { name: 'Bibwewadi', pincode: '411037', lat: 18.4810, lng: 73.8580, landmarks: ['Near Balaji Temple', 'Opposite Bibwewadi Corner', 'Behind Market Yard'] },
  { name: 'Warje', pincode: '411058', lat: 18.4867, lng: 73.8053, landmarks: ['Near Warje Malwadi', 'Opposite NDA Gate', 'Behind Warje Flyover'] },
  { name: 'Sinhagad Road', pincode: '411041', lat: 18.4725, lng: 73.8294, landmarks: ['Near Anand Nagar', 'Opposite Vadgaon Budruk', 'Behind Sinhagad Fort Road'] },
  { name: 'Kondhwa', pincode: '411048', lat: 18.4647, lng: 73.8943, landmarks: ['Near NIBM Road', 'Opposite Kondhwa Budruk', 'Behind Wanowrie Police Station'] },
  { name: 'Katraj', pincode: '411046', lat: 18.4543, lng: 73.8646, landmarks: ['Near Katraj Snake Park', 'Opposite Rajiv Gandhi Zoo', 'Behind Katraj Tunnel'] },
  { name: 'Bavdhan', pincode: '411021', lat: 18.5120, lng: 73.7785, landmarks: ['Near Bavdhan Budruk', 'Opposite Chandni Chowk', 'Behind Pashan Lake'] },
  { name: 'Pashan', pincode: '411021', lat: 18.5363, lng: 73.7855, landmarks: ['Near IUCAA', 'Opposite NCL Colony', 'Behind Pashan Sus Road'] },
  { name: 'Sus Road', pincode: '411021', lat: 18.5438, lng: 73.7615, landmarks: ['Near Sus Gaon', 'Opposite Lavale Phata', 'Behind Mulshi Road'] },
  { name: 'Vishrantwadi', pincode: '411015', lat: 18.5755, lng: 73.8844, landmarks: ['Near Airport Road', 'Opposite Vishrantwadi Chowk', 'Behind Military Area'] },
  { name: 'Yerawada', pincode: '411006', lat: 18.5565, lng: 73.8866, landmarks: ['Near Yerawada Jail', 'Opposite Mental Hospital', 'Behind Aga Khan Palace'] },
  { name: 'Wanowrie', pincode: '411040', lat: 18.4918, lng: 73.8920, landmarks: ['Near Wanowrie Bazaar', 'Opposite Fatima Nagar', 'Behind Ammunition Factory'] },
  { name: 'Parvati', pincode: '411009', lat: 18.4986, lng: 73.8533, landmarks: ['Near Parvati Temple', 'Opposite Parvati Paytha', 'Behind Taljai Hills'] },
  { name: 'Nigdi', pincode: '411044', lat: 18.6507, lng: 73.7686, landmarks: ['Near Nigdi Pradhikaran', 'Opposite Akurdi Station', 'Behind Thermax Chowk'] },
  { name: 'Model Colony', pincode: '411016', lat: 18.5271, lng: 73.8357, landmarks: ['Near Model Colony Road', 'Opposite Deep Bungalow Chowk', 'Behind Senapati Bapat Road'] },
];

/**
 * Common Marathi/Pune surnames for shop owners and service providers
 */
const MARATHI_SURNAMES = [
  'Patil', 'Deshmukh', 'Kulkarni', 'Joshi', 'Deshpande', 'Gokhale', 'Phadke',
  'Bhosale', 'More', 'Jadhav', 'Shinde', 'Pawar', 'Chavan', 'Kadam', 'Gaikwad',
  'Wagh', 'Kale', 'Mane', 'Salunkhe', 'Sawant', 'Thorat', 'Nikam', 'Mahajan',
  'Bhandari', 'Divekar', 'Kelkar', 'Sathe', 'Gadgil', 'Apte', 'Ranade',
];

const MARATHI_FIRST_NAMES_MALE = [
  'Rajesh', 'Suresh', 'Mahesh', 'Ganesh', 'Anil', 'Sachin', 'Vikram', 'Amit',
  'Pramod', 'Sanjay', 'Nitin', 'Rahul', 'Ajay', 'Deepak', 'Vinod', 'Ashok',
  'Pravin', 'Sunil', 'Mangesh', 'Hemant', 'Santosh', 'Yogesh', 'Tushar',
];

const MARATHI_FIRST_NAMES_FEMALE = [
  'Priya', 'Sunita', 'Anita', 'Sneha', 'Meera', 'Swati', 'Kavita', 'Sushma',
  'Pooja', 'Neha', 'Smita', 'Rekha', 'Seema', 'Jyoti', 'Ashwini', 'Manisha',
  'Vaishali', 'Shubhangi', 'Rucha', 'Pallavi', 'Gauri', 'Madhuri', 'Savita',
];

/**
 * Generates a random Pune phone number (Indian mobile format)
 */
function generatePunePhone() {
  const prefixes = ['98230', '98220', '98600', '97650', '88888', '99220', '77760', '86000'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = String(Math.floor(Math.random() * 99999)).padStart(5, '0');
  return `+91${prefix}${suffix}`;
}

/**
 * Generates a random person name
 */
function generatePersonName(gender = 'random') {
  const g = gender === 'random' ? (Math.random() > 0.5 ? 'male' : 'female') : gender;
  const firstNames = g === 'male' ? MARATHI_FIRST_NAMES_MALE : MARATHI_FIRST_NAMES_FEMALE;
  const first = firstNames[Math.floor(Math.random() * firstNames.length)];
  const last = MARATHI_SURNAMES[Math.floor(Math.random() * MARATHI_SURNAMES.length)];
  return `${first} ${last}`;
}

/**
 * Pick a random item from array
 */
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Pick N unique random items from array
 */
function pickRandomN(arr, n) {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(n, arr.length));
}

/**
 * Get a random locality from the Pune data
 */
function getRandomLocality() {
  return pickRandom(PUNE_LOCALITIES);
}

/**
 * Generate GPS coordinates near a center point within a radius
 */
function jitterCoords(lat, lng, radiusKm = 0.5) {
  const radiusDeg = radiusKm / 111;
  const u = Math.random();
  const v = Math.random();
  const w = radiusDeg * Math.sqrt(u);
  const t = 2 * Math.PI * v;
  return {
    latitude: lat + w * Math.sin(t),
    longitude: lng + (w * Math.cos(t)) / Math.cos(lat * (Math.PI / 180)),
  };
}

module.exports = {
  PUNE_LOCALITIES,
  MARATHI_SURNAMES,
  MARATHI_FIRST_NAMES_MALE,
  MARATHI_FIRST_NAMES_FEMALE,
  generatePunePhone,
  generatePersonName,
  pickRandom,
  pickRandomN,
  getRandomLocality,
  jitterCoords,
};
