/**
 * Who may speak in a marketplace conversation.
 *
 * The socket handlers took the room name from the event — `mkt_chat_<chat or
 * listing id>` — and joined or sent without asking who the sender was. Any
 * connection could read or write another pair's conversation, and every buyer
 * of one listing shared a room. resolveChat is what now decides, so its rules
 * are pinned here against the real tables; the handlers are driven with a
 * minimal stand-in for the socket to check they honour it.
 */


const { fx, fxLike } = require('./helpers/fixtureIds');
const { query, queryOne, queryMany } = require('../config/database');
const marketplaceSocket = require('../sockets/marketplaceSocket');

const { resolveChat } = marketplaceSocket;

const SELLER = fx('mkt-sock-seller');
const BUYER = fx('mkt-sock-buyer');
const OTHER = fx('mkt-sock-other');
const LISTING = fx('mkt-sock-listing');

async function cleanup() {
  await query('DELETE FROM marketplace_chat_messages WHERE listing_id = $1', [LISTING]);
  await query('DELETE FROM marketplace_chats WHERE listing_id = $1', [LISTING]);
  await query('DELETE FROM marketplace_listings WHERE id = $1', [LISTING]);
  await query(`DELETE FROM users WHERE CAST(id AS TEXT) LIKE '${fxLike('mkt')}'`);
}

beforeAll(async () => {
  await cleanup();
  for (const [id, name, phone] of [[SELLER, 'Seller', '9833444001'], [BUYER, 'Buyer', '9833444002'], [OTHER, 'Other', '9833444003']]) {
    await query('INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, $2, $3, $4)', [id, name, phone, 'user']);
  }
  await query(
    `INSERT INTO marketplace_listings (id, seller_id, title, category, price, status)
     VALUES ($1, $2, 'Test cycle', 'Sports', 2500, 'active')`,
    [LISTING, SELLER]
  );
});

afterAll(cleanup);

/** Just enough of io and a socket to record what the handlers do. */
function harness(user) {
  const handlers = {};
  const emittedToRooms = [];
  const emittedToSelf = [];
  const joined = [];
  const socket = {
    user,
    on: (event, fn) => { handlers[event] = fn; },
    join: (room) => joined.push(room),
    emit: (event, payload) => emittedToSelf.push({ event, payload }),
  };
  const io = { to: (room) => ({ emit: (event, payload) => emittedToRooms.push({ room, event, payload }) }) };
  marketplaceSocket(io, socket);
  return { handlers, emittedToRooms, emittedToSelf, joined };
}

const user = (id) => ({ id, full_name: id });

describe('resolveChat', () => {
  test('a guest is never a party to a conversation', async () => {
    expect(await resolveChat({ id: 'guest_abc123', isGuest: true }, { listingId: LISTING }, { create: true })).toBeNull();
    expect(await resolveChat(null, { listingId: LISTING }, { create: true })).toBeNull();
  });

  test('without create, a buyer who has not written yet has no conversation', async () => {
    expect(await resolveChat(user(BUYER), { listingId: LISTING })).toBeNull();
  });

  test('a seller cannot open a conversation on their own listing', async () => {
    expect(await resolveChat(user(SELLER), { listingId: LISTING }, { create: true, firstMessage: 'hi' })).toBeNull();
  });
});

describe('the handlers', () => {
  let chatId;

  test("a buyer's first message opens the conversation, stores it and reaches only that room", async () => {
    const h = harness(user(BUYER));
    await h.handlers['marketplace:send_message']({ listing_id: LISTING, message: 'Is this still available?' });

    const chats = await queryMany('SELECT * FROM marketplace_chats WHERE listing_id = $1', [LISTING]);
    expect(chats).toHaveLength(1);
    chatId = chats[0].id;
    expect(chats[0].buyer_id).toBe(BUYER);
    expect(chats[0].seller_id).toBe(SELLER);

    const stored = await queryMany('SELECT chat_id, sender_id, message FROM marketplace_chat_messages WHERE listing_id = $1', [LISTING]);
    expect(stored).toEqual([{ chat_id: chatId, sender_id: BUYER, message: 'Is this still available?' }]);

    expect(h.emittedToRooms).toHaveLength(1);
    expect(h.emittedToRooms[0].room).toBe(`mkt_chat_${chatId}`);
    expect(h.joined).toContain(`mkt_chat_${chatId}`);
  });

  test('the seller can join and reply by naming the conversation', async () => {
    const h = harness(user(SELLER));
    await h.handlers['marketplace:join_chat']({ chat_room_id: chatId });
    expect(h.joined).toEqual([`mkt_chat_${chatId}`]);

    await h.handlers['marketplace:send_message']({ chat_room_id: chatId, message: 'Yes, it is.' });
    const row = await queryOne(
      'SELECT sender_id FROM marketplace_chat_messages WHERE chat_id = $1 AND message = $2',
      [chatId, 'Yes, it is.']
    );
    expect(row.sender_id).toBe(SELLER);
  });

  test('someone else cannot join the conversation by knowing its id', async () => {
    const h = harness(user(OTHER));
    await h.handlers['marketplace:join_chat']({ chat_room_id: chatId });
    expect(h.joined).toEqual([]);
  });

  test('someone else joining by listing id is not put in the buyer\'s room either', async () => {
    const h = harness(user(OTHER));
    await h.handlers['marketplace:join_chat']({ listing_id: LISTING });
    expect(h.joined).toEqual([]);
  });

  test('a message sent to another pair\'s conversation goes to a conversation of the sender\'s own, or nowhere', async () => {
    const h = harness(user(OTHER));
    // No listing to fall back to: nothing is stored and nothing is broadcast.
    await h.handlers['marketplace:send_message']({ chat_room_id: chatId, message: 'injected' });

    expect(h.emittedToRooms).toEqual([]);
    expect(h.emittedToSelf.map((e) => e.event)).toContain('marketplace:chat_error');
    expect(await queryOne("SELECT id FROM marketplace_chat_messages WHERE message = 'injected'")).toBeFalsy();
  });

  test('a guest connection can neither join nor send', async () => {
    const h = harness({ id: 'guest_deadbeef', isGuest: true });
    await h.handlers['marketplace:join_chat']({ chat_room_id: chatId, listing_id: LISTING });
    await h.handlers['marketplace:send_message']({ chat_room_id: chatId, listing_id: LISTING, message: 'guest says hi' });

    expect(h.joined).toEqual([]);
    expect(h.emittedToRooms).toEqual([]);
  });

  test('an offer update from outside the conversation is not relayed', async () => {
    const outsider = harness(user(OTHER));
    await outsider.handlers['marketplace:offer_update']({ chat_room_id: chatId, offer_id: 'o1', status: 'accepted' });
    expect(outsider.emittedToRooms).toEqual([]);

    const seller = harness(user(SELLER));
    await seller.handlers['marketplace:offer_update']({ chat_room_id: chatId, offer_id: 'o1', status: 'accepted' });
    expect(seller.emittedToRooms).toHaveLength(1);
    expect(seller.emittedToRooms[0].room).toBe(`mkt_chat_${chatId}`);
  });
});
