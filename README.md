# FinTrack (தவணை நிதி மேலாண்மை) 🪙

> **Production-Ready Microfinance & Installment Lending Management Platform** tailored for private financiers in Tamil Nadu managing **Daily (தண்டல்/தினசரி)**, **Weekly (வாரத்தவணை)**, and **Monthly (மாதத்தவணை)** finance schemes.

---

## 🌟 Key Features

- **Fintech UI/UX**: Designed with gradient cards, glassmorphism, rounded-2xl aesthetics, and smooth animations via Framer Motion.
- **Large Touch Targets & Mobile-First**: Built for non-tech-savvy financiers with high-contrast, large tap targets and an intuitive bottom navigation bar for mobile, with a collapsible sidebar on desktop.
- **Bilingual Interface (Tamil / English)**: Instant one-tap toggle between **தமிழ்** (native finance terms: *தவணை, கடன், நிலுவை, வட்டி, அசல், தண்டல், வசூல்*) and **English**.
- **Dark / Light Mode**: Beautiful dark theme default with instant light theme toggle.
- **Indian Currency Standard**: Formatted throughout with Indian comma grouping (`₹ 1,25,000`).
- **Role-Based Access Control (RBAC)**:
  - **Owner (Financier)**: Full administrative control, loan creation, borrower deletion, audit log access, penalty settings, and database backups.
  - **Collection Agent**: Field mode restricted to assigned area customer views and payment recording.
- **Three Color-Coded Finance Schemes**:
  - 🟠 **Daily Finance (தினசரி தண்டல்)**: e.g., 100-day cycle daily repayments.
  - 🔵 **Weekly Finance (வாரத்தவணை)**: 10–20 week installments.
  - 🟢 **Monthly Finance (மாதத்தவணை)**: Fixed monthly installments.
- **Automated Repayment Schedule Engine**: Computes principal, interest, total payable, and generates day-by-day installment schedules.
- **Interactive Analytics (Recharts)**:
  - 30-Day Collection Trendline (Cash vs. UPI breakdown)
  - Portfolio Split Donut Chart (Daily vs. Weekly vs. Monthly)
  - 6-Month Collections & Net Profit Bar Chart
- **Today's Collection Register**: Fast one-tap collection modal with full-due presets or custom partial payments, celebration confetti, and auto-generated receipt vouchers.
- **Overdue Red Alerts**: Real-time warnings for defaulted or delayed installments with days-overdue indicators.
- **Official Printable & Downloadable PDF Receipts**: Computer-generated receipt voucher with bilingual headers, customer details, loan account number, payment mode, remaining balance, and signature line.
- **WhatsApp Reminder Integration**: One-click `wa.me` bilingual pre-filled reminder messages in Tamil and English.
- **Daily Closing Cashier Register**: Expected dues vs. Actual collections vs. Net deficit with cash-in-hand and UPI breakdown.
- **Calendar View**: Monthly calendar grid visualizing total collections due per day.
- **Automated Cron Engine**: Daily midnight cron job checking overdue installments and calculating late penalties.
- **Audit Logging**: Immutable tracking of all financial mutations (loan creation, payments, reversals, settings changes).
- **One-Click JSON Data Backup**: Download complete database backup as a JSON file.

---

## 📂 Project Structure

```
finance 1/
├── server/                      # Node.js + Express REST API
│   ├── src/
│   │   ├── config/              # MongoDB connection (Atlas + Memory fallback)
│   │   ├── controllers/         # Auth, Customer, Loan, Payment, Dashboard, Report, Settings
│   │   ├── cron/                # Daily overdue & penalty cron job
│   │   ├── middleware/          # JWT auth, role guard, error handler, Zod validation
│   │   ├── models/              # User, Customer, Loan, Payment, AuditLog, Settings
│   │   ├── routes/              # Express API route declarations
│   │   ├── index.js             # Server entry point
│   │   └── seed.js              # Database seed script (10 Tamil Nadu customers)
│   ├── .env.example
│   ├── .env
│   └── package.json
│
├── client/                      # React + Vite + Tailwind CSS Frontend (PWA)
│   ├── public/                  # PWA manifest.json, sw.js (Service Worker)
│   ├── src/
│   │   ├── components/common/   # Navbar, Sidebar, BottomNav, StatCard, FinanceTypeCard, Modals
│   │   ├── context/             # AuthContext, LanguageContext, ThemeContext
│   │   ├── i18n/                # Complete Tamil & English translations dictionary
│   │   ├── pages/               # Dashboard, Loans, LoanDetail, Customers, CustomerDetail,
│   │   │                        # Payments, DailyClosing, Calendar, Settings, Login
│   │   ├── services/            # API client service
│   │   ├── utils/               # Indian currency & date formatters
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css            # Tailwind directives, glassmorphism, print CSS
│   ├── .env.example
│   ├── index.html
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
└── README.md
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js** v18+ (tested on Node v24)
- **npm** v9+

---

### 2. Backend Setup (`/server`)

1. Open a terminal and navigate to the `server` directory:
   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment Variables (`server/.env`):
   ```env
   PORT=5000
   # To connect to your MongoDB Atlas cluster:
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/fintrack?retryWrites=true&w=majority
   JWT_SECRET=fintrack_super_secure_jwt_secret_key_2026_tamilnadu_finance
   JWT_EXPIRES_IN=7d
   CLIENT_URL=http://localhost:5173
   NODE_ENV=development
   ```

   > **💡 Zero-Config Fallback**: If you do not have MongoDB installed locally and haven't configured an Atlas URI yet, FinTrack **automatically starts an embedded in-memory MongoDB** server on launch. The app works 100% out-of-the-box!

4. Run the Database Seed Script (Generates 10 realistic Tamil Nadu customers, loans, schedules, and payments):
   ```bash
   npm run seed
   ```

5. Start the backend server:
   ```bash
   npm run dev
   ```
   Server will run on: `http://localhost:5000` (Health check at `http://localhost:5000/api/health`).

---

### 3. Frontend Setup (`/client`)

1. Open a second terminal and navigate to the `client` directory:
   ```bash
   cd client
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   Open your browser at: **`http://localhost:5173`**

---

## 🔑 Default Test Credentials

The login screen includes **1-Tap Quick-Fill buttons** for instant testing:

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Owner (உரிமையாளர்)** | `owner@fintrack.com` | `admin123` | Full administrative control, all loans, audit logs, penalty rules, settings |
| **Agent (வசூல் முகவர்)** | `agent@fintrack.com` | `agent123` | Assigned customer view, payment recording |

---

## 🍃 MongoDB Atlas Setup Steps

1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a free M0 cluster (e.g., in AWS `ap-south-1` Mumbai region).
3. Under **Database Access**, create a user (e.g., `fintrack_admin`) with a secure password and `Read and write to any database` privileges.
4. Under **Network Access**, click **Add IP Address** and select **Allow Access from Anywhere** (`0.0.0.0/0`) or add your current IP address.
5. In your cluster dashboard, click **Connect** -> **Drivers** -> **Node.js**.
6. Copy the connection string and paste it into `server/.env`:
   ```env
   MONGODB_URI=mongodb+srv://fintrack_admin:<password>@cluster0.mongodb.net/fintrack?retryWrites=true&w=majority
   ```
7. Re-run `npm run seed` in `server/` to populate your cloud database.

---

## 🚢 Deployment Guide

### Deploy Backend (Render / Railway)
1. Push your repository to GitHub.
2. In [Render](https://render.com) or [Railway](https://railway.app), create a new **Web Service**.
3. Set **Root Directory** to `server`.
4. Build Command: `npm install`
5. Start Command: `node src/index.js`
6. Add Environment Variables:
   - `MONGODB_URI` = your Atlas connection string
   - `JWT_SECRET` = your secret key
   - `NODE_ENV` = `production`
   - `CLIENT_URL` = your deployed Vercel frontend URL

### Deploy Frontend (Vercel)
1. In [Vercel](https://vercel.com), create a new project and select the repository.
2. Set **Root Directory** to `client`.
3. Framework Preset: **Vite**.
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. Add Environment Variable:
   - `VITE_API_BASE_URL` = your deployed backend URL (e.g., `https://fintrack-api.onrender.com`)
7. Click **Deploy**.

---

## 📄 License
This project is proprietary and built for Tamil Nadu private finance business management.
