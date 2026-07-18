const fs = require('fs');
const path = require('path');

const newCategories = [
  {
    catId: 'post-harvest',
    catTitleKey: 'cat_post_harvest',
    catTitleEn: 'Post-Harvest & Value Addition',
    color: '#fbbf24',
    features: [
      { id: 'food-processing', icon: '🏭', titleEn: 'Mini Food Processing', descEn: 'Micro food-processing units for pickles, juice, chips.' },
      { id: 'packaging', icon: '📦', titleEn: 'Packaging & Branding', descEn: 'Professional packaging design for FPOs.' },
      { id: 'fssai', icon: '🧪', titleEn: 'FSSAI Certification', descEn: 'Food safety license assistance.' },
      { id: 'agri-processing', icon: '🍷', titleEn: 'Agri-Processing Connect', descEn: 'Link directly with wineries and sugar factories.' },
      { id: 'warehouse-receipt', icon: '🌾', titleEn: 'Warehouse Financing', descEn: 'Store grain & get digital receipts to borrow against crop.' },
      { id: 'commodity-alerts', icon: '📊', titleEn: 'Commodity Price Alerts', descEn: 'Real-time alerts for NCDEX/MCX futures.' }
    ]
  },
  {
    catId: 'export',
    catTitleKey: 'cat_export',
    catTitleEn: 'Export & Global Market Access',
    color: '#0284c7',
    features: [
      { id: 'export-checker', icon: '🌐', titleEn: 'Export Readiness Checker', descEn: 'AI tool to check if produce meets export standards.' },
      { id: 'apeda', icon: '📋', titleEn: 'APEDA Registration', descEn: 'Guided process to register as an exporter.' },
      { id: 'export-buyer', icon: '🚢', titleEn: 'Export Buyer Connect', descEn: 'Connect FPOs with international buyers.' },
      { id: 'organic-cert', icon: '📜', titleEn: 'Organic Certification', descEn: 'Get official NPOP or PGS organic certification.' },
      { id: 'gi-tag', icon: '🏷️', titleEn: 'GI Tag Product Registry', descEn: 'Premium marketplace for GI tagged products.' }
    ]
  },
  {
    catId: 'sustainable',
    catTitleKey: 'cat_sustainable',
    catTitleEn: 'Sustainable Agriculture',
    color: '#16a34a',
    features: [
      { id: 'vermicompost', icon: '🪱', titleEn: 'Vermicompost Hub', descEn: 'Order organic vermicompost & bio-fertilizers.' },
      { id: 'beekeeping', icon: '🐝', titleEn: 'Beekeeping Hub', descEn: 'Training, starter-kits, and honey marketplace.' },
      { id: 'carbon-credit', icon: '☀️', titleEn: 'Carbon Credit Calculator', descEn: 'Estimate credits and connect with buyers.' },
      { id: 'tree-tracker', icon: '🌳', titleEn: 'Tree Plantation Tracker', descEn: 'Track planting and claim incentives.' },
      { id: 'biogas', icon: '💨', titleEn: 'Biogas Calculator', descEn: 'Calculate ROI and connect with installers.' },
      { id: 'alt-protein', icon: '🦗', titleEn: 'Alternative Protein', descEn: 'Training for insect/algae farming.' }
    ]
  },
  {
    catId: 'agri-tourism',
    catTitleKey: 'cat_agri_tourism',
    catTitleEn: 'Agri-Tourism & Rural Stays',
    color: '#e879f9',
    features: [
      { id: 'farm-stay', icon: '🏕️', titleEn: 'Farm Stay Listing', descEn: 'List farmhouses as tourist homestays.' },
      { id: 'fruit-picking', icon: '🍊', titleEn: 'Fruit-Picking', descEn: 'City tourists book fruit-picking experiences.' },
      { id: 'fishing-tour', icon: '🎣', titleEn: 'Fishing Tourism', descEn: 'Book dam-side fishing experiences.' },
      { id: 'dairy-visit', icon: '🐄', titleEn: 'Dairy Farm Visits', descEn: 'Educational visits to dairy farms.' },
      { id: 'art-workshop', icon: '🎨', titleEn: 'Rural Art Workshops', descEn: 'Warli painting and pottery for tourists.' },
      { id: 'festival-calendar', icon: '🎪', titleEn: 'Village Festival Calendar', descEn: 'Calendar of rural jatras and fairs.' }
    ]
  },
  {
    catId: 'farm-management',
    catTitleKey: 'cat_farm_management',
    catTitleEn: 'Farm Management & Records',
    color: '#64748b',
    features: [
      { id: 'farm-diary', icon: '📒', titleEn: 'Digital Farm Diary', descEn: 'Log daily activities to build crop history.' },
      { id: 'expense-tracker', icon: '💸', titleEn: 'Farm Expense Tracker', descEn: 'Track input costs vs. revenue.' },
      { id: 'farm-labor', icon: '👷', titleEn: 'Farm Labor Marketplace', descEn: 'Hire daily-wage laborers during peak season.' },
      { id: 'land-lease', icon: '📐', titleEn: 'Land Lease Marketplace', descEn: 'Lease unused land to other farmers.' },
      { id: 'seed-bank', icon: '🌾', titleEn: 'Seed Bank & Exchange', descEn: 'Exchange indigenous seed varieties.' },
      { id: 'roi-calculator', icon: '🧮', titleEn: 'Crop ROI Calculator', descEn: 'Estimate input cost, yield, and profit.' },
      { id: 'chc-connect', icon: '🗓️', titleEn: 'Custom Hiring Centre', descEn: 'Locate nearest government CHC for equipment.' }
    ]
  },
  {
    catId: 'connectivity',
    catTitleKey: 'cat_connectivity',
    catTitleEn: 'Rural Digital Connectivity',
    color: '#06b6d4',
    features: [
      { id: 'internet-check', icon: '📶', titleEn: 'Internet Checker', descEn: 'Find best telecom network in your village.' },
      { id: 'csc-locator', icon: '🖥️', titleEn: 'CSC Locator', descEn: 'Find nearest Common Service Centre.' },
      { id: 'refurbished-phones', icon: '📱', titleEn: 'Refurbished Phones', descEn: 'Affordable smartphones delivered.' },
      { id: 'mobile-recharge', icon: '🔌', titleEn: 'Mobile & Utility Bills', descEn: 'BBPS recharge and bill payment.' },
      { id: 'digital-locker', icon: '📧', titleEn: 'Digital Document Locker', descEn: 'Secure cloud storage for Aadhaar & Land Records.' },
      { id: 'print-demand', icon: '🖨️', titleEn: 'Print-on-Demand', descEn: 'Order prints of certificates from nearest CSC.' }
    ]
  },
  {
    catId: 'social-services',
    catTitleKey: 'cat_social_services',
    catTitleEn: 'Rural Life & Social Services',
    color: '#f43f5e',
    features: [
      { id: 'rural-matrimony', icon: '💍', titleEn: 'Rural Matrimony', descEn: 'Matrimony profiles for rural youth.' },
      { id: 'temple-services', icon: '🕌', titleEn: 'Temple Services', descEn: 'Book puja and find pandits.' },
      { id: 'event-planners', icon: '🎉', titleEn: 'Wedding Planners', descEn: 'Find decorators and caterers for village weddings.' },
      { id: 'local-news', icon: '📰', titleEn: 'Taluka News', descEn: 'Hyper-local news and agriculture updates.' },
      { id: 'death-services', icon: '☠️', titleEn: 'Funeral Services', descEn: 'Ambulance and cremation ground locator.' },
      { id: 'animal-rescue', icon: '🐾', titleEn: 'Animal Rescue Connect', descEn: 'Report injured stray cattle/dogs.' },
      { id: 'rural-helpline', icon: '📞', titleEn: 'Customer Helpline', descEn: 'Dedicated voice helpline for farmers.' }
    ]
  },
  {
    catId: 'entrepreneurship',
    catTitleKey: 'cat_entrepreneurship',
    catTitleEn: 'Rural Entrepreneurship',
    color: '#8b5cf6',
    features: [
      { id: 'kirana-digital', icon: '🏪', titleEn: 'Kirana Digitization', descEn: 'Help village shops go digital.' },
      { id: 'fmcg-distrib', icon: '🧊', titleEn: 'FMCG Distribution', descEn: 'Connect with FMCG brands for distribution.' },
      { id: 'petrol-pump', icon: '⛽', titleEn: 'Petrol Pump Finder', descEn: 'Locate nearest petrol pump & gas agency.' },
      { id: 'micro-atm', icon: '🏦', titleEn: 'Micro-ATM Locator', descEn: 'Find nearest micro-ATM for cash withdrawal.' },
      { id: 'tuition-tutor', icon: '🧑‍🏫', titleEn: 'Tuition Tutors', descEn: 'Find qualified tutors for board exams.' },
      { id: 'timber-market', icon: '🪵', titleEn: 'Timber Marketplace', descEn: 'Marketplace for FSC-certified timber.' },
      { id: 'welding', icon: '🔨', titleEn: 'Welding On-Demand', descEn: 'Book skilled welders for farm gate repairs.' }
    ]
  }
];

// First, we need to read the existing ruralServices.js and extract the old categories
const existingContent = fs.readFileSync(path.join(__dirname, 'apps/web/src/app/data/rural-services.js'), 'utf8');

// The tricky part is appending without breaking syntax. Since I control the format, I will parse the existing file by removing the TOP_FEATURES block and replacing the closing brace of RURAL_CATEGORIES.

let newCategoriesStr = "";
newCategories.forEach(cat => {
  newCategoriesStr += "  {\\n" +
"    id: '" + cat.catId + "',\\n" +
"    title_key: '" + cat.catTitleKey + "',\\n" +
"    color: '" + cat.color + "',\\n" +
"    features: [\\n";
  
  cat.features.forEach(f => {
    newCategoriesStr += "      { id: '" + f.id + "', icon: '" + f.icon + "', title_key: 'feat_" + f.id + "', desc_key: 'feat_" + f.id + "_desc', color: '" + cat.color + "', path: '/krishi/" + f.id + "' },\\n";
  });
  
  newCategoriesStr += "    ]\\n" +
"  },\\n";
});

// We need to inject newCategoriesStr into RURAL_CATEGORIES before the closing ];
const endOfCategories = existingContent.indexOf('];\\n\\nexport const TOP_FEATURES');
let modifiedContent = existingContent.substring(0, endOfCategories) + newCategoriesStr + "];\\n\\n";

// Now replace TOP_FEATURES entirely with the new TOP 15 List
const top15 = [
  { id: 'farm-diary', icon: '📒', catColor: '#64748b' },
  { id: 'food-processing', icon: '🏭', catColor: '#fbbf24' },
  { id: 'farm-labor', icon: '👷', catColor: '#64748b' },
  { id: 'warehouse-receipt', icon: '🌾', catColor: '#fbbf24' },
  { id: 'farm-stay', icon: '🏕️', catColor: '#e879f9' },
  { id: 'rural-matrimony', icon: '💍', catColor: '#f43f5e' },
  { id: 'land-lease', icon: '📐', catColor: '#64748b' },
  { id: 'vermicompost', icon: '🪱', catColor: '#16a34a' },
  { id: 'organic-cert', icon: '📜', catColor: '#0284c7' },
  { id: 'kirana-digital', icon: '🏪', catColor: '#8b5cf6' },
  { id: 'carbon-credit', icon: '☀️', catColor: '#16a34a' },
  { id: 'gi-tag', icon: '🏷️', catColor: '#0284c7' },
  { id: 'digital-locker', icon: '📧', catColor: '#06b6d4' },
  { id: 'roi-calculator', icon: '🧮', catColor: '#64748b' },
  { id: 'internet-check', icon: '📶', catColor: '#06b6d4' }
];

let top15Str = "export const TOP_FEATURES = [\\n";
top15.forEach(f => {
  top15Str += "  { id: '" + f.id + "', icon: '" + f.icon + "', title_key: 'feat_" + f.id + "', desc_key: 'feat_" + f.id + "_desc', color: '" + f.catColor + "', path: '/krishi/" + f.id + "' },\\n";
});
top15Str += "];\\n";

modifiedContent += top15Str;
fs.writeFileSync(path.join(__dirname, 'apps/web/src/app/data/rural-services.js'), modifiedContent);


// Now update translations
const oldTransPath = path.join(__dirname, 'apps/web/src/app/data/translations.js');
let translationsFileContent = fs.readFileSync(oldTransPath, 'utf8');

// We need to parse the existing JSON from the string "export const translations = {...};"
const jsonStart = translationsFileContent.indexOf('{');
const jsonEnd = translationsFileContent.lastIndexOf('}');
const jsonStr = translationsFileContent.substring(jsonStart, jsonEnd + 1);
let translationObj = JSON.parse(jsonStr);

// Add new categories and features to translations
newCategories.forEach(cat => {
  translationObj.en[cat.catTitleKey] = cat.catTitleEn;
  translationObj.mr[cat.catTitleKey] = cat.catTitleEn;
  translationObj.hi[cat.catTitleKey] = cat.catTitleEn;

  cat.features.forEach(f => {
    translationObj.en['feat_' + f.id] = f.titleEn;
    translationObj.en['feat_' + f.id + '_desc'] = f.descEn;
    translationObj.mr['feat_' + f.id] = f.titleEn;
    translationObj.mr['feat_' + f.id + '_desc'] = f.descEn;
    translationObj.hi['feat_' + f.id] = f.titleEn;
    translationObj.hi['feat_' + f.id + '_desc'] = f.descEn;
  });
});

const newTranslationsContent = "export const translations = " + JSON.stringify(translationObj, null, 2) + ";\\n";
fs.writeFileSync(oldTransPath, newTranslationsContent);

console.log('V4 Data and Translations updated successfully.');
