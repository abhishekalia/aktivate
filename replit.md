# Aktivate.ai

## Overview

Aktivate.ai is a website/web application for an AI automation and creative studio serving Insurance & Logistics operators. The tagline is "Build the Engine. Build the Face." — it combines automated operations with automated brand presence. The project uses a full-stack TypeScript architecture with a React frontend, Express backend, and PostgreSQL database.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React with TypeScript, bundled by Vite
- **Routing**: Wouter (lightweight client-side router)
- **State/Data Fetching**: TanStack React Query for server state management
- **UI Components**: shadcn/ui component library (new-york style) built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming, class-variance-authority for component variants
- **Forms**: React Hook Form with Zod resolvers for validation
- **Design Theme**: Full terminal aesthetic — entire site feels like it's inside a terminal. All-dark backgrounds (#000, #080808, #050505, #0c0c0c), green (#33ff33) and white (#e0e0e0) text, green glow accents on borders/cards/buttons, CRT scanline overlay across the whole page via `body::after`. Fonts: DM Mono (body/nav/footer), Space Grotesk (headings). Green terminal-style buttons (flat, glowing, no 3D). Section labels prefixed with `//` instead of brackets. Crosshair cursor. CSS variables: `--term-green: #33ff33`, `--term-dim: #1a8c1a`. All styling defined inline in `client/index.html`
- **Landing Page**: Single-page static site in `client/index.html` with scroll-driven zoom portal effect (retro Macintosh computer zooms in as you scroll, entering the screen — content sections appear "inside" the monitor). Sections: ticker, problem, system, showcase, process, results, for-who, about, CTA. Section classes: `.light-section` (off-white), `.dark-section` (ink), `.sky-section` (sky blue)
- **Zoom Portal (Desktop)**: `#hero-spacer` (300vh tall) wraps sticky `#hero-sticky` with hero text + iMac image. JS drives scale/translate on scroll with eased progress. `#zoom-overlay` fades in at 80% to transition into `#main-content`. Computer image: `client/public/imac-front.png`. Hidden on mobile (≤960px).
- **Mobile Hero (3D)**: Separate `#mobile-hero` section shown only on mobile (≤960px). Uses React Three Fiber for a full-viewport 3D scene: synthwave green grid floor, iMac G3 as a parallax-tilting billboard (reacts to touch/device orientation), outlined "AKTIVATE" text behind it, floating particles, film grain + vignette post-processing. HUD overlays: top bar (logo + "AI AUTOMATION STUDIO"), hero text (headline + label), stats column, game-style nav (Press Start 2P font, CRT scanlines, glitch hover), and green CTA button. Component: `client/src/components/MobileHero3D.tsx`, lazy-loaded in `main.tsx` only on mobile (≤960px). Desktop hero (`#hero-spacer`, `#zoom-overlay`) hidden on mobile via `display:none`.
- **Terminal Game**: Full-screen terminal overlay (`#terminal-overlay`, z-index 9999) that plays before the main site. Black bg, green DM Mono text, CRT scanline overlay. 6-phase interactive diagnostic: boot sequence → identity selection → 4 yes/no questions → fake scan animation → personalized results → CTA. Answers tracked in JS `gameState` object. Dismisses with slide-up animation revealing the hero section. Body gets `terminal-active` class during game (locks scroll, hides nav).
- **Path Aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

### Backend
- **Framework**: Express 5 on Node.js with TypeScript (run via tsx)
- **HTTP Server**: Node's built-in `createServer` wrapping Express
- **API Pattern**: All API routes should be prefixed with `/api`
- **Storage Layer**: Abstracted behind an `IStorage` interface in `server/storage.ts`. Currently uses in-memory `MemStorage` implementation. This can be swapped to a database-backed implementation.
- **Dev Server**: Vite dev server runs as middleware in development mode with HMR
- **Production**: Static files served from `dist/public` with SPA fallback to `index.html`
- **Build**: Custom build script (`script/build.ts`) that runs Vite for client and esbuild for server, outputting to `dist/`

### Shared Code
- **Schema**: `shared/schema.ts` contains Drizzle ORM table definitions and Zod validation schemas
- **Current Schema**: A `users` table with `id` (UUID), `username`, and `password` fields
- **Validation**: `drizzle-zod` generates Zod schemas from Drizzle table definitions

### Database
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Database**: PostgreSQL (connection via `DATABASE_URL` environment variable)
- **Migrations**: Drizzle Kit configured to output migrations to `./migrations` directory
- **Schema Push**: Use `npm run db:push` to push schema changes directly to the database
- **Session Store**: `connect-pg-simple` is available for PostgreSQL-backed sessions

### Key Commands
- `npm run dev` — Start development server with Vite HMR
- `npm run build` — Build client and server for production
- `npm run start` — Run production build
- `npm run check` — TypeScript type checking
- `npm run db:push` — Push Drizzle schema to PostgreSQL

## External Dependencies

### Database
- **PostgreSQL** — Primary database, connected via `DATABASE_URL` environment variable

### Key Libraries
- **Drizzle ORM** — SQL query builder and schema definition
- **Zod** — Runtime validation (integrated with Drizzle and React Hook Form)
- **Express 5** — HTTP server framework
- **TanStack React Query** — Client-side data fetching and caching
- **Radix UI** — Accessible headless UI primitives (full suite installed)
- **Recharts** — Charting library (available via shadcn chart component)
- **Embla Carousel** — Carousel component
- **Vaul** — Drawer component

### Build Tools
- **Vite** — Frontend bundler with React plugin
- **esbuild** — Server bundler for production
- **tsx** — TypeScript execution for development
- **Tailwind CSS** — Utility-first CSS framework
- **PostCSS/Autoprefixer** — CSS processing

### Replit-Specific
- `@replit/vite-plugin-runtime-error-modal` — Runtime error overlay
- `@replit/vite-plugin-cartographer` — Dev tooling (dev only)
- `@replit/vite-plugin-dev-banner` — Dev banner (dev only)

### Fonts (External CDN)
- Google Fonts: Unbounded, DM Mono, Instrument Serif