# LocalSampark Real-Time Live Testing Guide

To test the mobile app on a physical device while communicating with your local backend, you need to expose your local backend securely to the internet. We will use **Ngrok** for this.

## Prerequisites
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
