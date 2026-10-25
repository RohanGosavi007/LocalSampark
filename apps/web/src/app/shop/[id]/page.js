import { redirect } from 'next/navigation';

/**
 * /shop/:id is an old address for a shop's page. The page is /shops/:id.
 *
 * A second, separate implementation of the shop page lived here and search
 * results linked to it. It could not show a shop: it read `{ success, shop }`
 * and `{ catalog }` from endpoints that answer with the shop object itself and
 * `{ items }`, so every visit ended at "Shop not found." Its checkout posted
 * the cart to a path on the website rather than the API, and on "success"
 * showed an alert naming Razorpay and went to tracking for order "ORD-123".
 *
 * Old links and bookmarks keep working by landing on the real page.
 */
export default async function ShopRedirect({ params }) {
  const { id } = await params;
  redirect(`/shops/${encodeURIComponent(id)}`);
}
