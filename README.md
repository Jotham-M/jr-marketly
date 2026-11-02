# JR Marketly

JR Marketly is a responsive multi-vendor marketplace and installable progressive web app, with Capacitor Android and iOS app projects. Customers can discover products, create accounts, manage a shopping bag, and place pay-on-delivery orders. Makers can register as vendors and create product listings. The Express API stores accounts, listings, inventory, and orders in PostgreSQL.

## Run locally

Requirements: Node.js 18.11 or newer and PostgreSQL.

1. Install the Node dependencies with `npm install`.
2. Create a PostgreSQL database named `ecommerce_db`.
3. Copy `.env.example` to `.env`, then set `DATABASE_URL` and a long, random `JWT_SECRET`.
4. Apply the database schema with `psql -d ecommerce_db -f schema.sql` (or run `schema.sql` in your PostgreSQL client).
5. Start the app with `npm start`, then open `http://localhost:5000`. For development with automatic restarts, use `npm run dev`.

The app and API share one origin. Set `CLIENT_ORIGIN` to your deployed web origin if you host a separate client. The API also allows the standard Capacitor Android and iOS localhost origins; add any other trusted origin to `CLIENT_ORIGIN` as a comma-separated list.

## Android and iOS apps

The mobile app reuses the storefront inside a native Capacitor shell. It can run with local demo listings and device-only accounts, or connect to a deployed JR Marketly API.

1. Install the dependencies with `npm install`.
2. Set `apiBaseUrl` in `public/runtime-config.js` to the **HTTPS origin** of your deployed API (for example `https://api.example.com`). Leave it blank for the local demo. Never put database credentials, private API keys, or signing secrets in this client-side file.
3. Run `npm run mobile:sync` to copy the storefront and API configuration into both native projects.
4. On Windows with Android Studio, Android SDK, and Java 21 installed, run `npm run android:apk`. Install the debug APK on a development Android device from `android/app/build/outputs/apk/debug/app-debug.apk`. For a Play Store release, open the Android project in Android Studio and create a signed release build.
5. On a Mac with Xcode, run `npm run ios:sync`, then `npm run ios:open`. Select your Apple developer team and configure signing in Xcode. Build and install on an iPhone or archive for distribution through TestFlight/App Store.

The Android and iOS native project scaffolds and JR Marketly app icons are included. An iOS `.ipa` cannot be compiled or signed on Windows. The Android command produces a development/debug APK, not a Play Store-signed release.

The app's native package ID is `com.jrmarketly.app`. Choose the final production package/bundle ID before publishing; app-store IDs should be treated as permanent.

## Demo mode

When a database is not configured or available, the storefront remains usable with sample listings. Demo accounts, vendor listings, basket contents, and orders are saved in that browser's local storage and are not shared with other devices. This mode is for evaluation, not production.

## Checkout and payments

Checkout collects delivery details and creates an order with **pay on delivery** as the payment method. This project does not process online card or wallet payments. No payment-card details are collected or stored. Connect a payment provider and configure its credentials before offering online payment.

The newsletter form is a visual preview and is not connected to an email service.

## API overview

- `GET /api/health` — database and authentication readiness
- `GET /api/products` — available product listings
- `POST /api/products` — create a listing (vendor/admin bearer token)
- `POST /api/auth/register` and `POST /api/auth/login` — create an account or sign in
- `POST /api/orders` — place an inventory-checked customer order with delivery details
- `GET /api/orders/mine` — customer order history
- `GET /api/orders/sales` — vendor sales
