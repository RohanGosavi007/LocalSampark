-- Tables the running code queries that no migration created.
--
-- backend/src/__tests__/tablesExist.test.js derives the schema from these
-- migrations and checks it against every table named in runtime SQL. It found
-- 39. Six were name drift onto the Prisma half of the old dual schema and were
-- fixed by repointing the query (shops → local_shops, products → shop_products,
-- appointments → shop_appointments, notifications → shop_notifications,
-- franchises → franchise_partners, delivery_routes → orders). The rest are
-- genuinely absent, and this file creates them.
--
-- Every column below is taken from a statement the code actually runs — the
-- INSERT column lists, UPDATE SET clauses and WHERE predicates in the files
-- named against each table. Where the code never reveals a type, TEXT is used;
-- where it compares against a number or sums a column, a numeric type is.
--
-- Until this ran, each of these endpoints answered 500 on any database built
-- from the migrations alone, which is every fresh deployment.

BEGIN;

-- ─── Payments ────────────────────────────────────────────────────────────────
-- modules/payments/controllers/payment.controller.js. This is the gateway order
-- ledger: it records the Razorpay/Cashfree order before the customer pays and is
-- what the webhook marks paid or failed. Without it a payment could be taken and
-- nothing on our side would know.
CREATE TABLE IF NOT EXISTS payments (
    id               TEXT PRIMARY KEY,
    user_id          UUID REFERENCES users(id) ON DELETE SET NULL,
    order_id         TEXT,
    amount           REAL NOT NULL,
    currency         TEXT DEFAULT 'INR',
    -- created | paid | failed | refunded
    status           TEXT NOT NULL DEFAULT 'created',
    gateway_order_id TEXT,
    payment_id       TEXT,
    receipt          TEXT,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payments_gateway_order ON payments(gateway_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);

-- ─── Franchise money ─────────────────────────────────────────────────────────
-- modules/ecommerce/routes/bills.routes.js credits a commission per transaction.
-- franchise_payouts already exists but holds periodic settlements, not the
-- individual earnings that roll up into one.
CREATE TABLE IF NOT EXISTS franchise_earnings (
    id           TEXT PRIMARY KEY,
    franchise_id UUID REFERENCES franchise_partners(id) ON DELETE CASCADE,
    amount       REAL NOT NULL DEFAULT 0,
    -- bill_payment | order_commission | subscription | ...
    source_type  TEXT,
    reference_id TEXT,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_franchise_earnings_partner ON franchise_earnings(franchise_id, created_at DESC);

-- modules/crm/routes/admin.routes.js counts payout requests per shop when
-- flagging unusual withdrawal activity.
CREATE TABLE IF NOT EXISTS payout_requests (
    id           TEXT PRIMARY KEY,
    shop_id      UUID REFERENCES local_shops(id) ON DELETE CASCADE,
    requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
    amount       REAL NOT NULL DEFAULT 0,
    -- pending | approved | paid | rejected
    status       TEXT NOT NULL DEFAULT 'pending',
    upi_reference TEXT,
    notes        TEXT,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payout_requests_shop ON payout_requests(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON payout_requests(status);

-- ─── CRM: leads, campaigns, tickets, disputes ────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
    id                TEXT PRIMARY KEY,
    shop_id           UUID REFERENCES local_shops(id) ON DELETE CASCADE,
    lead_number       TEXT,
    name              TEXT,
    phone             TEXT,
    email             TEXT,
    source            TEXT,
    inquiry_type      TEXT,
    message           TEXT,
    budget            REAL,
    location          TEXT,
    property_type     TEXT,
    user_id           UUID REFERENCES users(id) ON DELETE SET NULL,
    referred_by       TEXT,
    -- new | contacted | qualified | won | lost
    pipeline_stage    TEXT DEFAULT 'new',
    status            TEXT DEFAULT 'open',
    last_contacted_at TIMESTAMPTZ,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_leads_shop ON leads(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(shop_id, pipeline_stage);

CREATE TABLE IF NOT EXISTS lead_activities (
    id             TEXT PRIMARY KEY,
    lead_id        TEXT REFERENCES leads(id) ON DELETE CASCADE,
    activity_type  TEXT,
    notes          TEXT,
    call_duration  INTEGER,
    next_follow_up TIMESTAMPTZ,
    created_by     UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead ON lead_activities(lead_id, created_at DESC);

CREATE TABLE IF NOT EXISTS directory_listings (
    id               TEXT PRIMARY KEY,
    shop_id          UUID REFERENCES local_shops(id) ON DELETE CASCADE,
    title            TEXT NOT NULL,
    description      TEXT,
    listing_type     TEXT,
    price            REAL,
    location         TEXT,
    photos           TEXT DEFAULT '[]',
    features         TEXT DEFAULT '[]',
    contact_phone    TEXT,
    contact_whatsapp TEXT,
    is_featured      BOOLEAN DEFAULT FALSE,
    status           TEXT DEFAULT 'active',
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_directory_listings_shop ON directory_listings(shop_id, status);

CREATE TABLE IF NOT EXISTS crm_campaigns (
    id              TEXT PRIMARY KEY,
    owner_id        UUID REFERENCES users(id) ON DELETE CASCADE,
    campaign_type   TEXT,
    target_audience TEXT,
    status          TEXT DEFAULT 'draft',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_crm_campaigns_owner ON crm_campaigns(owner_id, created_at DESC);

-- jobs/campaignScheduler.js activates and expires these on a timer, so the
-- datetime columns and status are load-bearing.
CREATE TABLE IF NOT EXISTS shop_campaigns (
    id                 TEXT PRIMARY KEY,
    shop_id            UUID REFERENCES local_shops(id) ON DELETE CASCADE,
    title              TEXT NOT NULL,
    discount_type      TEXT,
    discount_value     REAL,
    start_datetime     TIMESTAMPTZ,
    end_datetime       TIMESTAMPTZ,
    radius_km          REAL,
    is_flash_sale      BOOLEAN DEFAULT FALSE,
    fomo_timer_minutes INTEGER,
    status             TEXT DEFAULT 'scheduled',
    created_at         TIMESTAMPTZ DEFAULT NOW(),
    updated_at         TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_shop_campaigns_shop ON shop_campaigns(shop_id, status);
CREATE INDEX IF NOT EXISTS idx_shop_campaigns_window ON shop_campaigns(status, start_datetime, end_datetime);

CREATE TABLE IF NOT EXISTS support_tickets (
    id          TEXT PRIMARY KEY,
    user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    subject     TEXT,
    description TEXT,
    category    TEXT,
    priority    TEXT DEFAULT 'medium',
    -- open | in_progress | resolved | closed
    status      TEXT DEFAULT 'open',
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status, created_at DESC);

CREATE TABLE IF NOT EXISTS disputes (
    id          TEXT PRIMARY KEY,
    user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    order_id    TEXT,
    shop_id     UUID REFERENCES local_shops(id) ON DELETE SET NULL,
    type        TEXT,
    description TEXT,
    -- open | investigating | resolved | rejected
    status      TEXT DEFAULT 'open',
    resolution  TEXT,
    resolved_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_disputes_user ON disputes(user_id);

-- ─── Service verticals ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS care_providers (
    id          TEXT PRIMARY KEY,
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    name        TEXT,
    care_type   TEXT,
    pincode     TEXT,
    hourly_rate REAL,
    bio         TEXT,
    status      TEXT DEFAULT 'pending',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_care_providers_status ON care_providers(status);

CREATE TABLE IF NOT EXISTS care_requests (
    id          TEXT PRIMARY KEY,
    provider_id TEXT REFERENCES care_providers(id) ON DELETE CASCADE,
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    date        TEXT,
    notes       TEXT,
    status      TEXT DEFAULT 'pending',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_care_requests_provider ON care_requests(provider_id, status);

CREATE TABLE IF NOT EXISTS home_chef_meals (
    id               TEXT PRIMARY KEY,
    chef_id          UUID REFERENCES users(id) ON DELETE CASCADE,
    meal_name        TEXT NOT NULL,
    description      TEXT,
    price            REAL NOT NULL DEFAULT 0,
    total_plates     INTEGER DEFAULT 0,
    -- Decremented as orders come in; the order handler checks it before
    -- accepting, so it must not be nullable in practice.
    available_plates INTEGER DEFAULT 0,
    is_veg           BOOLEAN DEFAULT TRUE,
    status           TEXT DEFAULT 'available',
    created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_home_chef_meals_chef ON home_chef_meals(chef_id, status);

CREATE TABLE IF NOT EXISTS home_chef_orders (
    id               TEXT PRIMARY KEY,
    meal_id          TEXT REFERENCES home_chef_meals(id) ON DELETE CASCADE,
    customer_id      UUID REFERENCES users(id) ON DELETE CASCADE,
    quantity         INTEGER NOT NULL DEFAULT 1,
    final_price      REAL NOT NULL DEFAULT 0,
    discount_applied REAL DEFAULT 0,
    delivery_option  TEXT,
    status           TEXT DEFAULT 'pending',
    created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_home_chef_orders_customer ON home_chef_orders(customer_id, created_at DESC);

CREATE TABLE IF NOT EXISTS medical_donors (
    id          TEXT PRIMARY KEY,
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    blood_group TEXT,
    pincode     TEXT,
    location    TEXT,
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_medical_donors_lookup ON medical_donors(blood_group, pincode, is_active);

CREATE TABLE IF NOT EXISTS pet_services (
    id          TEXT PRIMARY KEY,
    shop_id     UUID REFERENCES local_shops(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    description TEXT,
    price       REAL,
    pet_type    TEXT,
    duration_minutes INTEGER,
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_subscriptions (
    id           TEXT PRIMARY KEY,
    user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
    shop_id      UUID REFERENCES local_shops(id) ON DELETE SET NULL,
    product_name TEXT,
    quantity     INTEGER DEFAULT 1,
    frequency    TEXT DEFAULT 'daily',
    price        REAL,
    start_date   TEXT,
    end_date     TEXT,
    status       TEXT DEFAULT 'active',
    created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_daily_subscriptions_user ON daily_subscriptions(user_id, status);

CREATE TABLE IF NOT EXISTS group_buying_deals (
    id              TEXT PRIMARY KEY,
    shop_id         UUID REFERENCES local_shops(id) ON DELETE CASCADE,
    product_id      UUID REFERENCES shop_products(id) ON DELETE SET NULL,
    title           TEXT NOT NULL,
    min_buyers      INTEGER NOT NULL DEFAULT 1,
    current_buyers  INTEGER NOT NULL DEFAULT 0,
    wholesale_price REAL,
    end_datetime    TIMESTAMPTZ,
    scope           TEXT,
    society_id      TEXT,
    status          TEXT DEFAULT 'open',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_group_buying_status ON group_buying_deals(status, end_datetime);

CREATE TABLE IF NOT EXISTS trust_reviews (
    id                TEXT PRIMARY KEY,
    shop_id           UUID REFERENCES local_shops(id) ON DELETE CASCADE,
    user_id           UUID REFERENCES users(id) ON DELETE CASCADE,
    video_url         TEXT,
    rating            INTEGER,
    review_text       TEXT,
    is_verified_buyer BOOLEAN DEFAULT FALSE,
    created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_trust_reviews_shop ON trust_reviews(shop_id, created_at DESC);

-- ─── Token queue (walk-in reception) ─────────────────────────────────────────
-- The counter is upserted per shop, so shop_id must be unique for the
-- ON CONFLICT (shop_id) in token-queue.routes.js to resolve.
CREATE TABLE IF NOT EXISTS token_queues (
    shop_id             UUID PRIMARY KEY REFERENCES local_shops(id) ON DELETE CASCADE,
    current_token       INTEGER DEFAULT 0,
    total_tokens_today  INTEGER DEFAULT 0,
    avg_service_minutes INTEGER DEFAULT 10,
    is_paused           BOOLEAN DEFAULT FALSE,
    last_updated        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS token_queue_visitors (
    id            TEXT PRIMARY KEY,
    shop_id       UUID REFERENCES local_shops(id) ON DELETE CASCADE,
    token_number  INTEGER NOT NULL,
    visitor_name  TEXT,
    visitor_phone TEXT,
    user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
    service_type  TEXT,
    status        TEXT DEFAULT 'waiting',
    created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_token_visitors_shop ON token_queue_visitors(shop_id, status, token_number);

-- ─── Job cards (garage / repair work orders) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS job_card_parts (
    id           TEXT PRIMARY KEY,
    job_card_id  TEXT REFERENCES job_cards(id) ON DELETE CASCADE,
    part_name    TEXT NOT NULL,
    part_type    TEXT,
    quantity     INTEGER DEFAULT 1,
    unit_cost    REAL DEFAULT 0,
    total_cost   REAL DEFAULT 0,
    notes        TEXT,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_job_card_parts ON job_card_parts(job_card_id);

CREATE TABLE IF NOT EXISTS job_card_photos (
    id          TEXT PRIMARY KEY,
    job_card_id TEXT REFERENCES job_cards(id) ON DELETE CASCADE,
    photo_url   TEXT NOT NULL,
    photo_type  TEXT,
    caption     TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_job_card_photos ON job_card_photos(job_card_id);

CREATE TABLE IF NOT EXISTS job_card_milestones (
    id           TEXT PRIMARY KEY,
    job_card_id  TEXT REFERENCES job_cards(id) ON DELETE CASCADE,
    step_order   INTEGER DEFAULT 0,
    title        TEXT NOT NULL,
    description  TEXT,
    status       TEXT DEFAULT 'pending',
    notes        TEXT,
    photos       TEXT DEFAULT '[]',
    completed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    completed_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_job_card_milestones ON job_card_milestones(job_card_id, step_order);

-- ─── Community ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS garage_sale_items (
    id          TEXT PRIMARY KEY,
    seller_id   UUID REFERENCES users(id) ON DELETE CASCADE,
    buyer_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    item_name   TEXT NOT NULL,
    description TEXT,
    price_coins INTEGER DEFAULT 0,
    status      TEXT DEFAULT 'available',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_garage_sale_status ON garage_sale_items(status, created_at DESC);

CREATE TABLE IF NOT EXISTS lost_found_alerts (
    id           TEXT PRIMARY KEY,
    user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
    finder_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    item_name    TEXT NOT NULL,
    description  TEXT,
    pincode      TEXT,
    bounty_coins INTEGER DEFAULT 0,
    status       TEXT DEFAULT 'open',
    created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lost_found_status ON lost_found_alerts(status, pincode);

CREATE TABLE IF NOT EXISTS scrap_requests (
    id                TEXT PRIMARY KEY,
    resident_id       UUID REFERENCES users(id) ON DELETE CASCADE,
    dealer_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    scrap_type        TEXT,
    approx_weight     REAL,
    address           TEXT,
    pincode           TEXT,
    payout_preference TEXT,
    coin_reward       INTEGER DEFAULT 0,
    status            TEXT DEFAULT 'open',
    created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_scrap_requests_status ON scrap_requests(status, pincode);

-- ─── Rewards, settings, surge, admin ops ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS reward_catalog (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    description TEXT,
    coin_cost   INTEGER NOT NULL DEFAULT 0,
    image_url   TEXT,
    stock       INTEGER,
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reward_catalog_cost ON reward_catalog(is_active, coin_cost);

-- services/AdService.js reads a single value by key.
CREATE TABLE IF NOT EXISTS system_settings (
    key        TEXT PRIMARY KEY,
    value      TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- services/surge.engine.js reads one row per pincode; the upsert in
-- admin.surge.controller.js conflicts on pincode.
CREATE TABLE IF NOT EXISTS territory_surge_configs (
    pincode           TEXT PRIMARY KEY,
    enabled           BOOLEAN DEFAULT FALSE,
    -- multiplier | flat
    cap_mode          TEXT DEFAULT 'multiplier',
    max_multiplier    REAL DEFAULT 1.5,
    max_flat_rupee    REAL DEFAULT 30,
    base_delivery_fee REAL DEFAULT 30,
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_environment_requests (
    id            TEXT PRIMARY KEY,
    material_type TEXT,
    reporter_name TEXT,
    reporter_id   UUID REFERENCES users(id) ON DELETE SET NULL,
    pincode       TEXT,
    notes         TEXT,
    status        TEXT DEFAULT 'pending',
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_mobility_vehicles (
    id          TEXT PRIMARY KEY,
    vehicle_no  TEXT,
    driver_name TEXT,
    driver_id   UUID REFERENCES users(id) ON DELETE SET NULL,
    vehicle_type TEXT,
    status      TEXT DEFAULT 'active',
    is_verified BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Columns the order path writes that orders does not have ────────────────
-- unified-superapp.controller.js accepts specialInstructions at checkout and had
-- nowhere to put it, so the note a customer typed ("leave at the gate") was
-- discarded silently.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS special_instructions TEXT;

COMMIT;
