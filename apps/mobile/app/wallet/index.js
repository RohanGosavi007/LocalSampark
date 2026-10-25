// /wallet and /modules/wallet are the same screen. This route used to render
// src/screens/wallet/WalletScreen, whose top-up added the amount to the number
// on screen and nowhere else, and which showed two invented transactions when
// the wallet could not be loaded.
export { default } from '../modules/wallet';
