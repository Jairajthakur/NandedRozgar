# NandedRozgar — React Native App (Expo)

Local job portal for Nanded — built with React Native + Expo.

---

## 🚀 Build APK in 5 steps

### 1. Clone & install
```bash
git clone https://github.com/YOUR_USERNAME/NandedRozgar.git
cd NandedRozgar
npm install
```

### 2. Set your backend URL
Edit `src/utils/constants.js` — change this one line:
```js
export const BASE_URL = 'https://YOUR-RAILWAY-URL.up.railway.app';
```

### 3. Install EAS CLI & login
```bash
npm install -g eas-cli
eas login
```
> Create a free account at https://expo.dev if you don't have one.

### 4. Build APK (free, runs in Expo's cloud)
```bash
eas build --platform android --profile preview
```
Wait ~10–15 minutes. You'll get a download link for the `.apk` file.

### 5. Install on phone
Download the `.apk` → transfer to Android phone → tap to install.

---

## 🧪 Test instantly (no build needed)

```bash
npx expo start
```
Install **Expo Go** from Play Store → scan the QR code → app runs on your phone immediately.

---

## 📁 Project structure

```
App.js                            ← Navigation root
app.json                          ← Expo config (app name, icon, package ID)
eas.json                          ← Build profiles (APK vs AAB)
assets/                           ← App icons & splash screen
src/
  utils/
    constants.js                  ← ✏️ BASE_URL lives here — change this!
    api.js                        ← HTTP client + secure token storage
  context/
    AuthContext.js                ← Global state (user, jobs, auth)
  components/
    UI.js                         ← Shared components (Btn, Input, Card…)
    JobCard.js                    ← Job listing card
  screens/
    LoginScreen.js                ← Login + Register
    BoardScreen.js                ← Job board with search & filters
    JobDetailScreen.js            ← Job detail, apply, WhatsApp
    PostScreen.js                 ← Post a job + payment
    ProfileScreen.js              ← Profile, my jobs, analytics
    AIScreen.js                   ← AI career assistant (Claude)
    AdminScreen.js                ← Admin: manage jobs, users, revenue
```

---

## ⚙️ App screens

| Screen | Who sees it |
|---|---|
| Login / Register | Everyone |
| Job Board | All logged-in users |
| Job Detail | All — seekers get WhatsApp + apply button |
| Post Job | Employers & Admins only |
| Profile | All — tabs differ by role |
| AI Assistant | All |
| Admin Panel | Admins only |

---

## 🔑 Only one thing to change

```js
// src/utils/constants.js
export const BASE_URL = 'https://YOUR-RAILWAY-URL.up.railway.app';
```

Everything else works out of the box once your backend is deployed.
