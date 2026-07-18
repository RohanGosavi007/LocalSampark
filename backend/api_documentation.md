# 🏘️ LocalSampark — REST API Documentation

This document covers route specifications, schemas, authorization workflows, and error payloads for the LocalSampark API endpoints.

---

## 🔒 Authentication & Headers

All authenticated routes require a JWT bearer token attached to the `Authorization` header:

```http
Authorization: Bearer <your_jwt_access_token>
```

---

## ⚡ Core API Endpoints

### 🔐 Authentication (`/api/v1/auth`)

* **POST `/send-otp`**: Requests a 6-digit OTP code to verify a phone number.
  * **Payload**: `{ "phoneNumber": "+919999999999" }`
  * **Response**: `{ "success": true, "message": "OTP sent successfully" }`

* **POST `/verify-otp`**: Verifies the OTP and registers or logs in the user.
  * **Payload**: `{ "phoneNumber": "+919999999999", "otp": "123456", "fullName": "John Doe", "regionId": "<region_uuid>" }`
  * **Response**: `{ "registered": true, "user": { ... }, "accessToken": "...", "refreshToken": "..." }`

* **POST `/refresh-token`**: Generates a new access token using a refresh token.
  * **Payload**: `{ "refreshToken": "..." }`
  * **Response**: `{ "accessToken": "..." }`

---

### 👤 User Profiles (`/api/v1/users`)

* **GET `/profile`**: Retrieves details of the authenticated user.
  * **Response**: `{ "id": "...", "phone_number": "...", "full_name": "John Doe", "role": "user" }`

---

### 🏪 Local Directory & Shops (`/api/v1/shops`)

* **GET `/`**: Retrieves nearby local shops filtered by distance and categories.
  * **Response**: `[ { "id": "...", "name": "Sharma Grocery", "category": "Grocery", "rating": 4.8 } ]`

* **POST `/register`**: Registers a new business profile.
  * **Payload**: `{ "name": "...", "category": "...", "latitude": 18.59, "longitude": 73.89 }`

---

### 🛵 Deliveries & Orders (`/api/v1/delivery`)

* **POST `/orders`**: Submits a delivery order request.
  * **Payload**: `{ "shopId": "...", "items": [...], "totalAmount": 250.00 }`
  * **Response**: `{ "id": "ORD-...", "status": "Pending", "eta": "15 mins" }`

* **GET `/orders/:id`**: Gets the tracking milestone details of a delivery order.
  * **Response**: `{ "id": "...", "statusIndex": 2, "agentName": "Rahul Shinde" }`

---

### 🏘️ Society Management (`/api/v1/societies`)

* **GET `/:id/visitors`**: Returns visitor log entries for a residential society.
  * **Response**: `[ { "id": 1, "name": "Ramesh Kumar", "purpose": "Repairs", "status": "Expected" } ]`

* **POST `/:id/visitors`**: Pre-approves a guest or service visitor, generating a gate pass.
  * **Payload**: `{ "name": "...", "phone": "...", "vehicle": "..." }`

---

### 📊 Administrative Tools (`/api/v1/admin`)

* **GET `/config`**: Fetches the dynamic JSON settings config (supports Redis caching).
  * **Response**: `[ { "config_key": "feed_radius_km", "config_value": 5.0 } ]`

* **GET `/regions`**: Fetches registered service regions (supports Redis caching).
  * **Response**: `[ { "id": "...", "name": "Dhanori", "state": "Maharashtra" } ]`

* **GET `/reports/generate`**: Exports user directories and platform stats in CSV format.
  * **Response**: Raw CSV download.
