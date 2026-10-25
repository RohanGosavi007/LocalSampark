// ═══════════════════════════════════════════════════════════════════════
// Address Generator — Pune-localized addresses for shops & deliveries
// ═══════════════════════════════════════════════════════════════════════

const { PUNE_LOCALITIES, pickRandom, jitterCoords } = require('./pune-data');

/**
 * Generates a realistic shop address for a given locality
 */
function generateShopAddress(localityOverride = null) {
  const locality = localityOverride || pickRandom(PUNE_LOCALITIES);
  const landmark = pickRandom(locality.landmarks);
  const coords = jitterCoords(locality.lat, locality.lng, 0.8);

  const shopNumbers = ['Shop No. 1', 'Shop No. 3', 'Shop No. 5', 'Shop No. 7', 'Shop No. 12', 'Shop No. 15', 'Shop No. 22', 'Stall A-4', 'Unit B-2', 'Ground Floor, Plot 9'];
  const buildingNames = [
    'Ganesh Complex', 'Shree Towers', 'Sai Arcade', 'Mahalaxmi Plaza',
    'Krishna Heights', 'Vitthal Residency', 'Prabhat Centre', 'Sahara Mall',
    'Shivaji Market Complex', 'Rajesh Commercial Hub', 'Omkar Chambers',
    'Landmark Building', 'City Point Mall', 'Metro Business Park',
    'Heritage Trade Center', 'Diamond House', 'Pearl Plaza',
  ];
  const roadNames = [
    `${locality.name} Main Road`, `${locality.name} Station Road`,
    'MG Road', 'Tilak Road', 'Laxmi Road', 'FC Road', 'JM Road',
    'Karve Road', 'Baner Road', 'Pashan Road', 'DP Road', 'SB Road',
  ];

  return {
    line1: `${pickRandom(shopNumbers)}, ${pickRandom(buildingNames)}`,
    line2: pickRandom(roadNames),
    landmark: landmark,
    locality: locality.name,
    city: 'Pune',
    state: 'Maharashtra',
    pincode: locality.pincode,
    latitude: parseFloat(coords.latitude.toFixed(6)),
    longitude: parseFloat(coords.longitude.toFixed(6)),
  };
}

/**
 * Generates a realistic delivery/home address
 */
function generateDeliveryAddress() {
  const locality = pickRandom(PUNE_LOCALITIES);
  const coords = jitterCoords(locality.lat, locality.lng, 1.0);
  const landmark = pickRandom(locality.landmarks);

  const flatNumbers = ['Flat 101', 'Flat 202', 'Flat 303', 'Flat 405', 'Flat 506', 'B-201', 'C-302', 'D-104', 'A-601', 'G-02'];
  const societyNames = [
    'Ganga Satellite', 'Kumar Parisar', 'Rohan Seher', 'Nyati Elan',
    'Kalpataru Harmony', 'Supreme Amadore', 'Kolte Patil Life Republic',
    'Paranjape Blue Ridge', 'DSK Gandhakosh', 'Marvel Diva',
    'Sinhagad Arcadia', 'Godrej Infinity', 'Panchshil Towers',
    'Amanora Park Town', 'Megapolis Splendour', 'VTP Blue Waters',
  ];

  return {
    tag: pickRandom(['Home', 'Home', 'Home', 'Office', 'Other']),
    line1: `${pickRandom(flatNumbers)}, ${pickRandom(societyNames)}`,
    line2: `${locality.name} Road`,
    landmark: landmark,
    locality: locality.name,
    city: 'Pune',
    state: 'Maharashtra',
    pincode: locality.pincode,
    latitude: parseFloat(coords.latitude.toFixed(6)),
    longitude: parseFloat(coords.longitude.toFixed(6)),
  };
}

module.exports = {
  generateShopAddress,
  generateDeliveryAddress,
};
