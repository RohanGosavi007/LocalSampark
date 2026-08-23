# LocalSampark Real-Time Live Testing Guide

To test the mobile app on a physical device while communicating with your local backend, you need to expose your local backend securely to the internet. Two options are documented below — **Ngrok** (simplest, free tier gives a random URL each run) and **Cloudflare Tunnel** (free, no signup wall, gives a stable random `trycloudflare.com` URL per run unless you own a domain).

## Option A: Ngrok

### Prerequisites
1. Sign up for a free account at [ngrok.com](https://ngrok.com/)
2. Install Ngrok on your machine and authenticate it with your authtoken:
   ```powershell
   ngrok config add-authtoken <your_auth_token>
   ```

## Step 1: Start the Development Environment
Run the provided PowerShell script to launch all 3 environments (Backend, Web, Mobile) in separate windows:
```powershell
.\start-dev.ps1
```
- Backend runs on `http://localhost:5000`
- Web App runs on `http://localhost:3000`
- Mobile bundler runs on port 8081

## Step 2: Create the Secure Tunnel
Open a new PowerShell window and start an Ngrok tunnel for the backend:
```powershell
ngrok http 5000
```
Ngrok will display a public URL (e.g., `https://1234-56-78.ngrok-free.app`). Copy this URL.

## Step 3: Configure the Mobile App
Open `.env` in the `apps/mobile` directory (create it if it doesn't exist) and set your new Ngrok URL:
```env
EXPO_PUBLIC_API_URL=https://1234-56-78.ngrok-free.app/api/v1
```

*Note: You must restart the Expo bundler (close the mobile terminal and restart it) for the new environment variable to take effect.*

## Step 4: Test on Physical Device
1. Install the **Expo Go** app on your Android or iOS device.
2. Ensure your phone is connected to the internet.
3. Open the camera app (iOS) or Expo Go app (Android) and scan the QR code displayed in the mobile bundler terminal.
4. The app will build and open on your device, communicating directly with your local backend via the secure tunnel!

### (Optional) Also tunnel the web app
If you want to bug-hunt the Next.js site itself on a phone browser, open a second tunnel:
```powershell
ngrok http 3000
```
Ngrok's free tier only runs one tunnel per agent on the default plan — if `ngrok http 5000` is already running, start the second one with `ngrok http 3000 --config <(echo)` isn't needed; just run `ngrok http 3000` in another terminal with the same authtoken, or use `ngrok start --all` with a config file listing both. No `.env` change is needed for the web app itself; only cross-origin API calls it makes to the backend need `NEXT_PUBLIC_API_URL` pointed at the backend's tunnel URL in `apps/web/.env`.

---

## Option B: Cloudflare Tunnel

### Prerequisites
Install `cloudflared` (no account needed for a quick/anonymous tunnel):
```powershell
winget install --id Cloudflare.cloudflared
```

### Step 1: Start the Development Environment
Same as Option A:
```powershell
.\start-dev.ps1
```

### Step 2: Create the Secure Tunnel
```powershell
cloudflared tunnel --url http://localhost:5000
```
Cloudflared prints a public `https://<random-words>.trycloudflare.com` URL in the terminal — copy it. This is a "quick tunnel": free, anonymous, and the URL changes every time you restart `cloudflared`. (For a stable, reusable subdomain you'd own, `cloudflared tunnel create` + a Cloudflare account with a domain is the persistent-tunnel path — overkill for local bug-hunting.)

### Step 3: Configure the Mobile App
Same as Option A, but with the Cloudflare URL:
```env
EXPO_PUBLIC_API_URL=https://<random-words>.trycloudflare.com/api/v1
```
Restart the Expo bundler after saving.

### Step 4: Test on Physical Device
Same as Option A above.

---

## Troubleshooting
- **401/CORS errors through the tunnel**: the backend's CORS whitelist (`backend/src/server.js`) already allows requests with no `Origin` header (native mobile fetch) and the `ngrok-skip-browser-warning` header, so this should work out of the box for the mobile app. If you tunnel the *web app* itself and see CORS errors on API calls, add the web tunnel's origin to `CLIENT_URL` in `backend/.env` and restart the backend.
- **Ngrok free-tier interstitial page**: Ngrok free URLs show a warning page on first browser visit. The `ngrok-skip-browser-warning` header (already whitelisted server-side) only helps API clients that send it — a browser hitting the tunneled web app directly will see the interstitial once per browser; click through it.
- **Changed URL after restart**: both Ngrok's free tier and Cloudflare's quick tunnels issue a new random URL every time you restart the tunnel. Update `EXPO_PUBLIC_API_URL` and restart Expo each time.
