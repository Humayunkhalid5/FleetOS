# FleetOS

FleetOS is a MongoDB-backed MERN SaaS platform for any local business that sells services or products: plumbers and electricians, gaming and electronics stores, shops, restaurants, salons, clinics, tutors, couriers, event studios and more. It has three isolated experiences:

- Client and company portal: `http://localhost:5173`
- Separate Super Admin console: `http://localhost:5174`
- Express API and Socket.IO: `http://localhost:5000`

MongoDB is the source of truth for accounts, tenant-owned resources, bookings, payments, reviews, chat, tracking, support, audit history, and the 246-city Pakistan catalogue. The browser does not use `localStorage` as a data fallback.

## Run locally

Install Node.js 20+, MongoDB Community Server, and then run from this directory:

```powershell
npm install
npm run dev
```

After pulling these changes, run `npm install` once more (root, `client/` and `admin/` dependencies changed: animation libraries were removed and self-hosted fonts were added).

No local `.env` changes are required. MongoDB must be available at `mongodb://127.0.0.1:27017/fleetos`; MongoDB Compass is a viewer and does not start the database service. The portal processes start only after `/api/health` reports that the API is ready.

For a production bundle and server contract checks:

```powershell
npm run build
npm test
```

Useful options and commands:

| Command / variable | Effect |
|---|---|
| `SEED_CITY_CATALOGUE=false` | Skip the 990 generated city providers on startup (faster first boot) |
| `npm run icons` | Rebuild the subset Material Symbols font after adding a new icon name (needs Python with `fonttools`) |
| `npm --prefix client run lint` | Lint the client app |

## Development accounts

| Portal | Email | Password |
|---|---|---|
| Customer | `customer@fleetos.local` | `FleetCustomer1!` |
| Company | `company@fleetos.local` | `FleetCompany1!` |
| Super Admin | Configured in MongoDB | Set with the one-time command below |

In development, startup refreshes the passwords for these reserved demo accounts so they stay in sync with this table. This does not change passwords for other users or for production accounts.

The Admin password is randomly generated and stored in the ignored `server/.runtime` directory. To rotate a lost development password, stop the app and run:

```powershell
npm --prefix server run reset:dev-admin
```

To set a chosen Super Admin identity without putting the password in source code, provide `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` only to the one-time `npm --prefix server run set-admin` command. The command stores a bcrypt hash in MongoDB, invalidates previous Admin sessions, and removes the generated development password file. The Admin can subsequently rotate email/password from **Security settings** in the separate Admin portal, or straight from the Admin sign-in screen with **Change password** (email + current password + new password). Both paths write the new bcrypt hash to the `users` collection in MongoDB and sign out every other Admin session.

Every demo business also has its own owner login: `owner.<business-slug>@fleetos.local` with `FleetCompany1!`. For example:

| Business | Email |
|---|---|
| Gaming store (Lahore) | `owner.lahore-game-zone@fleetos.local` |
| Restaurant (Karachi) | `owner.karachi-spice-kitchen@fleetos.local` |
| Salon (Karachi) | `owner.karachi-glow-salon-spa@fleetos.local` |

Find any other slug with `GET /api/companies?industry=<category>&city=<city>`.

## Business types and order flows

A business picks its type at registration (Business profile can change it later). The type sets the workspace labels ("Menu" and "Kitchen stock" for a restaurant, "Treatments" for a salon), the modules shown, a suggested starter catalogue and starter stock. Definitions live in [server/src/config/companyWorkspace.js](server/src/config/companyWorkspace.js).

| Category key | Examples |
|---|---|
| `field-services` | Plumbing, electrical, AC, carpentry, cleaning |
| `auto-services` | Car service, car wash, roadside help |
| `retail-products` | Grocery, general store, home goods |
| `electronics-gaming` | Consoles, games, phones, repairs |
| `food-hospitality` | Restaurants, bakeries, catering, table reservations |
| `health-beauty` | Salons, spas, gyms |
| `healthcare` | Clinics, pharmacies, lab tests |
| `education` | Tuition, online classes, training |
| `logistics` | Couriers, movers, freight |
| `events` | Photography, decor, sound and lighting |
| `professional-services` | Tax filing, legal advice, consulting |
| `digital-technology` | Websites, IT support, CCTV |
| `oil-energy` | LPG refills, solar, generators |
| `other` | Anything else |

Each catalogue item is either a **service** (priced per visit, session, etc.) or a **product** (priced per unit, ordered in a quantity). Each business chooses how customers get it, limited to what fits its type, and can set a delivery fee:

| Fulfillment | Steps the customer sees |
|---|---|
| `onsite` (home or site visit) | Pending → Assigned → En Route → Arrived → In Progress → Completed → Paid |
| `delivery` | Pending → Assigned → En Route → Arrived → Completed → Paid |
| `pickup` | Pending → Assigned → In Progress → Completed → Paid |
| `instore` (visit the business) | Pending → Assigned → Arrived → In Progress → Completed → Paid |
| `remote` (online) | Pending → Assigned → In Progress → Completed → Paid |

All flows use the same stored statuses, so payments, invoices and analytics work the same for every business; only the labels change ("Order placed", "Out for delivery", "Ready for pickup"). Live map tracking is used for on-site and delivery jobs only. Rules live in [server/src/config/fulfillment.js](server/src/config/fulfillment.js), mirrored in [client/src/constants/fulfillment.js](client/src/constants/fulfillment.js).

Related endpoints: `GET /api/business-categories` (types with business counts), `GET /api/companies?industry=&fulfillment=` (marketplace filters), `GET`/`POST /api/services/templates` (suggested starter catalogue for the signed-in business).

In development, startup gives every demo business a type, a matching catalogue and stock, and makes sure the ten largest cities have one business of every type. Businesses you register yourself are never changed by this.

## Google and LinkedIn sign-in

The Login and Register pages offer **Continue with Google** and **Continue with LinkedIn**. Each button turns on as soon as its credentials are present on the server; until then it stays visible but disabled.

1. **Google:** in Google Cloud Console → APIs & Services → Credentials, create an *OAuth client ID* (type *Web application*) and add the authorised redirect URI `http://localhost:5000/api/auth/oauth/google/callback`.
2. **LinkedIn:** in the LinkedIn Developer Portal, create an app, add the *Sign In with LinkedIn using OpenID Connect* product, and add the redirect URL `http://localhost:5000/api/auth/oauth/linkedin/callback`.
3. Put the values in `server/.env` (see [server/.env.example](server/.env.example)) and restart `npm run dev`:

```text
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
LINKEDIN_CLIENT_ID=...
LINKEDIN_CLIENT_SECRET=...
```

In production also set `OAUTH_CALLBACK_BASE_URL` (the public API URL used in the redirect URIs) and `CLIENT_ORIGIN` (where users land), and register the matching `https://…/api/auth/oauth/<provider>/callback` URLs with each provider.

How accounts are matched: a returning user is found by their Google/LinkedIn ID, otherwise by email, but only when the provider reports the email as verified. New social users become customer accounts. Company owners who sign in with the same verified email open their company workspace. Super Admin accounts cannot use social sign-in.

## Production MongoDB

Production requires an explicit `MONGODB_URI`; the server will not silently fall back to a local database. Store the Atlas URI, `JWT_SECRET`, and deployed origins in the hosting provider's encrypted environment settings using [server/.env.production.example](server/.env.production.example) as the field list.

Production startup connects to the configured MongoDB database and preserves its existing records. Development demonstration data is not inserted or overwritten when `NODE_ENV=production`. Customer registrations, company operations, bookings, payments, chats, reviews and Admin audits are written directly to MongoDB at request time. Graceful shutdown closes the HTTP server and MongoDB connection before the process exits.

## Access and workflow rules

- Public registration only creates customer or pending company accounts.
- Pending and suspended companies cannot access operational APIs.
- Every company query is scoped from the authenticated session; submitted company IDs are not trusted.
- The separate Admin app is the only public sign-in surface that accepts a Super Admin account.
- Booking prices are resolved from the selected company's active MongoDB service record.
- Booking workflow follows the fulfillment type (see the table above). Paid is set only by recording a payment. Staff must be assigned before on-site jobs move forward; other orders can be accepted directly.
- Customers can cancel only Pending or Assigned jobs. Companies must supply a cancellation reason.
- Technician assignment is company-scoped and only claims an available technician.
- Chat and tracking rooms require access to the associated booking.
- Admin mutations require reasons and are written to the audit collection.
- Recording a payment generates the invoice, marks it paid and notifies the customer instantly.
- The public Contact form posts to `/api/support` (rate limited) and lands in the Admin Support queue.
- Every screen updates live from Socket.IO events and after any change; no page needs a reload.
- Cash and invoice confirmation are supported. Google and LinkedIn sign-in turn on when their credentials are configured (see above). Card charging and reset email remain visibly disabled until real providers are configured.

## Main structure

```text
admin/   Separate Super Admin React application (light and dark)
client/  Public site, customer portal and company workspace, with role-separated routes
server/  Express, Socket.IO, Mongoose models, tenant controllers, and seed
scripts/ Local development process coordinator and icon-font subset script
```

See [design.md](design.md) for the design system (shared light/dark tokens, components, live-data layer and navigation).

Startup seeding is idempotent: it fills missing development records without deleting normal data or duplicating the six providers, services, technicians, inventory, bookings, payments, reviews, and Pakistan city catalogue.
