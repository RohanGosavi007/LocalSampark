/**
 * @react-native-community/netinfo stub.
 *
 * The offline queue's whole job is what happens when the network is down, and
 * that state cannot be produced on demand otherwise.
 */
const state = { isConnected: true, isInternetReachable: true };

module.exports = {
  __state: state,
  __setOnline(online) {
    state.isConnected = online;
    state.isInternetReachable = online;
  },
  fetch: jest.fn(async () => ({ ...state })),
  addEventListener: jest.fn(() => () => {}),
};
