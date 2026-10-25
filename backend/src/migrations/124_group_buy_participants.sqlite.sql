-- 124 (SQLite): who has joined a group-buying deal. See 124_group_buy_participants.sql.

CREATE TABLE IF NOT EXISTS group_buying_participants (
    id         TEXT PRIMARY KEY,
    deal_id    TEXT NOT NULL,
    user_id    TEXT NOT NULL,
    joined_at  TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_group_buy_one_join ON group_buying_participants (deal_id, user_id);
