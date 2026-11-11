/**
 * The cart rules exist twice, once per app (apps/web/src/lib/cartModel.js and
 * apps/mobile/src/lib/cartModel.js), because the two apps are built
 * separately. They must not drift: a cart that groups, prices or picks its
 * checkout differently on the phone and the web is two products (C6).
 */
const fs = require('fs');
const path = require('path');

const body = (file) => {
  const src = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  return src.slice(src.indexOf('*/') + 2).trim();
};

test('[C6.19] the app and the web share one set of cart rules', () => {
  const mobile = body(path.join(__dirname, '..', 'src', 'lib', 'cartModel.js'));
  const web = body(path.join(__dirname, '..', '..', 'web', 'src', 'lib', 'cartModel.js'));
  expect(mobile.length).toBeGreaterThan(1000);
  expect(mobile).toBe(web);
});
