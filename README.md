# Running StampApp on iPhone with Expo Go

This guide is for iPhone testers who want to open and try StampApp using **Expo Go**.

> Note: Expo Go is a development preview tool, not a production app installer. To use it, the developer's computer must be running the project server. In most cases, the iPhone and the developer's computer should be connected to the same Wi-Fi network.

---

## 1. Prepare Your iPhone

### 1.1 Download Expo Go

Open the App Store on your iPhone, then search for and download:

**Expo Go**

You can search this keyword in the App Store:

```text
Expo Go
```

After installing Expo Go, you do not need to log in to scan and open the project.

---

## 2. Start StampApp on the Developer's Computer

This step needs to be done by the project developer on their computer.

### 2.1 Open Terminal and Go to the Project Folder

```bash
cd "/Users/wickeyy/Documents/00 香港大学/StampApp/StampApp"
```

### 2.2 Install Dependencies

If dependencies have already been installed before, this step can be skipped.

```bash
npm install
```

### 2.3 Start the Expo Development Server

```bash
npm run start -- --clear
```

After the server starts successfully, a QR code will appear in the terminal or in the Expo browser page.

---

## 3. Open StampApp on iPhone

### Method 1: Scan with the iPhone Camera

1. Make sure your iPhone and the developer's computer are connected to the same Wi-Fi network.
2. Open the built-in **Camera** app on your iPhone.
3. Point the camera at the QR code shown on the computer.
4. Tap the Expo Go link that appears on the screen.
5. Your iPhone will open Expo Go automatically and start loading StampApp.

### Method 2: Scan Inside Expo Go

1. Open **Expo Go** on your iPhone.
2. Tap the scan option.
3. Scan the QR code shown on the developer's computer.
4. Wait for StampApp to finish loading.

---

## 4. First-Time Permission Prompts

### 4.1 Local Network Permission

If your iPhone asks whether Expo Go can access devices on your local network, choose:

**Allow**

Otherwise, Expo Go may not be able to connect to the development server on the computer.

### 4.2 Camera Permission

StampApp includes camera and QR scanning features. If iOS asks for camera permission, choose:

**Allow**

### 4.3 Initial Loading May Take Some Time

The first launch may take a little longer because Expo Go needs to download the JavaScript bundle. Waiting for several seconds or longer is normal.

---

## 5. Troubleshooting

### 5.1 The App Does Not Open After Scanning

Please check the following:

- The iPhone and the computer are connected to the same Wi-Fi network.
- The Expo development server is still running on the computer.
- Expo Go has permission to access the local network.
- The computer firewall is not blocking the connection.

You can try restarting the project:

```bash
npm run start -- --clear
```

---

### 5.2 The App Keeps Showing a Loading Screen

Try the following steps:

1. Close Expo Go and open it again.
2. On the developer's computer, press `Ctrl + C` in the terminal to stop the server.
3. Start the server again:

```bash
npm run start -- --clear
```

4. Scan the QR code again.

---

### 5.3 Expo Go Says It Cannot Connect to the Development Server

If the iPhone still cannot connect while on the same Wi-Fi network, try switching the connection mode in the Expo start page.

Recommended mode to try:

```text
Tunnel
```

If LAN mode does not work, Tunnel mode is often more reliable, although it may load more slowly.

---

### 5.4 Some Camera or QR Scanning Features Do Not Work

Expo Go supports many official Expo modules, but it may not fully support every native module.

This project includes the following camera and scanning-related dependencies:

- `expo-camera`
- `expo-barcode-scanner`
- `react-native-vision-camera`
- `react-native-worklets-core`

If the UI opens correctly but some camera features do not work in Expo Go, you may need to use a real build version instead, such as an Android APK, an iOS Development Build, or a TestFlight build.

---

## 6. After Testing

When testing is finished, the developer can stop the Expo development server by pressing:

```text
Ctrl + C
```

After the server stops, Expo Go on the iPhone will no longer be able to load this project until the developer starts the server again.
