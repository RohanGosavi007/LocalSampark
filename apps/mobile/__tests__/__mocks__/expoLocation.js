/**
 * expo-location stub.
 *
 * The resolver's whole job is deciding what to do when location is unavailable,
 * stale, refused or faked, and none of those states can be produced on a real
 * device on demand. Each field here is a lever a test sets before calling in.
 */

const state = {
  foregroundStatus: 'granted',
  requestStatus: 'granted',
  servicesEnabled: true,
  position: {
    coords: { latitude: 18.53, longitude: 73.87, accuracy: 20 },
    mocked: false,
  },
  // When set, getCurrentPositionAsync never settles, which is how the resolver's
  // acquisition timeout is exercised without waiting on real hardware.
  hang: false,
  throws: null,
};

module.exports = {
  __state: state,
  __reset() {
    state.foregroundStatus = 'granted';
    state.requestStatus = 'granted';
    state.servicesEnabled = true;
    state.position = {
      coords: { latitude: 18.53, longitude: 73.87, accuracy: 20 },
      mocked: false,
    };
    state.hang = false;
    state.throws = null;
  },

  Accuracy: { Lowest: 1, Low: 2, Balanced: 3, High: 4, Highest: 5 },

  getForegroundPermissionsAsync: jest.fn(async () => ({ status: state.foregroundStatus })),
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: state.requestStatus })),
  hasServicesEnabledAsync: jest.fn(async () => state.servicesEnabled),
  getCurrentPositionAsync: jest.fn(async (options) => {
    module.exports.__lastOptions = options;
    if (state.throws) throw new Error(state.throws);
    if (state.hang) return new Promise(() => {});
    return state.position;
  }),
};
