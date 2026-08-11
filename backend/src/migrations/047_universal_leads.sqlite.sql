CREATE TABLE IF NOT EXISTS universal_leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    lead_type VARCHAR(50) NOT NULL, -- 'FAVORITE', 'ABANDONED_CART', 'INQUIRY'
    lead_status VARCHAR(50) DEFAULT 'NEW', -- 'NEW', 'CONTACTED', 'CONVERTED'
    content TEXT, -- JSON or string context about the lead
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shop_id) REFERENCES Shop(id),
    FOREIGN KEY (user_id) REFERENCES User(id)
);

CREATE INDEX idx_universal_leads_shop ON universal_leads(shop_id);
CREATE INDEX idx_universal_leads_user ON universal_leads(user_id);
