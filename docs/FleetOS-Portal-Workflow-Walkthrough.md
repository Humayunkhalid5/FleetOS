# FleetOS Portal Workflow Walkthrough

## 01  CUSTOMER PORTAL

Welcome to FleetOS. This walkthrough follows one service request across the customer, company, and Super Admin portals. The customer begins in the marketplace, where approved companies, service options, locations, and ratings are loaded from MongoDB. Search for a provider and review its active services before choosing a booking. Select an optional item from that company inventory, add a service address, and describe the work needed. The estimate updates to include the selected service and materials. Choose cash after service, review the scheduled request, and confirm. FleetOS validates the company and active service, stores the new booking in MongoDB, and routes the customer to live tracking. The same request is now ready for the company team.

## 02  COMPANY WORKSPACE

Next, the company operator signs into a tenant-scoped workspace. Operational records are limited to the authenticated company. In Requests, the new customer booking appears as Pending. Assign an available staff member and the request becomes Assigned. Move the work through En Route, Arrived, In Progress, and Completed. Each status change is validated by the API, saved to MongoDB, and broadcast to connected portals. For a cash booking, the company records payment after service is complete. FleetOS creates the payment record, marks the booking Paid, and generates an invoice. The company dashboard and job list update from the same source of truth.

## 03  CUSTOMER FOLLOW-UP

The customer can return to the portal to review the recorded receipt and completed job. Booking history, payment history, and live progress all reference the same database-backed record. After the work is paid, the customer can leave a rating and written review. That feedback is linked to the booking and company so it can appear in the company workspace and the Super Admin console.

## 04  SUPER ADMIN CONSOLE

Finally, the separate Super Admin console provides platform-wide oversight. The overview summarizes companies, customers, jobs, recorded revenue, and ratings. The company registry shows approval and client visibility. The job registry exposes the booking reference, tenant, service, status, and amount. Finance lists recorded cash and invoice payments. Ratings and reviews show customer feedback, while System Health confirms MongoDB and API status. Admin actions are role-restricted, require confirmation, and are written to the audit history.
