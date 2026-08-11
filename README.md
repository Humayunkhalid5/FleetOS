# 🚚 FleetOS — Fleet Management & Service Marketplace Portal

FleetOS is an end-to-end multi-role web platform connecting Commercial Fleet Managers, Fleet Repair Companies, Service Technicians, and Clients.

---

## 🔑 Login Credentials Directory

Use any of the following credentials on the Login page (`/login`) to access client or company dashboards. All accounts and newly registered accounts are saved to local session storage.

### 🏢 Fleet Companies / Service Dealers (`/company/dashboard`)

| Company Name | Account Email | Password | Role | Console View |
| :--- | :--- | :--- | :--- | :--- |
| **SwiftFleet Solutions** | `swiftfleet@fleetos.com` | `fleet1234` | Company Admin | SwiftFleet Dashboard, Technicians, Inventory & Live Chat |
| **AutoPro Fleet Service** | `autopro@fleetos.com` | `fleet1234` | Company Admin | AutoPro Dashboard, Services, Staff & Bookings |
| **FastFix Heavy Repairs** | `fastfix@fleetos.com` | `fleet1234` | Company Admin | FastFix Heavy Equipment & Repairs Console |
| **Nexus Logistics Hub** | `nexus@fleetos.com` | `fleet1234` | Company Admin | Nexus Depot Logistics & Fleet Operations |
| **Apex Freight Care** | `apex@fleetos.com` | `fleet1234` | Company Admin | Apex Freight Care & Brake Diagnostics |

---

### 👤 Customer Account (`/customer/dashboard`)

| Name | Account Email | Password | Role | Portal View |
| :--- | :--- | :--- | :--- | :--- |
| **Alex Thompson** | `alex@fleetos.com` | `demo1234` | Customer | Customer Dashboard, Live Tracking, Bookings & Chat |

---

## 🌟 Key Application Features

1. **Strict Role-Based Routing**:
   - Logging in with any **Company Account** strictly routes to `/company/dashboard`.
   - Logging in with a **Customer Account** routes to `/customer/dashboard`.

2. **Multi-Company Isolated Dashboards**:
   - Each company has its own isolated dashboard displaying its unique company title, staff, services catalog, stock inventory, bookings, and customer communications.

3. **Live Client-Company Chat**:
   - Customers can click **💬 Live Chat** when viewing any company or demanding a service.
   - Company managers receive client inquiries in real time at `/company/chat` and can reply directly.

4. **Service Booking & Direct Calling**:
   - Prominent **💬 Live Chat** and **📞 Call Dealer** (`tel:+923000000000`) buttons on all service request pages.

5. **Local Storage Session Persistence**:
   - Any new account created via Register (`/register` or `/company/register`) is saved to storage and allows immediate sign-in.

---

## 🛠️ How to Run Locally

```bash
# 1. Install dependencies
cd client
npm install

# 2. Launch Development Server
npm run dev

# 3. Build Production Bundle
cmd /c "npm run build"
```
