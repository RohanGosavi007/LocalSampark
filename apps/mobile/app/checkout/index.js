// /checkout (opened from the cart) and /modules/checkout (opened from a shop)
// are the same screen. This route used to render a second implementation,
// src/screens/ecommerce/CheckoutScreen, which sent a placeholder address id
// and reported "Order Confirmed!" for an online order that had not been paid.
export { default } from '../modules/checkout';
