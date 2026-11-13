/**
 * C3 on Android: what a shop row in the directory says about distance and
 * opening.
 *
 * The directory tab read shop.distance, which no endpoint returns (both
 * /shops/nearby and /shops/pincode send distance_km), so every shop said
 * "Nearby". Open status comes from the server's is_open_now (computed in IST);
 * unknown hours (null) show nothing rather than a guess.
 */

export function distanceLabel(shop) {
  const km = Number(shop && (shop.distance_km ?? shop.distance));
  if (!shop || (shop.distance_km == null && shop.distance == null) || !Number.isFinite(km)) return 'Nearby';
  return km < 1 ? `${Math.round(km * 1000)} m` : `${Math.round(km * 10) / 10} km`;
}

export function openStatusLabel(shop) {
  if (!shop) return null;
  if (shop.is_open_now === true) return 'Open now';
  if (shop.is_open_now === false) return 'Closed now';
  return null;
}
