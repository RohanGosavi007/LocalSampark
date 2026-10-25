# LocalSampark Audit — Initial Baseline Measurements (Phase 1)

This document records the forensic execution results, exit codes, durations, pass/fail/skip counts, and exact error outputs for all baseline commands executed in Phase 1.

---

## 1. Backend Baseline Measurements

### Command: `npm run lint --workspace=backend`
- **Exit Code:** Pending
- **Duration:** Pending
- **Results:**
- **Output Excerpt:**

### Command: `npm run test:unit`
- **Exit Code:** Pending
- **Duration:** Pending
- **Suites:** Pending
- **Tests:** Pending
- **Output Excerpt:**

### Command: `npm run test:api`
- **Exit Code:** Pending
- **Duration:** Pending
- **Suites:** Pending
- **Tests:** Pending
- **Output Excerpt:**

### SQLite Fresh DB: Migrate & Seed Demo Verify
- **Command:** `npm run db:migrate && npm run db:seed && npm run seed:demo:verify`
- **Exit Code:** Pending
- **Output Excerpt:**

### PostgreSQL Local DB: Migrate, Seed & Test (`TEST_USE_POSTGRES=1`)
- **Status:** Pending local Postgres validation
- **Exit Code:** Pending
- **Output Excerpt:**

### Server Health Check (`GET /health`)
- **Status:** Pending
- **HTTP Code:** Pending
- **Payload:**

---

## 2. Frontend Web Baseline Measurements (`apps/web`)

### Command: `npm test --workspace=apps/web`
- **Exit Code:** Pending
- **Duration:** Pending
- **Pass/Fail:** Pending
- **Output Excerpt:**

### Command: `npm run build:web`
- **Exit Code:** Pending
- **Duration:** Pending
- **Route Count:** Pending
- **Warnings / Errors:**

---

## 3. Admin Console Baseline Measurements (`apps/admin`)

### Command: `npm test --workspace=apps/admin`
- **Exit Code:** Pending
- **Duration:** Pending
- **Pass/Fail:** Pending

### Command: `npm run build:admin`
- **Exit Code:** Pending
- **Duration:** Pending
- **Page Count:** Pending

---

## 4. Mobile Baseline Measurements (`apps/mobile`)

### Command: `npx jest --config jest.config.js`
- **Exit Code:** Pending
- **Suites / Tests:** Pending

### Command: `npx expo-doctor`
- **Exit Code:** Pending
- **Issues Found:**

### Command: `npx eslint .`
- **Exit Code:** Pending

### Command: `npx expo export --platform android`
- **Exit Code:** Pending

### Command: Android Build Debug (`.\gradlew.bat assembleDebug`)
- **Exit Code:** Pending

### Command: Android Build Release (`.\gradlew.bat assembleRelease`)
- **Exit Code:** Pending

---

## 5. End-to-End Suite Baselines

### Playwright Web (`npm run test:e2e:web`)
- **Exit Code:** Pending

### Playwright Admin (`npm run test:e2e:admin`)
- **Exit Code:** Pending

### Playwright Accessibility (`npm run test:a11y`)
- **Exit Code:** Pending

### Playwright API Contract (`npm run test:api:contract`)
- **Exit Code:** Pending

---

## 6. Dependency & Security Audits

### Command: `npm audit --omit=dev` (Root)
- **Exit Code:** Pending
- **Vulnerabilities:**

### Command: `npm audit --omit=dev` (`apps/mobile`)
- **Exit Code:** Pending
- **Vulnerabilities:**
