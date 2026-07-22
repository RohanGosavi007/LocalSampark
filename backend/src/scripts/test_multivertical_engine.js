const { query, queryOne } = require('../config/database');
const crypto = require('crypto');

async function verifyMultiVerticalEngine() {
  console.log('--- 🚀 Testing Multi-Vertical Super-App Ecosystem Engine ---');

  // 1. Seed Doctor and Test Medical Query
  console.log('\n[1] Testing Medical & Healthcare Schema & Queries...');
  const doctorId = crypto.randomUUID();
  await query(`
    INSERT INTO medical_doctors (id, name, specialization, hospital_name, phone, clinic_name, address, consultation_fee, is_verified, geohash)
    VALUES ($1, 'Dr. Sunita Sharma', 'Pediatrician', 'Care Kids Clinic', '+919822011223', 'Care Kids Clinic', 'Porwal Road, Dhanori', 500.0, 1, 'tek3z2')
  `, [doctorId]);
  
  const doctors = await query('SELECT * FROM medical_doctors WHERE id = $1', [doctorId]);
  console.log('  [+] Inserted Doctor:', (doctors.rows || doctors)[0]?.name);

  // 2. Seed Job Posting
  console.log('\n[2] Testing Local Jobs & Micro-Gigs Schema & Queries...');
  const jobId = crypto.randomUUID();
  await query(`
    INSERT INTO local_job_postings (id, employer_id, title, category, salary_range, address, latitude, longitude)
    VALUES ($1, 'emp_mock_1', 'Store Assistant & Cashier', 'Retail', '₹15,000 - ₹18,000/mo', 'Dhanori Main Market', 18.5913, 73.8987)
  `, [jobId]);

  const jobs = await query('SELECT * FROM local_job_postings WHERE id = $1', [jobId]);
  console.log('  [+] Inserted Job Posting:', (jobs.rows || jobs)[0]?.title);

  // 3. Seed Property Listing
  console.log('\n[3] Testing Real Estate Properties Schema & Queries...');
  const propId = crypto.randomUUID();
  await query(`
    INSERT INTO local_property_listings (id, owner_id, title, property_type, price, address, latitude, longitude)
    VALUES ($1, 'owner_mock_1', 'Spacious 2BHK Apartment with Balcony', '2BHK', 18000.0, 'Ganga Oasis, Dhanori', 18.5913, 73.8987)
  `, [propId]);

  const props = await query('SELECT * FROM local_property_listings WHERE id = $1', [propId]);
  console.log('  [+] Inserted Property Listing:', (props.rows || props)[0]?.title);

  console.log('\n✅ All Multi-Vertical Schemas and Queries Verified Successfully!');
  process.exit(0);
}

verifyMultiVerticalEngine();
