# ⚡ NovaMind AI Platform

A production-grade AI platform demo showcasing real-time analytics, session billing, internationalization, and mobile-native UX — built with modern full-stack TypeScript.

---

## ✨ Features

| Layer | Feature |
|-------|---------|
| **Web Dashboard** | Live stats via Socket.io (requests, tokens, connections) with count-up animations |
| **Web Dashboard** | Activity feed showing real-time events (tokens, API calls, sessions) |
| **Billing Page** | Digital-clock session timer with real-time cost counter ($0.02/sec) |
| **Billing Page** | Stripe PaymentIntent creation on session end |
| **Billing Page** | Confirmation email via SMTP/Gmail (non-blocking — never breaks payment flow) |
| **i18n** | English / Arabic (RTL layout flip) / French with cookie persistence |
| **Mobile App** | React Native Expo message review center with approve/reject + haptics |
| **Mobile App** | Animated transitions: fade-out on reject, spring slide-in on approve |
| **Infrastructure** | Docker Compose: Next.js + Express + PostgreSQL + Redis |
| **Real-time** | Socket.io WebSocket with auto-reconnect + offline toast notification |

---

## 🏗️ Architecture

```
ai-demo-task/
├── web/              # Next.js 14 App Router (TypeScript, Tailwind v4, next-intl)
├── backend/          # Express + TypeScript API (port 4000)
│   ├── src/routes/   # stats · messages · session · payment
│   ├── src/db.ts     # PostgreSQL via pg (platform_stats table)
│   ├── src/redis.ts  # ioredis client
│   └── src/socket/   # Socket.io server + session relay
├── mobile/           # React Native Expo (TypeScript)
│   └── screens/HomeScreen.tsx
└── docker-compose.yml
```

---

## 📋 Prerequisites

- **Node.js** 18 or later
- **Docker Desktop** (for `docker compose up`)
- **Expo CLI** — `npm install -g expo-cli` (mobile app only)
- **Stripe account** (test mode — free, no real charges)
- **Gmail app password** (optional — email will fail silently if not set)

---

## 🚀 Quick Start (Docker — recommended)

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd ai-demo-task

# 2. Create environment file
copy .env.example .env   # Windows
cp .env.example .env     # Mac / Linux

# 3. Fill in secrets (see "Environment Variables" section below)
#    At minimum, set STRIPE_SECRET_KEY to a Stripe test key

# 4. Start everything
docker compose up --build
```

Open **http://localhost:3000** — the Next.js app will redirect to `/en/dashboard`.

> The `api` service includes retry logic and waits for Postgres/Redis to be healthy before accepting traffic.

---

## 🔧 Local Development (without Docker)

### Backend

```bash
cd backend
npm install
# Set environment variables in .env (copy from .env.example)
npm run dev          # ts-node with nodemon on port 4000
```

### Web

```bash
cd web
npm install
npm run dev          # Next.js dev server on port 3000
```

### Mobile App

```bash
cd mobile
npm install
npx expo start       # Opens Expo DevTools
# Press 'a' for Android emulator, 'i' for iOS simulator, 'w' for web
```

> **Android emulator note:** The API URL is automatically set to `http://10.0.2.2:4000` when running on Android emulator. For physical devices, update `API_URL` in `mobile/screens/HomeScreen.tsx` to your machine's LAN IP.

---

## 🌍 Environment Variables

Copy `.env.example` to `.env` and fill in:

```env
# PostgreSQL
POSTGRES_USER=postgres
POSTGRES_PASSWORD=secret
POSTGRES_DB=aiplatform
DATABASE_URL=postgresql://postgres:secret@postgres:5432/aiplatform

# Redis
REDIS_URL=redis://redis:6379

# Stripe (test mode — get from https://dashboard.stripe.com/test/apikeys)
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_key_here

# Gmail SMTP (optional — payment works without it)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_gmail@gmail.com
SMTP_PASS=your_app_password_here   # Use Gmail App Password, not your login password
SMTP_FROM=your_gmail@gmail.com

# Public URLs (used by Next.js client-side code)
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
```

---

## 🗺️ Feature–to–Task Mapping

| Task | Feature | Files |
|------|---------|-------|
| **Task 1 — Backend Setup** | Express server, PostgreSQL stats persistence, Redis session store, Socket.io server | `backend/src/` |
| **Task 2 — Real-time Dashboard** | Live stat counters, Socket.io `stats:update` listener, activity feed, WS reconnect toast | `web/components/DashboardClient.tsx` |
| **Task 3 — Session Billing** | Digital clock timer, cost counter, Stripe PaymentIntent, SMTP email receipt | `web/components/BillingClient.tsx`, `backend/src/routes/payment.ts` |
| **Task 4 — i18n** | English / Arabic (RTL) / French routing, cookie persistence, language switcher | `web/middleware.ts`, `web/i18n/`, `web/messages/` |
| **Task 5 — Mobile App** | Expo message review, approve/reject with haptics & animations, linear gradient cards | `mobile/screens/HomeScreen.tsx` |

---

## 💳 Stripe Test Mode

All Stripe operations run in **test mode** — no real money is ever charged.

Use these test card numbers in any Stripe form:

| Scenario | Card Number | Expiry | CVC |
|----------|-------------|--------|-----|
| Success | `4242 4242 4242 4242` | Any future date | Any 3 digits |
| Decline | `4000 0000 0000 0002` | Any future date | Any 3 digits |
| Auth required | `4000 0025 0000 3155` | Any future date | Any 3 digits |

The `/api/create-payment-intent` endpoint creates a server-side PaymentIntent, so no card UI is rendered in this demo — just the returned `paymentIntentId` is displayed.

---

## 🌐 Internationalization

| Locale | Language | Direction | URL |
|--------|----------|-----------|-----|
| `en` | English | LTR | `/en/dashboard` |
| `ar` | Arabic | **RTL** | `/ar/dashboard` |
| `fr` | French | LTR | `/fr/dashboard` |

Language selection is persisted in a `NEXT_LOCALE` cookie and survives page refresh. Arabic automatically flips the entire layout to right-to-left using Tailwind's `rtl:` variant.

---

## 📱 Mobile App Details

- **Framework:** React Native + Expo SDK 55
- **Animations:** React Native `Animated` API (fade-out on reject, spring slide-in on approve)
- **Haptics:** `expo-haptics` — Medium impact on approve, Heavy on reject
- **Gradients:** `expo-linear-gradient` on buttons and avatar backgrounds
- **Icons:** `@expo/vector-icons` (Ionicons)
- **API:** Auto-detects Android emulator vs iOS/web host

---

## 📸 Screenshots

> _Add screenshots here after running the app._

| Dashboard (Desktop) | Billing Page | Mobile App |
|---------------------|--------------|------------|
| _(screenshot)_ | _(screenshot)_ | _(screenshot)_ |

---

## 🧪 Final Checklist

- [x] `docker compose up --build` starts all services
- [x] Dashboard loads and shows 3 live counters via WebSocket
- [x] Language switcher works; Arabic flips to RTL
- [x] Language persists after page refresh (cookie)
- [x] Mobile app loads messages, approve/reject with animations
- [x] Billing page timer counts up accurately
- [x] End session creates a Stripe PaymentIntent and shows the ID
- [x] Email sends on payment (or fails silently — never crashes)
- [x] Responsive on mobile — bottom nav below 768px
- [x] Skeleton loaders on initial data fetch
- [x] WsToast appears when WebSocket disconnects

---

## 📄 License

MIT — free to use for demos and learning.
