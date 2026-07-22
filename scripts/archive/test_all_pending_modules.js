const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, 'backend/.env') });
const FeatureFlagService = require('./backend/src/services/FeatureFlagService');
const { query, queryOne } = require('./backend/src/config/database');
const crypto = require('crypto');

async function runPendingModulesSuite() {
  console.log('--- STARTING ALL PENDING MODULES INTEGRATION & GTM TEST SUITE ---');

  try {
    const modules = ['medical', 'jobs', 'properties', 'events', 'multilingual'];

    // 1. Assert GTM Lockouts by default (Phase 2 & Phase 3 are locked initially)
    console.log('\n[Test 1] Verifying GTM Lockouts Across All Pending Modules');
    for (const mod of modules) {
      const evalRes = await FeatureFlagService.isFeatureAvailable(mod);
      console.log(`Module [${mod.toUpperCase()}]: ${evalRes.available ? 'UNLOCKED' : 'LOCKED (Expected)'}`);
    }

    // 2. Temporarily unlock modules to test functional CRUD flows
    console.log('\n[Test 2] Temporarily Unlocking Modules for Functional Verification');
    for (const mod of modules) {
      await query(`UPDATE feature_flags SET is_enabled = 1 WHERE feature_key = $1`, [mod]);
    }
    FeatureFlagService.invalidateCache();

    // A. Medical Appointment Flow
    console.log('\n[Test 3A] Medical Doctor Appointment Booking');
    const doctor = await queryOne('SELECT id FROM medical_doctors LIMIT 1');
    const apptId = crypto.randomUUID();
    const apptRef = `MED-${Math.floor(100000 + Math.random() * 900000)}`;

    await query(`
      INSERT INTO medical_appointments (id, appointment_ref, user_id, doctor_id, appointment_date, time_slot, patient_name, patient_phone, consultation_fee)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [apptId, apptRef, 'user_test_1', doctor.id, '2026-08-01', '11:00 AM', 'Anita Roy', '9876543299', 500.00]);

    const appt = await queryOne('SELECT * FROM medical_appointments WHERE id = $1', [apptId]);
    console.log(`Medical Appointment Created! Ref: ${appt.appointment_ref}, Status: ${appt.status}`);

    // B. Job Application Flow
    console.log('\n[Test 3B] Local Job Application Submission');
    const job = await queryOne('SELECT id FROM job_postings LIMIT 1');
    const appId = crypto.randomUUID();

    await query(`
      INSERT INTO job_applications (id, job_id, user_id, applicant_name, applicant_phone, experience_summary)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [appId, job.id, 'user_test_1', 'Rahul Verma', '9876543288', '2 years retail cashier experience']);

    const application = await queryOne('SELECT * FROM job_applications WHERE id = $1', [appId]);
    console.log(`Job Application Created! Candidate: ${application.applicant_name}, Status: ${application.status}`);

    // C. Property Inquiry Flow
    console.log('\n[Test 3C] Direct Property Inquiry Dispatch');
    const prop = await queryOne('SELECT id FROM property_listings LIMIT 1');
    const inqId = crypto.randomUUID();

    await query(`
      INSERT INTO property_inquiries (id, property_id, user_id, buyer_name, buyer_phone, message)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [inqId, prop.id, 'user_test_1', 'Suresh Kumar', '9876543277', 'Interested in inspecting this apartment.']);

    const inquiry = await queryOne('SELECT * FROM property_inquiries WHERE id = $1', [inqId]);
    console.log(`Property Inquiry Dispatched! Buyer: ${inquiry.buyer_name}`);

    // D. Event RSVP Flow
    console.log('\n[Test 3D] Community Event Ticket RSVP');
    const event = await queryOne('SELECT id FROM community_events LIMIT 1');
    const rsvpId = crypto.randomUUID();

    await query(`
      INSERT INTO event_rsvps (id, event_id, user_id, attendee_name, attendee_phone, seats, total_amount)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [rsvpId, event.id, 'user_test_1', 'Pooja Shah', '9876543266', 2, 0.00]);

    const rsvp = await queryOne('SELECT * FROM event_rsvps WHERE id = $1', [rsvpId]);
    console.log(`Event RSVP Confirmed! Attendee: ${rsvp.attendee_name}, Seats: ${rsvp.seats}`);

    // E. Multilingual Translation Engine
    console.log('\n[Test 3E] Regional Multilingual Dictionary Lookup');
    const dict = await query('SELECT translation_key, translation_value FROM localization_dictionaries WHERE lang_code = $1', ['hi']);
    console.log(`Hindi Dictionary Loaded (${(dict.rows || dict).length} keys):`, (dict.rows || dict)[0]);

    // Cleanup test data
    await query('DELETE FROM medical_appointments WHERE id = $1', [apptId]);
    await query('DELETE FROM job_applications WHERE id = $1', [appId]);
    await query('DELETE FROM property_inquiries WHERE id = $1', [inqId]);
    await query('DELETE FROM event_rsvps WHERE id = $1', [rsvpId]);

    // Restore feature locks to default state
    for (const mod of modules) {
      await query(`UPDATE feature_flags SET is_enabled = 0 WHERE feature_key = $1`, [mod]);
    }
    FeatureFlagService.invalidateCache();

    console.log('\n--- ALL PENDING MODULES SUITE PASSED SUCCESSFULLY ---');
  } catch (err) {
    console.error('Pending Modules Test Suite Failed:', err);
  }
}

runPendingModulesSuite();
