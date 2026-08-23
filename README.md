# FleetOS

FleetOS is a MongoDB-backed MERN service-management platform with three isolated experiences:

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

No local `.env` changes are required. MongoDB must be available at `mongodb://127.0.0.1:27017/fleetos`; MongoDB Compass is a viewer and does not start the database service. The portal processes start only after `/api/health` reports that the API is ready.

For a production bundle and server contract checks:

```powershell
npm run build
npm test
```

## Development accounts

| Portal | Email | Password |
|---|---|---|
| Customer | `customer@fleetos.local` | `FleetCustomer1!` |
| Company | `company@fleetos.local` | `FleetCompany1!` |
| Super Admin | Configured in MongoDB | Set with the one-time command below |

The Admin password is randomly generated and stored in the ignored `server/.runtime` directory. To rotate a lost development password, stop the app and run:

```powershell
npm --prefix server run reset:dev-admin
```

To set a chosen Super Admin identity without putting the password in source code, provide `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` only to the one-time `npm --prefix server run set-admin` command. The command stores a bcrypt hash in MongoDB, invalidates previous Admin sessions, and removes the generated development password file. The Admin can subsequently rotate email/password from **Security settings** in the separate Admin portal.

## Production MongoDB

Production requires an explicit `MONGODB_URI`; the server will not silently fall back to a local database. Store the Atlas URI, `JWT_SECRET`, and deployed origins in the hosting provider's encrypted environment settings using [server/.env.production.example](server/.env.production.example) as the field list.

Production startup connects to the configured MongoDB database and preserves its existing records. Development demonstration data is not inserted or overwritten when `NODE_ENV=production`. Customer registrations, company operations, bookings, payments, chats, reviews and Admin audits are written directly to MongoDB at request time. Graceful shutdown closes the HTTP server and MongoDB connection before the process exits.

## Access and workflow rules

- Public registration only creates customer or pending company accounts.
- Pending and suspended companies cannot access operational APIs.
- Every company query is scoped from the authenticated session; submitted company IDs are not trusted.
- The separate Admin app is the only public sign-in surface that accepts a Super Admin account.
- Booking prices are resolved from the selected company's active MongoDB service record.
- Booking workflow is `Pending → Assigned → En Route → Arrived → In Progress → Completed → Paid`.
- Customers can cancel only Pending or Assigned jobs. Companies must supply a cancellation reason.
- Technician assignment is company-scoped and only claims an available technician.
- Chat and tracking rooms require access to the associated booking.
- Admin mutations require reasons and are written to the audit collection.
- Cash and invoice confirmation are supported. Card charging, uploads, reset email, and OAuth remain visibly disabled until real providers are configured.

## Main structure

```text
admin/   Separate dark Super Admin React application
client/  Original client and company portal, with role-separated routes
server/  Express, Socket.IO, Mongoose models, tenant controllers, and seed
scripts/ Local development process coordinator
```

Startup seeding is idempotent: it fills missing development records without deleting normal data or duplicating the six providers, services, technicians, inventory, bookings, payments, reviews, and Pakistan city catalogue.
