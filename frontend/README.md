# TradeFinlytix — Frontend

Next.js 15 web application for the TradeFinlytix AI trading intelligence platform. Provides role-scoped dashboards for Investors, Admins, and CISOs.

---

## Tech Stack

| Category | Technology |
|---|---|
| Framework | Next.js 15.0.3 (App Router) |
| Language | TypeScript 5.6 |
| UI | React 18, Tailwind CSS 3.4, Radix UI, shadcn/ui |
| Data Fetching | TanStack React Query 5.59 |
| Forms | React Hook Form 7.53 + Zod 3.23 |
| HTTP Client | Axios 1.7 |
| Charts | Recharts 2.13 |
| Animation | Framer Motion 12 |
| Icons | Lucide React |
| Linting | ESLint 9 |

---

## Project Structure

```
frontend/
├── public/                        # Static assets
└── src/
    ├── app/
    │   ├── layout.tsx             # Root layout (fonts, providers)
    │   ├── page.tsx               # Landing / auth entry point
    │   ├── globals.css            # Global styles
    │   ├── (auth)/                # Auth route group
    │   │   └── [...slug]/         # Dynamic auth pages (login, register)
    │   └── (protected)/           # Protected route group (requires JWT)
    │       ├── layout.tsx         # Protected shell (sidebar, header)
    │       ├── dashboard/         # Overview dashboard
    │       ├── predict/
    │       │   ├── page.tsx       # Stock screener / prediction list
    │       │   └── [symbol]/      # Per-stock prediction detail + SHAP
    │       ├── portfolio/         # Holdings and P&L
    │       ├── trades/            # Trade history
    │       ├── profile/           # User settings
    │       ├── admin/
    │       │   └── users/         # User management (admin only)
    │       └── ciso/
    │           ├── audit/         # Audit log viewer + semantic search
    │           └── risk/          # Anomaly and risk trend dashboard
    ├── components/
    │   ├── auth-form.tsx          # Login / register form
    │   ├── protected-shell.tsx    # App shell with navigation
    │   └── ui/                    # shadcn/ui primitive components
    ├── lib/
    │   ├── api.ts                 # Axios instance + typed API helpers
    │   ├── auth.tsx               # Auth context, JWT management, hooks
    │   ├── queries.ts             # React Query hooks (useQuery, useMutation)
    │   ├── types.ts               # TypeScript interfaces
    │   └── utils.ts               # Shared utilities
    └── providers/
        └── query-provider.tsx     # QueryClientProvider wrapper
```

---

## Pages and Routes

### Public

| Route | Description |
|---|---|
| `/` | Landing page / auth entry |

### Auth

| Route | Description |
|---|---|
| `/auth/login` | User login |
| `/auth/register` | New investor registration |

### Investor (authenticated)

| Route | Description |
|---|---|
| `/dashboard` | Overview: summary stats, recent alerts |
| `/predict` | Stock screener with prediction signals |
| `/predict/{symbol}` | Detailed prediction: signal, confidence, SHAP chart |
| `/portfolio` | Holdings snapshot and P&L |
| `/trades` | Trade history |
| `/profile` | Account settings |

### Admin only

| Route | Description |
|---|---|
| `/admin/users` | Paginated user list |
| `/admin/users/{userId}` | User detail and management actions |

### CISO only

| Route | Description |
|---|---|
| `/ciso/audit` | Audit log viewer with semantic search |
| `/ciso/risk` | Risk trend charts and anomaly dashboard |

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn
- Backend API running (see [backend/README.md](../backend/README.md))

### Install and Run

```bash
cd frontend
npm install
npm run dev
```

App runs on `http://localhost:3000`.

### Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

---

## Environment Variables

Create a `.env.local` file in the `frontend/` directory:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
```

---

## Authentication Flow

1. User submits login form → POST to `/api/v1/auth/login`
2. API returns `access_token` (short-lived) and `refresh_token`
3. Axios interceptor attaches `Authorization: Bearer <token>` to every request
4. On 401 response, the interceptor automatically calls `/auth/refresh` and retries
5. On logout, both tokens are cleared from memory and the backend session is invalidated

---

## Data Fetching

All server state is managed by **React Query**:

- `useQuery` hooks in `lib/queries.ts` cover predictions, portfolio, alerts, admin, and CISO data
- `useMutation` hooks handle form submissions (login, register, trade creation, user management)
- Query keys are structured so invalidation is precise (e.g., invalidating `['prediction', symbol]` after a trade)
- The `QueryClientProvider` in `providers/query-provider.tsx` wraps the entire app

---

## Component Architecture

- **`protected-shell.tsx`** — top-level layout for all authenticated pages; renders sidebar navigation, header, and role-specific menu items
- **`auth-form.tsx`** — unified login/register form; switches mode based on route
- **`ui/`** — shadcn/ui components (Button, Card, Input) built on Radix UI primitives
- Page-level components live directly in their `app/` route folder, keeping co-location clear

---

## Role-Based UI

Navigation items and page access are gated by the role returned in the JWT payload:

| UI Section | Visible to |
|---|---|
| Dashboard, Predict, Portfolio, Trades | All authenticated users |
| Admin menu | `admin` role only |
| CISO menu | `ciso` role only |

Attempting to access a protected route without the required role redirects to the dashboard.

---

## Team

| Name | Roll No |
|---|---|
| Aleena Ahmed | DS-09 |
| Seerat Fatima | DS-32 |
| Toqir Dar | DS-34 |
| Ayan Ahmed | DS-40 |