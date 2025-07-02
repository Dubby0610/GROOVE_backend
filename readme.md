# GROOVE Backend

This is the backend for the GROOVE club application, built with Node.js, Express, Supabase, and Stripe. It provides authentication, user management, subscription, and payment APIs for the club experience.

---

## Features

- User authentication (signup, login, JWT-based)
- User profile management
- Subscription management (with period validation)
- Stripe-based payment integration (card & PayPal)
- Database migrations (PostgreSQL/Supabase)
- Modular code structure (controllers, routes, services, middlewares)
- Environment variable support via `.env`

---

## Getting Started

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd GROOVE/Backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Variables

Create a `.env` file in the `Backend` directory with the following:

```
PORT=4000
JWT_SECRET=your_jwt_secret
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
STRIPE_SECRET_KEY=your_stripe_secret_key
```

### 4. Database Setup

- The backend uses PostgreSQL (via Supabase).
- Run the migration script to create tables:

```bash
# You can use the SQL in migrations/001_create_users_profiles_subscriptions.sql
# Run it in your Supabase SQL editor or psql CLI.
```

### 5. Start the Server

```bash
# For development (with auto-reload)
npm run dev

# For production
npm start
```

The server will run on `http://localhost:4000` by default.

---

## Project Structure

```
Backend/
  ├── migrations/                # SQL migration scripts
  ├── src/
  │   ├── app.js                 # Express app setup
  │   ├── server.js              # Entry point
  │   ├── controllers/           # Route controllers (auth, user, payment)
  │   ├── routes/                # Express route definitions
  │   ├── middlewares/           # Custom middleware (e.g., auth)
  │   ├── services/              # Supabase and Stripe clients
  │   └── utils/                 # Token utilities
  ├── package.json
  └── .env.example               # Example environment file
```

---

## API Overview

### Auth

- `POST /auth/signup` — Register a new user
- `POST /auth/login` — Login and receive JWT tokens
- `POST /auth/refresh` — Refresh access token
- `POST /auth/google` — (Not implemented) Google OAuth

### User

- `GET /user/profile` — Get user profile (requires JWT)
- `GET /user/subscription` — Get current subscription status (requires JWT)

### Payment

- `POST /payment/create-intent` — Create a Stripe payment intent
- `POST /payment/verify` — Verify payment and activate subscription

---

## Database Schema

See `migrations/001_create_users_profiles_subscriptions.sql` for full details.

- **users**: id, email, password_hash, created_at
- **profiles**: id, user_id, display_name, created_at
- **subscriptions**: id, user_id, plan, status, start_date, end_date, payment_intent_id, created_at

---

## Development Notes

- Uses ES modules (`type: "module"` in package.json)
- Uses Supabase for database operations
- Uses Stripe for payment processing
- JWT secret must be set in `.env`
- Error handling is centralized in `app.js`
- CORS is enabled for all origins (adjust as needed)

---

## Scripts

- `npm run dev` — Start with nodemon (development)
- `npm start` — Start server (production)

---

## License

MIT 