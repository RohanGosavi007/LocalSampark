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
  }
};

const i18n = new I18n(translations);

// Set the locale once at the beginning of your app.
// Fallback to 'en' if the current locale is not supported
i18n.locale = Localization.getLocales()[0].languageCode;
i18n.enableFallback = true;
i18n.defaultLocale = 'en';

export default i18n;
