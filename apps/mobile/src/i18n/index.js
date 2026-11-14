import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';

// Define translations
const translations = {
  en: {
    welcome: 'Welcome to LocalSampark',
    delivery_dashboard: 'Delivery Dashboard',
    online: 'Online',
    offline: 'Offline',
    today_earnings: 'Today Earnings',
    deliveries_today: 'Deliveries Today',
    weekly_earnings: 'Weekly Earnings',
    active_deliveries: 'Active Deliveries',
    quick_actions: 'Quick Actions',
    driver_onboarding: 'Driver Onboarding',
    kyc_documents: 'KYC Documents',
    submit: 'Submit',
    next: 'Next',
    back: 'Back',
    nav_retail: 'Retail',
    nav_hospital: 'Hospital',
    nav_doctor: 'Doctor',
    nav_tw: 'Two-wheeler',
    nav_fw: 'Four-wheeler',
    nav_beauty: 'Beauty',
    nav_home_service: 'Home services',
    nav_professional: 'Professional',
    nav_edu: 'Education & events',
    nav_fleet: 'Fleet',
    nav_analytics: 'Analytics',
  },
  hi: {
    welcome: 'लोकलसम्पर्क में आपका स्वागत है',
    delivery_dashboard: 'डिलीवरी डैशबोर्ड',
    online: 'ऑनलाइन',
    offline: 'ऑफ़लाइन',
    today_earnings: 'आज की कमाई',
    deliveries_today: 'आज की डिलीवरी',
    weekly_earnings: 'साप्ताहिक कमाई',
    active_deliveries: 'सक्रिय डिलीवरी',
    quick_actions: 'त्वरित कार्रवाई',
    driver_onboarding: 'ड्राइवर ऑनबोर्डिंग',
    kyc_documents: 'केवाईसी दस्तावेज़',
    submit: 'जमा करें',
    next: 'अगला',
    back: 'पीछे',
    nav_retail: 'खुदरा',
    nav_hospital: 'अस्पताल',
    nav_doctor: 'डॉक्टर',
    nav_tw: 'दोपहिया',
    nav_fw: 'चारपहिया',
    nav_beauty: 'ब्यूटी',
    nav_home_service: 'घरेलू सेवाएँ',
    nav_professional: 'प्रोफ़ेशनल',
    nav_edu: 'शिक्षा और कार्यक्रम',
    nav_fleet: 'फ़्लीट',
    nav_analytics: 'विश्लेषण',
  },
  mr: {
    welcome: 'लोकलसंपर्क मध्ये आपले स्वागत आहे',
    delivery_dashboard: 'डिलिव्हरी डॅशबोर्ड',
    online: 'ऑनलाइन',
    offline: 'ऑफलाइन',
    today_earnings: 'आजची कमाई',
    deliveries_today: 'आजच्या डिलिव्हरी',
    weekly_earnings: 'साप्ताहिक कमाई',
    active_deliveries: 'सक्रिय डिलिव्हरी',
    quick_actions: 'त्वरित कृती',
    driver_onboarding: 'ड्रायव्हर ऑनबोर्डिंग',
    kyc_documents: 'केवायसी कागदपत्रे',
    submit: 'सबमिट करा',
    next: 'पुढे',
    back: 'मागे',
    nav_retail: 'किरकोळ',
    nav_hospital: 'रुग्णालय',
    nav_doctor: 'डॉक्टर',
    nav_tw: 'दुचाकी',
    nav_fw: 'चारचाकी',
    nav_beauty: 'ब्युटी',
    nav_home_service: 'घरगुती सेवा',
    nav_professional: 'व्यावसायिक',
    nav_edu: 'शिक्षण आणि कार्यक्रम',
    nav_fleet: 'फ्लीट',
    nav_analytics: 'विश्लेषण',
  }
};

const i18n = new I18n(translations);

// Set the locale once at the beginning of your app.
// Fallback to 'en' if the current locale is not supported
i18n.locale = Localization.getLocales()[0].languageCode;
i18n.enableFallback = true;
i18n.defaultLocale = 'en';

export default i18n;
