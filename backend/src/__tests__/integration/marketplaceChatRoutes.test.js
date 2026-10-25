/**
 * Marketplace chat over REST.
 *
 * A seller replying to a buyer was recorded as a new conversation in which the
 * seller was the buyer of their own listing. The buyer never saw the reply.
 */

process.env.USE_SQLITE = 'true';

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { query, queryMany } = require('../../config/database');
const { getJwtSecret } = require('../../config/secrets');

const SELLER = 'mcr-seller';
const BUYER = 'mcr-buyer';
const OTHER = 'mcr-other';
const LISTING = 'mcr-listing';

const as = (userId) => ({ Authorization: `Bearer ${jwt.sign({ userId }, getJwtSecret(), { expiresIn: '5m' })}` });

let app;

async function cleanup() {
  await query("DELETE FROM marketplace_chat_messages WHERE chat_id IN (SELECT id FROM marketplace_chats WHERE listing_id = 'mcr-listing')");
  await query("DELETE FROM marketplace_chats WHERE listing_id = 'mcr-listing'");
  await query("DELETE FROM marketplace_listings WHERE id = 'mcr-listing'");
  await query("DELETE FROM users WHERE id LIKE 'mcr-%'");
}

beforeAll(async () => {
  await cleanup();
  for (const [id, phone] of [[SELLER, '9811700001'], [BUYER, '9811700002'], [OTHER, '9811700003']]) {
    await query("INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, $2, $3, 'user')", [id, `MCR ${id}`, phone]);
  }
  await query(
    `INSERT INTO marketplace_listings (id, seller_id, title, category, price, coordinate, status)
     VALUES ($1, $2, 'Sofa', 'furniture', 4000, 'POINT(73.87 18.53)', 'active')`,
    [LISTING, SELLER]
  );

  app = express();
  app.use(express.json());
  app.use('/marketplace', require('../../modules/ecommerce/routes/marketplace.routes'));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => res.status(500).json({ error: err.message }));
});

afterAll(cleanup);

const say = (userId, body) => request(app).post(`/marketplace/${LISTING}/chat`).set(as(userId)).send(body);
const read = (userId, chatId) => request(app).get(`/marketplace/${LISTING}/chat`).query(chatId ? { chatId } : {}).set(as(userId));

test('a seller replies into the conversation the buyer opened', async () => {
  const opened = await say(BUYER, { message: 'Is this still available?' });
  expect(opened.status).toBe(201);
  const chatId = opened.body.chatId;

  // Without saying which buyer, a seller cannot reply — there may be several.
  expect((await say(SELLER, { message: 'Yes' })).status).toBe(400);

  const reply = await say(SELLER, { chatId, message: 'Yes, it is.' });
  expect(reply.status).toBe(201);
  expect(reply.body.chatId).toBe(chatId);

  // One conversation, with the buyer as its buyer.
  const chats = await queryMany('SELECT buyer_id, seller_id, last_message FROM marketplace_chats WHERE listing_id = $1', [LISTING]);
  expect(chats).toEqual([{ buyer_id: BUYER, seller_id: SELLER, last_message: 'Yes, it is.' }]);

  const seen = await read(BUYER);
  expect(seen.body.messages.map((m) => m.message)).toEqual(['Is this still available?', 'Yes, it is.']);

  // The seller sees the list, and can open one conversation from it.
  const list = await read(SELLER);
  expect(list.body.chats).toHaveLength(1);
  const thread = await read(SELLER, chatId);
  expect(thread.body.messages).toHaveLength(2);
});

test('a third person can neither read nor write in it', async () => {
  const [chat] = await queryMany('SELECT id FROM marketplace_chats WHERE listing_id = $1', [LISTING]);

  expect((await read(OTHER, chat.id)).status).toBe(404);
  // Naming someone else's conversation does not put a message in it: it opens the caller's own.
  const res = await say(OTHER, { chatId: chat.id, message: 'Let me in' });
  expect(res.status).toBe(201);
  expect(res.body.chatId).not.toBe(chat.id);

  const original = await read(BUYER);
  expect(original.body.messages.map((m) => m.message)).not.toContain('Let me in');
});

test('an empty or enormous message is refused', async () => {
  expect((await say(BUYER, { message: '   ' })).status).toBe(400);
  expect((await say(BUYER, { message: 'x'.repeat(2001) })).status).toBe(400);
});
