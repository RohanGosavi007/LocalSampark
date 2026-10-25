# Archived web demo pages

Prototype pages that displayed invented data (a fixed salon with a "Booking Confirmed!"
screen, mock reels, a mock cart, a fake return flow, a story uploader that posted nothing).
Nothing linked to them, and they were publicly routable and in the sitemap, so a visitor
who found one saw made-up bookings and orders. Moved out of `apps/web/src/app` rather than
deleted; move one back (and give it a real backend) to restore it.
- shop-dashboard/components/*Manager.js and components/DailyStreak.js: hard-coded patients, classes, jobs and a fixed 4-day streak; imported nowhere / not backed by any API.

## mobile/
Screens with simulated payment ('Balance: ₹1,250', a fake order ringing the shop), simulated order tracking and a fixed salon staff list. Nothing navigated to them but expo-router makes every file under app/ reachable by deep link, so they were reachable from localsampark.in links.
