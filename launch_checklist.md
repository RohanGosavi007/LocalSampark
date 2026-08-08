# LocalSampark Production Launch Checklist

Follow these manual steps to finalize the production launch of LocalSampark.

## 1. Database & Backend Configuration
- [ ] Ensure Supabase project is active or a fresh Render PostgreSQL database is provisioned.
- [ ] Run Prisma migrations against the production database: `npx prisma migrate deploy`
- [ ] Generate real JWT secrets and set `JWT_SECRET` and `JWT_REFRESH_SECRET` in production environment.
- [ ] Create the first Super Admin user account manually in the database or via an initialization script.

## 2. Third-Party Integrations
- [ ] Configure Razorpay production keys (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`).
- [ ] Set up Firebase Cloud Messaging (FCM) for push notifications and securely store the private key.
- [ ] Configure MSG91 for real OTP delivery in production (verify DLT templates).
- [ ] Set up Sentry DSN for error tracking and alerting.
- [ ] Configure SMTP/Email provider for transactional emails.

## 3. Deployment & Infrastructure
- [ ] Set up a Redis instance (Render or Upstash) and configure `REDIS_URL`.
- [ ] Configure custom domains for backend and web app on Render.
- [ ] Enforce SSL/HTTPS on all domains.
- [ ] Set up Render Deploy Hooks and add them to GitHub Secrets (`RENDER_DEPLOY_HOOK_URL`).
- [ ] Ensure `EXPO_PUBLIC_API_URL` is set to the production API URL in Expo secrets for EAS Build.

## 4. Mobile App Release
- [ ] Ensure all debug logs are removed or conditionalized.
- [ ] Generate and securely store the Android Keystore for app signing.
- [ ] Submit the release APK/AAB to the Google Play Console (Internal Testing Track first).
- [ ] Complete the Data Safety Questionnaire in the Google Play Console.

## 5. Post-Launch Verification
- [ ] Verify user registration and login flows.
- [ ] Verify real-time socket connections for chat and notifications.
- [ ] Run a test payment transaction using a live/test card on production.
- [ ] Monitor Sentry for any unhandled exceptions during the first 24 hours.
