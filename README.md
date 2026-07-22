<div align="center">
  <img src="https://via.placeholder.com/150/4f46e5/ffffff?text=LocalSampark" alt="LocalSampark Logo" />
  <h1>🚀 LocalSampark Super-App Ecosystem</h1>
  <p><strong>A Hyperlocal Enterprise Multi-Vertical Monorepo</strong></p>
</div>

---

## 📖 Overview
**LocalSampark** is a highly scalable, multi-tenant Super-App ecosystem engineered to bridge the gap between hyperlocal offline businesses and digital consumers. 

Structured as a robust **monorepo**, the platform separates the command center (Franchise Admin Dashboard) from the consumer-facing interface (React Native Mobile App), all governed by a heavily decoupled Node.js API gateway.

---

## 🏗️ System Architecture

The architecture is divided into three primary tiers:

### 1. Presentation Layer (Mobile & Web)
- **`apps/mobile/` (Consumer Super-App)**:
  - Built with **React Native & Expo Router**.
  - Features dynamic root tab navigation targeting distinct modules: E-Commerce, Local Jobs, Real Estate, Home Services, and the Community Townsquare.
  - Native integration with the **LocalWallet** for instant, 1-click ledger-based checkout.
- **`apps/admin/` (Enterprise Franchise Dashboard)**:
  - Built with **React** as an SPA.
  - A massive, multi-tenant CRM hub containing 20+ specialized management modules (`FranchiseTab`, `LeadsCRMTab`, `MedicalTab`, `AIAnalyticsTab`, etc.).
  - Serves as the operational command center for Franchise Partners to govern their geofenced territories.

### 2. Business Logic & API Gateway (`backend/`)
- **Decoupled Micro-Architecture**: Routing is entirely decoupled by vertical (e.g., `ecommerce/`, `services/`, `crm/`).
- **Atomic Concurrency**: Core financial and inventory operations (e.g., checkout pipelines, home service escrows) utilize strict `withTransaction()` locks to prevent race conditions and ensure double-entry ledger consistency.
- **Background Automation**: Leverages asynchronous **BullMQ** worker threads (via Redis) to manage delayed payouts to technicians and automated ticket expirations.

### 3. Data & Infrastructure Layer
- **Relational Persistence**: Uses SQL-based schemas via a unified `query()` driver, primed for SQLite locally and PostgreSQL in production.
- **Geospatial Indexing**: Calculates spatial distance mathematically (`latDelta` / `lngDelta`) via `BETWEEN` operators to execute rapid 2km radius geofencing without heavy PostGIS dependencies.
- **Containerization**: `docker-compose.staging.yml` orchestrates the Node.js API, Redis Queue Cache, and an Nginx Ingress proxy handling SSL termination and rate-limiting.

---

## 🧩 Core Ecosystem Verticals

| Vertical | Description | Key Capabilities |
|----------|-------------|------------------|
| **🛒 E-Commerce** | Hyperlocal Retail & Grocery | Multi-item atomic checkout, inventory reservation, LocalWallet escrow. |
| **🛠️ Home Services** | Plumbers, Electricians, etc. | Geofenced dispatching, inspection fee escrows, T+24h automated payouts. |
| **🎟️ Local Events** | Neighborhood meetups & shows | Digital QR passes, dynamic capacity throttling, automatic post-event cleanup. |
| **💼 Jobs & Properties** | Classifieds | Spatial filtering, lead generation, SaaS subscription unlocks for brokers. |
| **🌐 Townsquare** | Community Social Feed | Emergency SOS broadcasts, local bulletin boards, neighborhood engagement. |
| **💰 LocalWallet** | Double-Entry Financial Ledger | Cryptographic HMAC-SHA256 signature verification for top-ups, transaction audits. |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18+)
- **Redis** (Required for BullMQ Background Workers)
- **Expo CLI** (For Mobile App execution)

### Local Development Setup

1. **Clone the Monorepo:**
   ```bash
   git clone https://github.com/LocalSampark/SuperApp.git
   cd SuperApp
   ```

2. **Start the Backend API Gateway & Workers:**
   ```bash
   cd backend
   npm install
   cp .env.example .env  # Configure JWT_SECRET and REDIS_URL
   node src/server.js
   ```

3. **Start the Franchise Admin Portal:**
   ```bash
   cd apps/admin
   npm install
   npm start
   ```

4. **Launch the Consumer Mobile App:**
   ```bash
   cd apps/mobile
   npm install
   npx expo start
   ```

---

## 🛡️ DevOps & CI/CD
- **GitHub Actions**: Workflows are staged in `.github/workflows/` (`build.yml`, `deploy.yml`) for automated testing and releases.
- **Staging Deployment**: 
  Execute the staging environment locally to verify routing:
  ```bash
  docker-compose -f docker-compose.staging.yml up --build -d
  ```

---

## 🤖 AI Analytics & CRM Engine
The ecosystem provides Franchise Partners with deep-dive territory insights:
- **Predictive GMV Aggregation**: Real-time Gross Merchandise Value (GMV) metrics calculated across retail orders and service bookings.
- **Lead Pipeline Kanban**: Drag-and-drop interfaces (`LeadsCRMTab.js`) to seamlessly transition scraped, unverified businesses into actively paying SaaS subscribers.

---

<div align="center">
  <i>Built with precision for scalable hyperlocal commerce.</i>
</div>
