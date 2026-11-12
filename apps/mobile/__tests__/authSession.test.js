/**
 * C1 in the app: signing in with an emailed code (Decision D3) and signing
 * out on the server, of this phone or of every device
 * (src/services/authSession.js).
 */
const fs = require('fs');
const path = require('path');
const {
  DEFAULT_METHODS, loginTabs, readMethods, fetchLoginMethods, sendEmailCode, verifyEmailCode, googleSignIn, signOutOnServer, offerGoogle,
} = require('../src/services/authSession');

const reply = (status, body) => ({ ok: status < 400, status, json: async () => body });
const apiUrl = 'https://api.example/api/v1';

test('[C1.25] the sign-in screen offers an email code first, and phone only when the server has it on', async () => {
  expect(loginTabs(DEFAULT_METHODS).map((t) => t.id)).toEqual(['emailOtp', 'password']);
  expect(loginTabs(readMethods({ methods: { phoneOtp: true } })).map((t) => t.id)).toEqual(['emailOtp', 'password', 'phone']);
  const fetch = jest.fn(async () => reply(200, { methods: { emailOtp: true, google: true, phoneOtp: false } }));
  expect(await fetchLoginMethods({ fetch, apiUrl })).toEqual({ emailOtp: true, google: true, phoneOtp: false });
  expect(fetch).toHaveBeenCalledWith(`${apiUrl}/auth/methods`);
  // Offline: the launch default, never "everything on".
  expect(await fetchLoginMethods({ fetch: jest.fn().mockRejectedValue(new Error('offline')), apiUrl })).toEqual(DEFAULT_METHODS);
});

test('[C1.26] an emailed code signs in; a new address is asked for a name first', async () => {
  const fetch = jest.fn()
    .mockResolvedValueOnce(reply(200, { success: true }))
    .mockResolvedValueOnce(reply(200, { registered: false }))
    .mockResolvedValueOnce(reply(200, { registered: true, accessToken: 'a', refreshToken: 'r', user: { id: 'u1' } }));
  await sendEmailCode('  Meera@Example.com ', { fetch, apiUrl });
  expect(fetch.mock.calls[0][0]).toBe(`${apiUrl}/auth/email/send-otp`);
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ email: 'meera@example.com' });

  expect(await verifyEmailCode('meera@example.com', ' 123 456 ', '', { fetch, apiUrl })).toEqual({ registered: false });
  expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ email: 'meera@example.com', otp: '123456' });

  const done = await verifyEmailCode('meera@example.com', '123456', ' Meera ', { fetch, apiUrl });
  expect(done.accessToken).toBe('a');
  expect(JSON.parse(fetch.mock.calls[2][1].body)).toEqual({ email: 'meera@example.com', otp: '123456', fullName: 'Meera' });

  await expect(sendEmailCode('not-an-email', { fetch, apiUrl })).rejects.toThrow(/valid email/);
  await expect(verifyEmailCode('meera@example.com', '12', '', { fetch, apiUrl })).rejects.toThrow(/code/);
  const refused = jest.fn(async () => reply(503, { error: 'Email sign-in is not available right now.', code: 'EMAIL_NOT_CONFIGURED' }));
  await expect(sendEmailCode('meera@example.com', { fetch: refused, apiUrl })).rejects.toMatchObject({ code: 'EMAIL_NOT_CONFIGURED', status: 503 });

  const google = jest.fn(async () => reply(200, { registered: true, accessToken: 'g' }));
  expect((await googleSignIn('google-id-token', { fetch: google, apiUrl })).accessToken).toBe('g');
  expect(JSON.parse(google.mock.calls[0][1].body)).toEqual({ googleIdToken: 'google-id-token' });
  await expect(googleSignIn(null, { fetch: google, apiUrl })).rejects.toThrow(/cancelled/);
  // The Google button needs the server to accept Google and this build to have a client id.
  expect(offerGoogle({ google: true }, { androidClientId: 'x.apps.googleusercontent.com' })).toBe(true);
  expect(offerGoogle({ google: true }, { androidClientId: undefined })).toBe(false);
  expect(offerGoogle({ google: false }, { androidClientId: 'x.apps.googleusercontent.com' })).toBe(false);
});

test('[C1.27] signing out tells the server — this phone, or every device', async () => {
  const apiPost = jest.fn().mockResolvedValue({ success: true });
  expect(await signOutOnServer({}, { api: { apiPost } })).toBe(true);
  expect(apiPost).toHaveBeenLastCalledWith('/auth/logout', { allDevices: false });
  expect(await signOutOnServer({ allDevices: true }, { api: { apiPost } })).toBe(true);
  expect(apiPost).toHaveBeenLastCalledWith('/auth/logout', { allDevices: true });
  // Already signed out there is fine; unreachable is reported.
  expect(await signOutOnServer({}, { api: { apiPost: jest.fn().mockRejectedValue(Object.assign(new Error('x'), { status: 401 })) } })).toBe(true);
  expect(await signOutOnServer({}, { api: { apiPost: jest.fn().mockRejectedValue(new Error('Network request failed')) } })).toBe(false);

  // The app's logout goes through it before forgetting the tokens, and the
  // More tab offers signing out everywhere.
  const ctx = fs.readFileSync(path.join(__dirname, '../src/context/AuthContext.js'), 'utf8');
  const logout = ctx.slice(ctx.indexOf('const logout = async'), ctx.indexOf("deleteToken('authToken')"));
  expect(logout).toMatch(/authSession\.signOutOnServer\(\{ allDevices \}\)/);
  const more = fs.readFileSync(path.join(__dirname, '../app/(tabs)/more.js'), 'utf8');
  expect(more).toMatch(/logout\(\{ allDevices: true \}\)/);
});
