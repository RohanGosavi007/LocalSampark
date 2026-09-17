/**
 * expo-haptics stub.
 *
 * The real module imports expo-modules-core as untransformed ESM, which the
 * pure-logic jest setup here does not compile. Haptic feedback is also not
 * something a store test has an opinion about — it just must not throw.
 */
module.exports = {
  impactAsync: jest.fn(async () => {}),
  notificationAsync: jest.fn(async () => {}),
  selectionAsync: jest.fn(async () => {}),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
};
