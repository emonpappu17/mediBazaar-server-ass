# MediBazaar

MediBazaar is a full-featured multi-vendor e-commerce platform for buying and selling medicines and healthcare products online. It connects sellers, buyers, and administrators in a single marketplace, offering category-based browsing, secure checkout with Stripe, role-based dashboards, and detailed sales reporting. The platform is built end-to-end with the MERN stack and is fully responsive across mobile, tablet, and desktop.

**Live Site:** https://medi-bazaar-client-ass.vercel.app

---

## Demo Credentials

| Role   | Email                  | Password |
|--------|-------------------------|----------|
| Admin  | admin@medibazaar.com    | asdfasdf |
| Seller | seller@medibazaar.com   | asdfasdf |
| User   | user@medibazaar.com     | asdfasdf |

---

## Key Features

- Multi-role architecture with separate Admin, Seller, and User dashboards, each with dedicated permissions and views.
- Secure authentication with email/password login as well as social login via Google and GitHub, with automatic role assignment for social sign-ups.
- Persistent private routes: reloading a protected page keeps the user logged in instead of redirecting to the login screen.
- Category-based medicine browsing with a dedicated details page listing all medicines in a given category (tablet, syrup, capsule, injection, and others) in a searchable, sortable, paginated table.
- Shop page with a full medicine catalog, quantity-based cart selection, and a detail modal for each item.
- Fully functional cart system with quantity adjustment, item removal, and a clear-cart option, flowing into a Stripe-powered checkout.
- Automatic invoice generation after successful payment, with a printable and downloadable PDF invoice.
- Admin controls for managing users and roles, medicine categories, payment approvals, and homepage advertisement slides.
- Seller tools for adding and managing medicines, tracking payment history, and requesting advertisement placement on the homepage slider.
- Sales reporting for admins with date-range filtering and export to PDF, DOCX, and CSV formats.
- Discount product carousel on the homepage built with a draggable slider for quick browsing of deals.
- Toast and alert notifications for every create, update, delete, login, and sign-up action, with no use of default browser alerts.
- Fully responsive design across mobile, tablet, and desktop, including all dashboard views.

---

## Tech Stack

**Frontend**
- React.js with Vite
- Tailwind CSS
- TanStack Query for all GET-based data fetching
- React Hook Form
- Firebase Authentication (Google/GitHub social login)
- Stripe (`@stripe/react-stripe-js`, `@stripe/stripe-js`)
- Framer Motion for animations
- Headless UI and Heroicons
- jsPDF, jsPDF-AutoTable, and React PDF Renderer for PDF generation
- html-docx-js and docx for DOCX export
- PapaParse for CSV export
- Axios for API communication

**Backend**
- Node.js with Express.js
- MongoDB (native driver)
- JSON Web Token (JWT) for private route authorization
- Stripe for payment processing
- Puppeteer for server-side document generation
- CORS and dotenv for configuration and security

---

## Environment Variables

Both client and server use environment variables to keep Firebase configuration and MongoDB credentials secure. None of these values are hardcoded or committed to the repository.

**Client (.env)**
```
VITE_apiKey=
VITE_authDomain=
VITE_projectId=
VITE_storageBucket=
VITE_messagingSenderId=
VITE_appId=
VITE_STRIPE_PUBLISHABLE_KEY=
VITE_API_URL=
```

**Server (.env)**
```
DB_USER=
DB_PASS=
ACCESS_TOKEN_SECRET=
STRIPE_SECRET_KEY=
```

---

## Repositories

- **Client Side:** https://github.com/emonpappu17/mediBazaar-client-ass
- **Server Side:** https://github.com/emonpappu17/mediBazaar-server-ass

---

## Getting Started Locally

**Client**
```bash
git clone https://github.com/emonpappu17/mediBazaar-client-ass.git
cd mediBazaar-client-ass
npm install
npm run dev
```

**Server**
```bash
git clone https://github.com/emonpappu17/mediBazaar-server-ass.git
cd mediBazaar-server-ass
npm install
npm start
```

Make sure the `.env` files are created in both directories with the variables listed above before running either project.

---

## Author

Developed by Emon as part of the MERN Stack multi-vendor e-commerce assignment.