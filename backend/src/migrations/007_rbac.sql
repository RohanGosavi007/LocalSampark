-- Role change requests (user requests role upgrade)
CREATE TABLE role_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  requested_role VARCHAR(30) NOT NULL,
  current_role VARCHAR(30) NOT NULL,
  reason TEXT,
  supporting_docs JSONB DEFAULT '[]', -- [url1, url2]
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Multi-role support
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(30) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Per-user permission overrides
CREATE TABLE permission_overrides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  module VARCHAR(50) NOT NULL,
  is_allowed BOOLEAN NOT NULL,
  reason TEXT,
  set_by UUID REFERENCES users(id),
  set_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, module)
);
