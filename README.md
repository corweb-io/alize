# Alizé

Invoicing and fiscal tracking for entrepreneurs in Saint-Barthélemy, built with Next.js 16, Supabase and TypeScript. One account can manage several businesses (legal entities), each with its own clients, invoices, numbering and fiscal settings.

## Features

- 🔐 **Authentication**: email one-time code via Supabase
- 🏢 **Multiple businesses**: switch between businesses from the sidebar; data is isolated per business by Row Level Security
- ⚖️ **Legal structures**: micro-entreprise, EI au réel, EURL, SARL, SASU, SAS and SCI, with the matching legal mentions on documents
- 📄 **Invoices and quotes**: line items, multi-currency, quote → invoice conversion, French-format PDFs
- 👥 **Clients**: auto-generated references
- 💰 **Payment tracking**: draft, sent, paid, overdue; invoices can be settled in several payments, each counted in the CPS period it was received
- 🧾 **Credit notes (avoirs)**: cancel an issued, unpaid invoice with a numbered credit note instead of deleting it
- 🏦 **Cotisations** (micro-entreprise): CPS Saint-Barth contributions per declaration period, revenue ceiling, declaration reminders
- 📅 **Territorial obligations**: CFAE and TED tracking for every structure
- 💳 **Subscriptions**: Stripe Checkout and Customer Portal (per user; quotas currently disabled)

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS v4
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **PDF Generation**: @react-pdf/renderer
- **Form Management**: react-hook-form, zod
- **Date Formatting**: date-fns

## Getting Started

### Prerequisites

- Node.js 20.9+ and pnpm
- Docker (for local Supabase development)
- Supabase CLI

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd next-invoice-gen
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Initialize Supabase**

   ```bash
   npx supabase init
   ```

4. **Start local Supabase**

   ```bash
   npx supabase start
   ```

   This project uses custom local ports (see `supabase/config.toml`) because the default Supabase ports are often already in use. Copy the credentials into `.env.local`:

   ```bash
   supabase status -o env
   ```

5. **Create `.env.local` file**

   Copy the example and fill in values from `supabase status -o env`:

   ```bash
   cp .env.local.example .env.local
   ```

   ```env
   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:55421
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<from supabase status>
   SUPABASE_SERVICE_ROLE_KEY=<from supabase status>
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

   Auth emails are captured locally at [http://127.0.0.1:55424](http://127.0.0.1:55424) (Mailpit). Make sure your app URL matches this project's API port — emails go to the Mailpit instance paired with whichever Supabase stack you connect to.

   Stripe variables are optional for local development without billing. See [Stripe setup](#stripe-subscriptions) below.

6. **Apply database migrations**

   ```bash
   npx supabase migration up
   ```

7. **Start the development server**

   ```bash
   pnpm dev
   ```

8. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
app/
  (auth)/                    # Login (email OTP) and auth callback
  (onboarding)/onboarding/   # Create a business, or complete one (?business=<id>)
  (app)/
    b/page.tsx               # Resolves business-less URLs to the last used business
    b/[businessId]/          # Business-scoped pages: dashboard, invoices, quotes,
                             #   clients, cotisations, settings
    account/billing/         # User-level subscription
  api/                       # Route handlers (invoices, quotes, clients, PDF, Stripe)
components/                  # UI, layout (sidebar, business switcher), feature components
lib/
  business.ts                # Server helpers: current user's businesses, getBusiness()
  business-path.ts           # businessPath(id, "/invoices") URL helper
  finance/                   # Legal forms, CPS rates, ceilings, declarations, obligations
  supabase/                  # Supabase clients
  types/                     # Database types
proxy.ts                     # Auth guard, legacy URL redirects, active-business cookie
supabase/migrations/         # Database migrations
```

## Database Schema

- **businesses**: a legal entity: identity, banking, legal info (`legal_info`) and fiscal settings (`fiscal_settings.legal_form`, activity, declarations)
- **business_members**: links users to businesses with a role (`owner` today; `admin`, `member`, `accountant` are enforced by RLS for future invitations)
- **clients**, **invoices** (invoices, quotes and credit notes, by `document_type`), **invoice_items**, **invoice_payments**, **cotisation_reserves**, **annual_obligations**: scoped by `business_id`
- **profiles**: user-level data
- **subscriptions**: Stripe subscription state, one row per user

Every business table has RLS based on membership (`is_business_member`, `can_edit_business`). Queries in the app also filter on `business_id` explicitly, since a user can belong to several businesses.

Invoice (`F-000001`), quote (`D-000001`), credit note (`A-000001`) and client (`C-000001`) references are assigned by database triggers at insert time: one gapless sequence per business, safe under concurrent inserts. Leave `reference` empty on insert to get the next one.

New businesses are created through the `create_business()` RPC, which also creates the owner membership.

## Stripe subscriptions

Billing is per user account and covers all of the user's businesses. Free-tier quotas are currently disabled.

### Environment variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_APP_URL` | Public app URL for Stripe redirect URLs |
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_test_…` or `sk_live_…`) |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret (`whsec_…`) |
| `STRIPE_PRO_MONTHLY_PRICE_ID` | Price ID for the monthly Pro plan |
| `STRIPE_PRO_YEARLY_PRICE_ID` | Price ID for the yearly Pro plan |

See `.env.local.example` for a full template.

### Stripe Dashboard setup

1. Create a **Product** with two recurring **Prices** (monthly and yearly).
2. Copy the price IDs into `STRIPE_PRO_MONTHLY_PRICE_ID` and `STRIPE_PRO_YEARLY_PRICE_ID`.
3. Enable the **Customer Portal** (Settings → Billing → Customer portal).
4. Add a webhook endpoint pointing to `https://<your-domain>/api/stripe/webhook` with these events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid` (optional, no-op handler)
   - `invoice.payment_failed` (optional, no-op handler)

### Local webhook testing

With the dev server running on port 3000:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy the webhook signing secret printed by the CLI into `STRIPE_WEBHOOK_SECRET` in `.env.local`.

### Billing UI

Users manage subscriptions at `/account/billing`: upgrade via Stripe Checkout, manage or cancel via the Stripe Customer Portal.

## Development

### Running Migrations

```bash
# Create a new migration
npx supabase migration new migration_name

# Apply migrations locally
npx supabase migration up

# Push migrations to remote
npx supabase db push
```

### Deploying

Pushing to `main` deploys to production on Vercel. Nothing applies Supabase migrations automatically, so when a change includes a migration:

1. Apply it to production first: `npx supabase db push` (check with `--dry-run`).
2. Then push the code that depends on it.

Write migrations so the currently deployed app keeps working once they're applied.

### Database Reset

```bash
# Reset local database and reapply all migrations
npx supabase db reset
```

## Environment Variables

See `.env.local.example` for all required and optional variables (Supabase, app URL, Stripe).

## Documentation

Latest dependency documentation is available in `docs/dependencies/`:

- `nextjs.md` - Next.js App Router patterns
- `supabase.md` - Supabase authentication and database
- `supabase-js.md` - Supabase JavaScript client
- `supabase-cli.md` - Supabase CLI commands
- `react-pdf.md` - PDF generation with @react-pdf/renderer
- `tailwindcss.md` - Tailwind CSS v4 usage

## License

MIT
