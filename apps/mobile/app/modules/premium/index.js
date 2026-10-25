import { Redirect } from 'expo-router';

// One SamparkPlus screen. This module route held a second copy with its own price
// (₹199) and an "Upgrade" button that only showed an alert; it now opens the real
// one, which reads the price from the server and takes the payment.
export default function PremiumModule() {
  return <Redirect href="/premium" />;
}
