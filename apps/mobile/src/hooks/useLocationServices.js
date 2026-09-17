/**
 * useLocationServices — the screen-facing view of territory resolution.
 *
 * This hook used to carry its own copy of the resolution ladder: it called
 * expo-location directly, hit the older `/zones/resolve` endpoint, and treated
 * any non-answer as out of bounds. That duplicate had drifted from the resolver
 * in four ways that each show up as a wrong answer rather than an error:
 *
 *   - It prompted for location permission on every auto-detect, including the
 *     one that runs at launch before the user has asked for anything. A dialog
 *     raised that way is the fastest route to a permanent denial.
 *   - It never checked whether a fix came from a mock provider, so a spoofed
 *     position was attributed exactly like a real one — and territory
 *     attribution is what franchise commission is paid on.
 *   - It had no cached-pincode rung, so a user in a lift or on a train saw the
 *     out-of-bounds screen instead of the area they were in five minutes ago.
 *   - It reported no basis for its answer, so the UI could not distinguish a
 *     GPS fix from a typed postcode when telling the user what it had done.
 *
 * All of that now lives in the store and the resolver. This hook is the thin
 * screen-facing layer over them, and it keeps its previous return shape so the
 * screens using it did not have to change.
 */

import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { useTerritoryStore } from '../store/useTerritoryStore';
import { registerCoverageInterest, normalizePincode } from '../services/territoryResolver';

export function useLocationServices() {
  const {
    territoryId,
    isLocked,
    isOutOfBounds,
    isLoading,
    method,
    source,
    stale,
    offline,
    needsManualEntry,
    resolveAndLock,
    refreshOnBorderCross,
    restore,
  } = useTerritoryStore();

  const [gpsLoading, setGpsLoading] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState(null);

  // Restore the persisted territory on first mount, so the app opens on the
  // user's area rather than on a spinner while GPS is acquired.
  useEffect(() => {
    restore();
  }, [restore]);

  /**
   * Resolve from the device's position.
   *
   * `allowPrompt` defaults to true here because every caller of this function
   * is a user action — a tap on "use my location" — where a permission dialog
   * is expected. autoDetect below passes false.
   */
  const resolveFromGPS = useCallback(
    async ({ allowPrompt = true } = {}) => {
      setGpsLoading(true);
      try {
        const result = await resolveAndLock({ allowPrompt });

        // Surfaced so a screen can explain a denial instead of showing the
        // generic out-of-bounds state, which tells the user nothing they can
        // act on.
        if (result?.reason === 'permission_denied' || result?.reason === 'permission_not_granted') {
          setPermissionStatus('denied');
        } else if (result?.resolved) {
          setPermissionStatus('granted');
        }

        return result?.resolved ? result.territory : null;
      } finally {
        setGpsLoading(false);
      }
    },
    [resolveAndLock]
  );

  /** Resolve from a pincode the user typed. */
  const resolveFromPincode = useCallback(
    async (pincode) => {
      const normalized = normalizePincode(pincode);
      if (!normalized) {
        Alert.alert('Check the pincode', 'Enter a six-digit Indian pincode.');
        return null;
      }

      const result = await resolveAndLock({ pincode: normalized });
      if (result?.resolved) return result.territory;

      // An unserved area is not an error, it is an opportunity — the backend
      // records the demand and the prompt offers the productive next step
      // rather than a dead end.
      Alert.alert(
        'Not serviceable yet',
        `We don't cover ${normalized} yet. Want to be told when we do, or run the franchise for this area?`,
        [
          { text: 'No thanks', style: 'cancel' },
          {
            text: "I'm interested",
            onPress: () => registerCoverageInterest(normalized),
          },
        ]
      );
      return null;
    },
    [resolveAndLock]
  );

  /**
   * First-launch detection.
   *
   * Never prompts: at launch the user has not asked for anything, and the
   * resolver falls through to the cached pincode or the manual picker when
   * permission is not already granted.
   */
  const autoDetect = useCallback(async () => {
    if (isLocked) return;
    await resolveFromGPS({ allowPrompt: false });
  }, [isLocked, resolveFromGPS]);

  return {
    territoryId,
    isLocked,
    isOutOfBounds,
    isLoading: isLoading || gpsLoading,
    permissionStatus,
    // How the current answer was reached, so a screen can say "located by GPS"
    // or "showing 411001, saved earlier" truthfully.
    method,
    source,
    stale,
    offline,
    needsManualEntry,
    resolveFromGPS,
    resolveFromPincode,
    refreshOnBorderCross,
    autoDetect,
  };
}
