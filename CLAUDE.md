# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Development Server
- `npm run dev` - Start development server on port 3000 (local mode)
- `npm run dev:e2e` - Start development server in integration mode for E2E testing

### Building and Deployment
- `npm run build` - Build the Astro application for production
- `npm run preview` - Preview the built application locally

### Code Quality
- `npm run lint` - Lint and fix TypeScript/Astro files
- `npm run lint:check` - Check linting without fixing
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check formatting without fixing

### Testing
- `npm run test` - Run unit tests with Vitest
- `npm run test:watch` - Run tests in watch mode
- `npm run test:ui` - Run tests with UI interface
- `npm run test:coverage` - Generate test coverage report
- `npm run test:e2e` - Run end-to-end tests with Playwright
- `npm run test:e2e:ui` - Run E2E tests with UI
- `npm run test:e2e:codegen` - Generate test code with Playwright

### Special Scripts
- `npm run generate-rules` - Generate rules JSON from TypeScript definitions (required before deploying MCP server)

### Supabase Local Development
- `supabase start` - Start local Supabase (requires Docker)
- `supabase status` - Check Supabase status
- `supabase migration up` - Apply new migrations (preferred over `supabase db reset`)
- Install via: `brew install supabase/tap/supabase` (macOS)

## Architecture Overview

### Technology Stack
- **Framework**: Astro 5 with React 18.3 integration
- **Styling**: Tailwind CSS 4
- **State Management**: Zustand for client-side state
- **Database**: Supabase (PostgreSQL with real-time features)
- **Testing**: Vitest for unit tests, Playwright for E2E tests
- **Authentication**: Supabase Auth with email/password and password reset

### Project Structure

#### Core Application (`src/`)
- `pages/` - Astro pages with extensive API routes under `api/`:
  - `api/auth/*` - Authentication endpoints (login, signup, password reset, verification)
  - `api/prompts/*` - Prompt library endpoints including admin routes
  - `api/rule-collections/*` - User rule collections CRUD
  - `api/invites/*` - Organization invite handling
  - `api/captcha/*` - Cloudflare Turnstile verification
- `components/` - React components organized by feature
- `data/` - Static data including AI rules definitions organized by stack in `rules/` subdirectory
- `services/` - Business logic services:
  - `rules-builder/RulesBuilderService` - Core markdown generation with strategy pattern
  - `prompt-library/` - Prompt management, access control, invites
  - `auth.ts`, `captcha.ts`, `rateLimiter.ts` - Infrastructure services
- `store/` - Zustand stores for state management (see State Management section)
- `hooks/` - Custom React hooks for auth, captcha, URL sync, etc.

#### Key Components Architecture
- **Rules System**: Rules are organized by technology stacks (frontend, backend, database, etc.) and stored in `src/data/rules/`
  - Each category (frontend, backend, database, testing, infrastructure, coding, accessibility) exports rule definitions
  - Rules support placeholder replacement for project-specific values
  - Generated rules.json file used by MCP server (via `npm run generate-rules`)
- **Rules Builder Service**: Core service in `src/services/rules-builder/` that generates markdown content
  - Uses strategy pattern with two implementations:
    - `SingleFileRulesStrategy` - Generates one markdown file with all rules
    - `MultiFileRulesStrategy` - Generates separate files per technology stack
  - Groups libraries by stack and layer before generation
- **Collections System**: User can save and manage rule collections via `ruleCollectionsStore`
  - Tracks dirty state by comparing current selections to original libraries
  - Handles unsaved changes dialog when switching collections
- **Prompt Library**: Feature-flagged system for managing shared prompts with organizations
  - Multi-organization support with invite system
  - Prompt collections with segments for organization
  - Access control and publishing workflow
- **Feature Flags**: Environment-based feature toggling system in `src/features/featureFlags.ts`
  - Supports `auth`, `collections`, `authOnUI`, `promptLibrary`, `orgInvites` flags
  - Environment-specific configs for `local`, `integration`, `prod`

#### MCP Server (`mcp-server/`)
Standalone Cloudflare Worker implementing Model Context Protocol for programmatic access to AI rules:
- **Tools provided**:
  - `listAvailableRules` - Returns available rule libraries with identifiers, names, and stacks
  - `getRuleContent` - Fetches specific rule content by library identifier
- **Rate limiting**: 10 requests per 60 seconds per IP via Cloudflare Rate Limiting API
- **Data source**: Reads from `preparedRules.json` generated by root `npm run generate-rules`
- **Deployment**: Auto-deployed via GitHub Actions on merge to master
- **Local dev**: `cd mcp-server && npm run dev` (runs on http://localhost:8787/sse)

### State Management Pattern
The application uses Zustand with multiple specialized stores:
- `techStackStore` - Manages selected layers, stacks, and libraries
  - Uses URL-based persistence (`createUrlStorage`) to encode state in query params
  - Tracks `originalLibraries` for dirty state detection when editing collections
  - Provides utility methods: `isLayerSelected`, `isStackSelected`, `isLibrarySelected`, `isDirty`
- `ruleCollectionsStore` - Handles saved rule collections
  - Fetches, creates, updates, and deletes collections via API
  - Manages pending collection selection with unsaved changes dialog
  - Coordinates with `techStackStore` for selection state
- `authStore` - Authentication state management (session, user info)
- `projectStore` - Project metadata (name, description) for rule generation
- `promptsStore` - Prompt library state (if feature enabled)
- `navigationStore` - UI navigation state

### Environment Configuration
- Uses Astro's environment schema for type-safe environment variables defined in `astro.config.mjs`
- Supports three environments: `local`, `integration`, `prod` (set via `PUBLIC_ENV_NAME`)
- Feature flags control functionality per environment (see `src/features/featureFlags.ts`)
- Required `.env.local` variables:
  ```
  PUBLIC_ENV_NAME=local
  SUPABASE_URL=http://localhost:54321
  SUPABASE_PUBLIC_KEY=your_supabase_anon_key
  SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
  CF_CAPTCHA_SITE_KEY=1x00000000000000000000AA
  CF_CAPTCHA_SECRET_KEY=1x0000000000000000000000000000000AA
  ```

### Database Integration
- Supabase PostgreSQL with TypeScript types in `src/db/database.types.ts`
- Main tables: `rule_collections`, `prompts`, `prompt_collections`, `organization_invites`, `user_consents`
- Row Level Security (RLS) policies implemented for all tables
- Migrations in `supabase/migrations/` with timestamp naming convention
- **Migration naming**: `YYYYMMDDHHmmss_description.sql` (e.g., `20240906123045_create_profiles.sql`)
- **Migration best practices**:
  - Always enable RLS on new tables
  - Write granular policies per operation (select, insert, update, delete) and role (anon, authenticated)
  - Use lowercase SQL with extensive comments
  - Add header comments explaining migration purpose
  - Prefer `supabase migration up` over `supabase db reset` when testing

### Testing Strategy
- **Unit tests**: Vitest with React Testing Library and JSDOM
  - Located in `tests/unit/` with setup files in `tests/setup/`
  - Mock Service Worker (MSW) for API mocking
  - Coverage reports available via `npm run test:coverage`
- **E2E tests**: Playwright with Page Object Model pattern
  - Located in `e2e/` with page objects in `e2e/page-objects/`
  - Fixtures in `e2e/fixtures/`
  - Run dev server in integration mode: `npm run dev:e2e`
- **Integration tests**: For MCP server in `mcp-server/tests/`
- All tests run in CI/CD pipeline via GitHub Actions

### Rules Content System
Rules are defined as TypeScript objects and exported from category-specific files in `src/data/rules/`. The system supports:
- Categorization by technology layers (frontend, backend, database, etc.)
- Library-specific rules with placeholder replacement
- Multi-file vs single-file output strategies
- Markdown generation with project context

### Development Workflow

#### Adding New Rules
1. Add rule definitions in appropriate category file in `src/data/rules/` (frontend.ts, backend.ts, etc.)
2. **IMPORTANT**: Add corresponding translations in `src/i18n/translations.ts` - unit tests will fail without them
3. Use placeholders like `{{placeholder_text}}` for project-specific values
4. Run `npm run generate-rules` to update `preparedRules.json` for MCP server
5. Follow existing patterns for rule structure and naming

#### Working with Feature Flags
- New features should be controlled via `src/features/featureFlags.ts`
- Add feature flag for each environment (local, integration, prod)
- Use `isFeatureEnabled()` in code to check flag status
- Environment-specific overrides supported (e.g., `PROMPT_LIBRARY_ENABLED`)

#### Collections and State Management
- User selections persist in URL via `techStackStore` URL storage
- Collections save user rule combinations to database
- Dirty state detection compares current selection to `originalLibraries`
- Always sync `techStackStore` when loading collections

#### MCP Server Development
1. Make changes to rules in main app under `src/data/rules/`
2. Run `npm run generate-rules` to regenerate `preparedRules.json`
3. Test locally: `cd mcp-server && npm run dev`
4. Deploy automatically triggers on merge to master branch
5. MCP server code in `mcp-server/src/` (tools in `tools/rulesTools.ts`)

#### Authentication & Security
- All auth flows use Supabase Auth with email verification
- Cloudflare Turnstile used for captcha protection
- Rate limiting implemented via `rateLimiter.ts` service
- RLS policies enforce data access control at database level