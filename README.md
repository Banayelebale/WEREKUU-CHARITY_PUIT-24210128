# Haven Hostel Management System (HMS)

A modern, cloud-ready hostel management system built with Node.js, serverless SQLite (Turso / LibSQL), and responsive web technologies. It is fully deployable to **Vercel** and **GitHub**, with an accompanying **Android mobile app** built with React Native / Expo.

---

## Key Features

- **Role-Based Access Control**:
  - **Main Admin (Porter)**: Full administrative power, user role approval, account editing, archiving/deletion, and encrypted configuration backups.
  - **Hall Master/Mistress**: Operational management (resident registration, room allocation, check-in, check-out).
  - **Hall President**: Read-only oversight of operations, room vacancies, and occupancy/revenue reports.
  - **Student**: Account registration and personal Haven Hall status tracking.
- **Two-Factor Authentication**: Passwords hashed with Argon2id + server pepper; 6-digit OTP delivery via HTTPS email API (Resend) or local Mailpit/demo code. Expired codes can be resent after password confirmation; the previous code is invalidated.
- **Hostel Operations**: Room capacity validation, gender segregation checks, room reassignments, check-ins, and check-outs.
- **Automated Audit Logging**: Append-only audit events tracking account updates, check-ins, check-outs, and role assignments.
- **Multi-Platform Support**: Responsive web application + native Android mobile application.

---

## Local Development

### Prerequisites
- Node.js 20.0 or newer.
- npm 10 or newer.

### Quick Start
```powershell
# 1. Generate local environment and secrets
npm run setup

# 2. Run migrations and seed fictional demo data
npm run db:migrate
npm run db:seed

# 3. Create the first Main Admin (Porter) account
npm run admin:create

# 4. Start local development server
npm start
```

Open `http://localhost:3000` in your browser.  
Health check endpoint: `http://localhost:3000/api/health`.

### Running Tests
To run the automated test suite (33 tests covering authentication, roles, operations, backups, and email):
```powershell
npm test
```

---

## Deploying to Vercel & GitHub

### Step 1: Push to GitHub
1. Make sure Git is installed on your computer.
2. Open a terminal in the project folder and run:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Haven HMS cloud-ready for Vercel"
   git branch -M main
   ```
3. Create a new repository on GitHub (e.g. `haven-hms`).
4. Link and push to GitHub:
   ```bash
   git remote add origin https://github.com/<your-username>/haven-hms.git
   git push -u origin main
   ```

### Step 2: Set Up Turso (Free Cloud SQLite)
Because Vercel is a serverless platform with an ephemeral filesystem, we use **Turso** (serverless SQLite in the cloud) so your data persists:
1. Go to [turso.tech](https://turso.tech) and sign up (free).
2. Create a database:
   - Either via the web dashboard: click **Create Database** -> name it `haven-hms`.
   - Or via Turso CLI: `turso db create haven-hms`.
3. Copy your database URL (`libsql://haven-hms-<username>.turso.io`) and create an auth token (`turso db tokens create haven-hms` or from the dashboard).

### Step 3: Deploy on Vercel
1. Go to [vercel.com](https://vercel.com) and log in.
2. Click **Add New...** -> **Project** and select your GitHub repository (`haven-hms`).
3. Under **Environment Variables**, add:
   - `TURSO_DATABASE_URL`: Your Turso database URL (`libsql://...`)
   - `TURSO_AUTH_TOKEN`: Your Turso auth token
   - `AUTH_PEPPER`: A random secret string with at least 32 characters (e.g. `openssl rand -base64 32`)
   - `BACKUP_ENCRYPTION_KEY`: A random secret string with at least 32 characters
   - `INITIAL_ADMIN_USERNAME`: `admin` (or your preferred username)
   - `INITIAL_ADMIN_EMAIL`: `admin@yourdomain.com` (or your email)
   - `INITIAL_ADMIN_PASSWORD`: A secure password (minimum 8 characters)
   - `RESEND_API_KEY`: Required for production OTP email, from [resend.com](https://resend.com)
   - `MAIL_FROM`: A sender address on a domain verified with Resend (for example, `Haven Hostel <login@your-verified-domain.com>`)
4. Click **Deploy**.
5. Vercel will build and deploy your site. You will receive a live URL (e.g., `https://haven-hms.vercel.app`).
   - The database tables will be created automatically on the first request!
   - You can sign in using your configured initial admin credentials.
   - OTP codes are sent to the email address on the account. Production does not expose OTPs in Vercel logs; configure a working Resend or SMTP sender before signing in.

---

## Android Mobile Version

The mobile app is located in the `mobile-app/` directory and built with Expo / React Native.

1. Navigate to the mobile app folder:
   ```bash
   cd mobile-app
   npm install
   ```
2. Configure your deployed Vercel URL in `mobile-app/.env`:
   ```env
   EXPO_PUBLIC_API_URL=https://your-hms-deployment.vercel.app
   ```
3. Run the mobile app:
   ```bash
   npm start
   ```
4. Build an installable `.apk` using EAS:
   ```bash
   npx eas-cli build -p android --profile preview
   ```
   See [mobile-app/README.md](mobile-app/README.md) for full details.
