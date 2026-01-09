# TrendCast - Sales Forecasting Application

## Overview

TrendCast is a predictive sales forecasting application that helps users analyze historical sales data and generate future predictions. The application provides an executive dashboard, sales data management, and forecast generation using multiple prediction methods (linear regression, moving average, and seasonality analysis).

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state, React hooks for local state
- **Styling**: Tailwind CSS with CSS variables for theming, shadcn/ui component library (New York style)
- **Charts**: Recharts for data visualization
- **Forms**: React Hook Form with Zod validation
- **Build Tool**: Vite with path aliases (@/ for client/src, @shared/ for shared)

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript (ESM modules)
- **API Pattern**: REST endpoints defined in shared/routes.ts with Zod schema validation
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Development**: tsx for TypeScript execution, Vite dev server with HMR

### Data Layer
- **Database**: PostgreSQL (connection via DATABASE_URL environment variable)
- **Schema Location**: shared/schema.ts defines tables using Drizzle's pgTable
- **Tables**:
  - `sales`: id, date, amount, productCategory, region
  - `forecasts`: id, forecastDate, predictedAmount, modelName, createdAt
- **Migrations**: Drizzle Kit with `db:push` command

### Shared Code
- **Location**: /shared directory contains code used by both frontend and backend
- **Schema**: Drizzle table definitions and Zod insert schemas
- **Routes**: API endpoint definitions with input/output schemas for type safety

### Build Process
- **Development**: `npm run dev` runs tsx server with Vite middleware
- **Production Build**: Custom script bundles server with esbuild, client with Vite
- **Output**: dist/index.cjs (server) and dist/public (static assets)

## External Dependencies

### Database
- **PostgreSQL**: Primary data store, connected via `pg` driver
- **Connection**: Requires DATABASE_URL environment variable

### UI Components (shadcn/ui)
- Full suite of Radix UI primitives for accessible components
- Components installed in client/src/components/ui/

### Key NPM Packages
- `drizzle-orm` / `drizzle-kit`: Database ORM and migration tooling
- `@tanstack/react-query`: Async state management
- `recharts`: Chart visualizations
- `date-fns`: Date manipulation
- `zod`: Runtime schema validation
- `react-hook-form` / `@hookform/resolvers`: Form handling

### Development Tools
- `@replit/vite-plugin-runtime-error-modal`: Error overlay for development
- `@replit/vite-plugin-cartographer`: Replit-specific tooling