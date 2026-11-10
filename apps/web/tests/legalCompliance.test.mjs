import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP = path.join(WEB, 'src', 'app');

test('Legal 1.1: /account-deletion page exists and provides Google Play compliant deletion workflow', () => {
  const filePath = path.join(APP, 'account-deletion', 'page.js');
  assert.ok(fs.existsSync(filePath), 'account-deletion/page.js must exist');
  
  const content = fs.readFileSync(filePath, 'utf8');
  assert.ok(content.includes('Account & Data Deletion'), 'must carry title');
  assert.ok(content.includes('Google Play Policy'), 'must reference Google Play compliance');
  assert.ok(content.includes('/users/me/delete-account'), 'must call authenticated deletion endpoint');
  assert.ok(content.includes('/users/account-deletion-request'), 'must call public deletion request endpoint');
  assert.ok(content.includes('CGST') || content.includes('GST Act'), 'must disclose tax invoice statutory retention');
});

test('Legal 1.2: /legal/grievance page exists with Consumer Protection Rules 2020 compliance', () => {
  const filePath = path.join(APP, 'legal', 'grievance', 'page.js');
  assert.ok(fs.existsSync(filePath), 'legal/grievance/page.js must exist');

  const content = fs.readFileSync(filePath, 'utf8');
  // The officer's name and address are configuration on the server
  // (GRIEVANCE_OFFICER_*, F-146), so the page must render them from
  // GET /support/grievance-officer rather than carry its own copy.
  // tests/e2e/web/support.spec.js [C14.14] checks the rendered name equals it.
  assert.ok(content.includes("'/support/grievance-officer'"), 'must load the Grievance Officer from the API');
  assert.ok(content.includes('officer.name') && content.includes('officer.address'), 'must publish the officer name and address');
  assert.ok(content.includes('grievance@localsampark.com'), 'must publish official grievance email');
  assert.ok(content.includes('48 Hours') || content.includes('48 hours'), 'must disclose 48-hour statutory acknowledgement SLA');
  assert.ok(content.includes('30 Days') || content.includes('30 calendar days'), 'must disclose 30-day statutory resolution SLA');
});

test('Legal 1.3: LegalHub provides comprehensive DPDP and M5 refund disclosures', () => {
  const hubPath = path.join(APP, 'legal', 'LegalHub.js');
  const content = fs.readFileSync(hubPath, 'utf8');

  // DPDP Act 2023
  assert.ok(content.includes('DPDP Act 2023'), 'must disclose DPDP Act 2023 compliance');
  assert.ok(content.includes('Data Principal Rights'), 'must detail data principal rights');
  assert.ok(content.includes('/account-deletion'), 'must link to account deletion portal');

  // M5 Return & Refund policy
  assert.ok(content.includes('48 hours') || content.includes('48 Hours'), 'must disclose 48-hour return window for perishables');
  assert.ok(content.includes('7 calendar days') || content.includes('7-day'), 'must disclose 7-day return window for retail');
  assert.ok(content.includes('Wallet') || content.includes('wallet'), 'must disclose COD wallet refund routing');

  // Grievance Officer in footer
  assert.ok(content.includes('Rohan Gosavi'), 'footer must state Grievance Officer Rohan Gosavi');
  assert.ok(content.includes('grievance@localsampark.com'), 'footer must state grievance email');
});
