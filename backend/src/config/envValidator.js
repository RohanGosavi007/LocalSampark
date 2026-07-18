// LocalSampark Production Environment Sanity Checker

const REQUIRED_ENV_VARS = [
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
];

const REQUIRED_PRODUCTION_VARS = [
  'DB_USER',
  'DB_HOST',
  'DB_NAME',
  'DB_PASSWORD',
  'REDIS_HOST',
  'ALLOWED_ORIGINS',
  'RAZORPAY_KEY_ID',
  'FIREBASE_PROJECT_ID'
];

const RECOMMENDED_VARS = [
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_CLIENT_EMAIL',
  'MSG91_AUTH_KEY',
  'MSG91_TEMPLATE_ID',
  'GOOGLE_MAPS_API_KEY',
  'SMTP_HOST',
  'SMTP_USER',
  'SMTP_PASS',
];

function validateEnv() {
  const isProduction = process.env.NODE_ENV === 'production';

  // Always check critical vars
  const missingCritical = [];
  REQUIRED_ENV_VARS.forEach((key) => {
    if (!process.env[key] || process.env[key].trim() === '') {
      missingCritical.push(key);
    }
  });

  if (missingCritical.length > 0) {
    console.error('❌ CRITICAL: Missing required environment variables:');
    missingCritical.forEach(key => console.error(`  - ${key}`));
    if (isProduction) process.exit(1);
  }

  if (isProduction) {
    // Check production-specific vars
    const missingProd = [];
    REQUIRED_PRODUCTION_VARS.forEach((key) => {
      if (!process.env[key] || process.env[key].trim() === '') {
        missingProd.push(key);
      }
    });

    if (missingProd.length > 0) {
      console.error('❌ CRITICAL: Missing required production environment variables:');
      missingProd.forEach(key => console.error(`  - ${key}`));
      console.error('Please configure them in your production environment or .env.production file.');
      process.exit(1);
    }

    // Warn about recommended vars
    const missingRecommended = [];
    RECOMMENDED_VARS.forEach((key) => {
      if (!process.env[key] || process.env[key].trim() === '') {
        missingRecommended.push(key);
      }
    });

    if (missingRecommended.length > 0) {
      console.warn('⚠️  Recommended environment variables not set (features may be limited):');
      missingRecommended.forEach(key => console.warn(`  - ${key}`));
    }

    console.log('✅ Production environment variables sanity check passed.');
  } else {
    console.warn('⚠️  Running in non-production mode. Strict validation skipped.');
    
    // Still warn about empty recommended vars in dev
    const empty = RECOMMENDED_VARS.filter(key => !process.env[key]);
    if (empty.length > 0) {
      console.warn(`   ${empty.length} optional service keys not configured (${empty.slice(0, 3).join(', ')}...)`);
    }
  }
}

module.exports = validateEnv;
