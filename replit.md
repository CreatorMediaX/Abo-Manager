# SubControl - Subscription Management Application

## Overview

SubControl is a full-stack subscription management application that helps users track recurring expenses, manage cancellations, and analyze spending patterns. The app provides features like smart CSV import for detecting subscriptions from bank statements, guided cancellation workflows with PDF letter generation, and calendar export for payment reminders.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state, local React hooks for UI state
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style variant)
- **Form Handling**: React Hook Form with Zod validation
- **Charts**: Recharts for spending visualization

The frontend follows a pages-based structure under `client/src/pages/` with shared components in `client/src/components/`. The app supports both authenticated (server-synced) and guest (localStorage) modes.

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Runtime**: Node.js with tsx for development
- **Build Tool**: esbuild for production bundling, Vite for client

The server handles authentication, session management, and CRUD operations for subscriptions. Routes are registered in `server/routes.ts` with a storage abstraction layer in `server/storage.ts`.

### Authentication
- **Strategy**: Passport.js with Local Strategy
- **Sessions**: Express-session with PostgreSQL session store (connect-pg-simple)
- **Password Security**: Scrypt hashing with random salt

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with drizzle-zod for schema validation
- **Schema Location**: `shared/schema.ts` (shared between client and server)
- **Migrations**: Managed via `drizzle-kit push`

The schema includes:
- `users`: User accounts with hashed passwords
- `subscriptions`: Subscription entries with pricing, dates, categories, and document storage

### Key Features Architecture
1. **Smart Import**: CSV parsing with PapaParse, pattern detection for recurring transactions
2. **Cancellation Flow**: Multi-step wizard with provider-specific guides, PDF generation via jsPDF
3. **Dual Storage Mode**: Authenticated users sync to PostgreSQL; guests use localStorage with migration option
4. **Calendar Export**: ICS file generation for payment reminders

### Build Configuration
- Development: Vite dev server with HMR, proxied API requests
- Production: Client built with Vite, server bundled with esbuild to CommonJS
- Path aliases: `@/` for client source, `@shared/` for shared code

## External Dependencies

### Database
- **PostgreSQL**: Primary data store, connection via `DATABASE_URL` environment variable
- **Session Store**: PostgreSQL-backed session storage for authentication persistence

### Third-Party Services
- None currently integrated (ready for Stripe, email services based on package.json dependencies)

### Key NPM Packages
- **UI**: Radix UI primitives, Lucide icons, Recharts
- **Data**: Drizzle ORM, Zod validation, date-fns
- **PDF**: jsPDF for cancellation letter generation
- **CSV**: PapaParse for bank statement import
- **Calendar**: Custom ICS generation

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: (recommended) For session encryption