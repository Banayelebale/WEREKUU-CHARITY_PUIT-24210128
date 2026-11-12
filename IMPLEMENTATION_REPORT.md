# Haven Hostel Management System — Implementation Report

**Prepared:** 18 October 2026  
**Project:** Haven Hostel Management System  
**Technology:** Node.js 24+, native Node.js HTTP server, SQLite, HTML, CSS, and JavaScript

## 1. Project overview

Haven is a local-first hostel management application. It provides account registration and sign-in, role-based administration, Haven Hall resident registration, room allocation, check-in/check-out, occupancy and room-value reports, an audit log, and encrypted configuration backups.

The application is divided into a browser interface in `public/`, server-side authentication and operations in `src/`, a SQLite database under `data/`, and automated tests in `test/`. Its Node.js server exposes JSON endpoints and serves an explicit allowlist of public files.

## 2. Database implementation

The database is SQLite, currently stored at `data/hostel.sqlite`. The schema is defined in `src/schema.sql` and includes:

| Table | Purpose |
|---|---|
| `users` | User identities, role, password hash, password salt, and account timestamps |
| `archived_users` | Recoverable copies of archived accounts |
| `auth_sessions` | Hashed session tokens and expiration |
| `otp_challenges` | One-time verification challenge hashes, expiry, and attempt counts |
| `rooms` | Room number, gender, capacity, monthly rate, and active status |
| `hostel_registrations` | Student contact and emergency details, room assignment, status, and check-in/out times |
| `system_settings` | System configuration values |
| `audit_logs` | Account and hostel operation events |

At the time this report was prepared, the local database contained **15 active rooms**, **51 hostel registrations** (36 checked in, 4 checked out, and 11 pending), **5 active accounts**, **0 archived accounts**, and **57 audit entries**. These are a snapshot of the local database and may change as the app is used.

## 3. Authentication and password protection

Registration validates username, email, and password length, and SQLite enforces case-insensitive unique usernames and emails. Public registration creates a Student account; requests for Hall President or Hall Master/Mistress access are stored for Main Admin review. Main Admin accounts are created separately through `npm run admin:create`.

Passwords are never stored as plain text. `src/auth.js` generates a unique 16-byte random salt for each password and hashes the password with Node.js Argon2id using the server-side `AUTH_PEPPER` secret. The implementation uses Argon2id with a 32-byte output, two passes, parallelism one, and 19,456 KiB of memory. The pepper must be at least 32 bytes and is loaded from the environment rather than shown in the UI.

Password hashes and salts are deliberately **not reproduced in this report**. They are sensitive authentication data and should not be included in documents submitted or shared. The database stores a hash in `password_hash` and the per-user salt in `password_salt`; the pepper is not stored in the database. A demonstration can show the algorithm, generation process, and redacted field names without publishing the actual values:

text
password_hash: [REDACTED — Argon2id result]
password_salt: [REDACTED — unique random per-user salt]
AUTH_PEPPER:   [REDACTED — server-side environment secret]


Sign-in checks the password and then requires a one-time verification code. OTP challenges expire after five minutes and have a limited number of attempts. The server can send codes using SMTP, the Resend HTTPS API, or local Mailpit (SMTP port 1025, inbox UI port 8025). Codes sent by a configured provider are not returned to the browser or written to the server log. If no provider is configured, the development-only `DEMO_OTP=true` fallback displays the code in the UI and server terminal. Session tokens are stored hashed, expire after eight hours, and use an HTTP-only cookie.

## 4. Current active account directory

The following usernames and email addresses were read from the local `users` table. Role names below use the application's four-role terminology.

| Username | Email | Role |
|---|---|---|
| `browser_demo` | `browser-demo@example.test` | Student |
| `demo_1792101316872` | `demo_1792101316872@example.test` | Student |
| `Banayelebale` | `banayelebale@gmail.com` | Main Admin (Porter) |
| `Deborah` | `derbyd@gmail.com` | Student |
| `Porter` | `missporter@gmail.com` | Student |

This list contains personal account identifiers. Remove or anonymize it before sharing this report outside the project team or submitting it where the account owners have not consented.

## 5. Roles and account management

The application defines four roles:

| Role | Main permissions |
|---|---|
| Main Admin (Porter) | Manage non-Main-Admin accounts, configuration backups, and all hostel operations |
| Hall Master/Mistress | Manage resident allocation, room moves, check-in, and check-out |
| Hall President | View hostel operations and reports |
| Student | Submit and view their own Haven Hall registration |

Authorization is checked in backend operations and API handlers; hiding UI controls alone is not the security boundary. In **Admin → Active users**, Main Admin can change roles, modify a non-admin username/email/password, archive accounts, or permanently delete accounts. Main Admin accounts are protected from role changes, modification, archive, and permanent deletion.

Archive moves a user account to `archived_users` so it can be restored. Restore rejects active username or email conflicts. Both actions are audited, and neither changes hostel registration records. Permanent deletion is separate and irreversible for the account; it removes associated authentication sessions, records an audit event, and preserves hostel registration and room data. Users cannot archive or permanently delete their own active account.

## 6. Hostel operations and reports

Students submit Haven Hall registration details, which remain pending until staff allocate a room and check the student in. Room allocation and check-in validate room availability, configured capacity, and gender compatibility. Staff can move residents and check them out. Changes are recorded in the audit log.

The dashboard reports resident counts, pending registrations, occupancy, available beds, room details, and estimated monthly room value. The value estimate counts the full rate once for every occupied room; it is not collected revenue. Dedicated report views display check-in, check-out, pending, and room-value details, including room-level drill-downs.

## 7. Backup and restore

The Backups panel creates AES-256-GCM encrypted local snapshots of active user roles and system settings. Restore applies those configuration values only; it does not include or change hostel registrations or rooms. Restore validates the snapshot and prevents removing all active Main Admin accounts.

These are local configuration backups, **not full database backups**. AWS/S3 uploads, off-site retention, and automated full-database backup/restore are not implemented. The backup encryption key must be kept securely outside the application files.

## 8. Interface and security measures

The browser interface is built with responsive HTML, CSS, and JavaScript. It includes sign-in and account creation, role-aware dashboard navigation, resident and room detail pages, report drill-downs, and Admin user/archive/backup tables.

The server includes security headers, same-origin checks for state-changing requests, input validation, authentication rate limits, and an explicit static-file allowlist. Payment card information is not collected or stored.

## 9. Verification

The automated suite is run with `npm test`. At the latest validation, **21 tests passed**. Coverage includes account registration and duplicate identities, Argon2id credential creation, OTP sign-in, password reset, role enforcement, protection of Main Admin accounts, account archive/restore, permanent deletion with hostel-record preservation, configuration backup/restore invariants, room capacity and gender rules, and resident operations.

## 10. Current limitations and deployment notes

- Hosted email delivery requires a real email provider, an API key or SMTP credentials, and an authorized sender; Mailpit is for local testing only.
- AWS backup upload and full database backups are not implemented.
- Payment processing and encrypted payment-field storage are out of scope.
- The project uses SQLite locally. A deployed service must provide persistent storage for the database; a temporary filesystem can lose data on restart or redeployment.
- For real student data and multiple concurrent users, deploy with a properly secured persistent database, backups, monitoring, and a configured OTP provider before operational use.

## 11. Relevant implementation files

- `src/schema.sql` — database schema
- `src/db.js` — SQLite database initialization and path selection
- `src/auth.js` — account registration, password hashing, OTP, sessions, and account management
- `src/operations.js` — dashboard, reporting, room allocation, and resident operations
- `src/backups.js` — encrypted configuration snapshot and restore
- `src/server.js` — HTTP server, API routes, and security headers
- `public/app.js` — browser-side behavior
- `public/styles.css` — responsive interface styling
- `test/` — automated tests
