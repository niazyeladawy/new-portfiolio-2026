# React to Next.js (SSG) Migration Plan

## Overview & Scope

This document outlines a comprehensive migration strategy for converting the existing pure React portfolio application into a Next.js application with Static Site Generation (SSG). The migration preserves all existing UI, behavior, and structure without introducing server-side rendering, data fetching, or server components.

### Objectives

- Migrate from Vite + React to Next.js with App Router
- Maintain SSG-only output (fully static export)
- Preserve all visual effects, animations, and interactions
- Keep all components as client components
- Retain identical folder organization where feasible
- Zero behavioral changes to the end user

### Out of Scope

- Server-side rendering (SSR)
- Server components
- API routes or data fetching
- Performance optimizations or refactoring
- New features or enhancements
- Design or styling changes

---

## Current React Application Assumptions

Based on codebase analysis, the following assumptions are explicitly stated:

| Aspect                | Current State                          | Confidence |
| --------------------- | -------------------------------------- | ---------- |
| Framework             | Vite 6.2 + React 19                    | Confirmed  |
| Language              | TypeScript 5.7                         | Confirmed  |
| Routing               | None (single-page with hash anchors)   | Confirmed  |
| Styling               | Pure CSS with CSS custom properties    | Confirmed  |
| State Management      | Local state only (useState, useEffect) | Confirmed  |
| Data Fetching         | None                                   | Confirmed  |
| SSR/SSG               | None (client-only SPA)                 | Confirmed  |
| Package Manager       | pnpm 10.6.5                            | Confirmed  |
| Static Assets         | Located in /public directory           | Confirmed  |
| Environment Variables | None detected                          | Confirmed  |
| Entry Point           | src/main.tsx rendering into index.html | Confirmed  |

### Unknown Factors

- Whether any runtime browser APIs beyond standard DOM are used that may conflict with Next.js build process
- Whether the requestAnimationFrame-based mouse trail component has any implicit timing dependencies
- Whether any CSS relies on Vite-specific asset resolution paths

---

## Target Next.js Setup

| Configuration      | Value                              |
| ------------------ | ---------------------------------- |
| Next.js Version    | 15.x (latest stable)               |
| Router Type        | App Router                         |
| Rendering Strategy | Static Site Generation (SSG) only  |
| Output Mode        | Static export (`output: 'export'`) |
| React Version      | 19.x (maintain current)            |
| TypeScript         | Maintain current configuration     |
| Package Manager    | pnpm (maintain current)            |

### Next.js Configuration Requirements

The next.config.js (or next.config.ts) must include:

- `output: 'export'` for static HTML generation
- No `serverActions` enabled
- No `experimental` server features
- Image optimization disabled for static export (use `unoptimized: true`)

---

## Folder & File Mapping Table

| Current (React/Vite) | Target (Next.js App Router) | Notes                               |
| -------------------- | --------------------------- | ----------------------------------- |
| `src/main.tsx`       | Remove                      | Next.js handles app initialization  |
| `src/App.tsx`        | `src/app/page.tsx`          | Becomes root page component         |
| `index.html`         | `src/app/layout.tsx`        | HTML shell moves to root layout     |
| `src/components/`    | `src/components/`           | No change required                  |
| `src/sections/`      | `src/sections/`             | No change required                  |
| `src/styles/`        | `src/styles/`               | No change required                  |
| `src/index.css`      | `src/app/globals.css`       | Renamed and imported in layout      |
| `src/global.d.ts`    | `src/global.d.ts`           | No change required                  |
| `src/vite-env.d.ts`  | Remove                      | Vite-specific, not needed           |
| `public/`            | `public/`                   | No change required                  |
| `vite.config.ts`     | Remove                      | Replaced by next.config             |
| `tsconfig.json`      | Update                      | Next.js-specific paths and settings |
| `tsconfig.app.json`  | Remove                      | Consolidate into single tsconfig    |
| `tsconfig.node.json` | Remove                      | Not needed for Next.js              |
| `eslint.config.js`   | Update                      | Add Next.js ESLint config           |

### New Files Required

| File                 | Purpose                                          |
| -------------------- | ------------------------------------------------ |
| `next.config.ts`     | Next.js configuration with static export         |
| `src/app/layout.tsx` | Root layout (replaces index.html shell)          |
| `src/app/page.tsx`   | Root page (replaces App.tsx as entry)            |
| `next-env.d.ts`      | Next.js TypeScript declarations (auto-generated) |

---

## Route Mapping Table

| Current Behavior      | React Implementation         | Next.js Implementation              |
| --------------------- | ---------------------------- | ----------------------------------- |
| Root page `/`         | App.tsx renders all sections | `app/page.tsx` renders all sections |
| Anchor `/#about-me`   | Native HTML anchor scrolling | Same behavior (no change)           |
| Anchor `/#tech-stack` | Native HTML anchor scrolling | Same behavior (no change)           |
| External links        | Standard anchor tags         | Same behavior (no change)           |

### Navigation Analysis

The current application does not use React Router. Navigation consists of:

1. Hash-based scrolling to page sections (`href="#about-me"`)
2. External links opening in new tabs (`target="_blank"`)

This navigation pattern requires no changes for Next.js migration as it relies on native browser behavior, not framework-specific routing.

---

## Client vs Server Component Decisions

### Decision: All Components Remain Client Components

Every component file must include the `'use client'` directive at the top.

| Component                     | Reason for Client-Only                                                       |
| ----------------------------- | ---------------------------------------------------------------------------- |
| `floating-button.tsx`         | Uses hover effects requiring client interactivity                            |
| `glow-box.tsx`                | CSS animations triggered by client state                                     |
| `glow-box-link.tsx`           | Wraps interactive anchor elements                                            |
| `mouse-trail.tsx`             | Uses `useEffect`, `useRef`, `requestAnimationFrame`, direct DOM manipulation |
| `scroll-bar.tsx`              | Uses `useEffect`, `useState`, `useRef`, scroll event listeners               |
| `section-title.component.tsx` | Pure display but used within client context                                  |
| `text-hover.component.tsx`    | Character-level hover interactions                                           |
| `about-me.section.tsx`        | Contains interactive floating buttons                                        |
| `info.section.tsx`            | Contains interactive floating buttons                                        |
| `tech-stack.section.tsx`      | Contains interactive glow-box components                                     |

### Justification

1. **React hooks usage**: Multiple components use `useState`, `useEffect`, and `useRef` which require client-side execution
2. **DOM manipulation**: MouseTrail and ScrollBar components directly manipulate DOM elements
3. **Event listeners**: Scroll events, mouse events, and animation frames require browser APIs
4. **Animation dependencies**: CSS animations are triggered by component mounting and user interaction
5. **No server-side benefits**: Application has no data fetching that would benefit from server execution
6. **Preservation requirement**: Keeping components client-side ensures identical behavior

---

## Styling & Assets Handling

### CSS Files

| Current            | Action              | Target                    |
| ------------------ | ------------------- | ------------------------- |
| `src/index.css`    | Rename and relocate | `src/app/globals.css`     |
| `src/styles/*.css` | Keep in place       | Import paths remain valid |

### CSS Import Strategy

- Global CSS (`globals.css`) imported in `src/app/layout.tsx`
- Component-specific CSS continues to be imported in respective component files
- CSS custom properties (variables) remain in globals.css

### Static Assets

| Asset Type            | Location        | Handling                               |
| --------------------- | --------------- | -------------------------------------- |
| Favicons (dark mode)  | `public/dark/`  | No change - Next.js serves from public |
| Favicons (light mode) | `public/light/` | No change - Next.js serves from public |

### Font Handling

| Current                         | Target                                                       |
| ------------------------------- | ------------------------------------------------------------ |
| Google Fonts via HTML link tags | Google Fonts via next/font or maintained link tags in layout |

### Metadata Handling

Current index.html contains extensive meta tags. These must be migrated to:

- `src/app/layout.tsx` using Next.js Metadata API
- Or maintained as static tags in the layout head

Meta tags to migrate include:

- Title and description
- OpenGraph tags (og:title, og:description, og:image, og:url, og:type)
- Twitter card tags (twitter:card, twitter:title, twitter:description, twitter:image)
- Favicon links with media queries for dark/light mode
- Canonical URL

---

## Navigation & Routing Behavior Changes

### Conceptual Differences

| Aspect          | Vite/React SPA                    | Next.js SSG                                 |
| --------------- | --------------------------------- | ------------------------------------------- |
| Initial load    | Client renders after JS loads     | Pre-rendered HTML served, then hydrated     |
| Navigation      | All client-side (no page reloads) | Same for single-page (no additional routes) |
| Hash navigation | Browser-native scrolling          | Identical behavior                          |
| Hydration       | Full page hydration               | Same (all components are client)            |

### Expected Behavior Preservation

1. Hash links (`#about-me`, `#tech-stack`) continue to work identically
2. Smooth scroll behavior defined in CSS continues to apply
3. External links behave identically
4. No perceptible difference in navigation for end users

### Potential Considerations

- Next.js Link component is not required since there are no internal page routes
- Standard anchor tags (`<a href="#">`) remain appropriate
- Floating buttons using `href` attributes continue to function

---

## Build & Export Strategy

### Current Build Process

| Command        | Action                                       |
| -------------- | -------------------------------------------- |
| `pnpm build`   | TypeScript check, then Vite production build |
| `pnpm preview` | Serve production build locally               |
| Output         | `dist/` directory with static assets         |

### Target Build Process

| Command      | Action                                   |
| ------------ | ---------------------------------------- |
| `pnpm build` | Next.js static export build              |
| `pnpm start` | Not applicable (static export)           |
| Output       | `out/` directory with static HTML/CSS/JS |

### Static Export Configuration

Next.js config must specify:

- `output: 'export'` to generate static files
- `images.unoptimized: true` if any next/image usage (otherwise not needed)
- `trailingSlash` setting based on hosting requirements

### Build Verification

The static export should produce:

- `out/index.html` - Pre-rendered root page
- `out/_next/static/` - JavaScript bundles and static assets
- `out/dark/` and `out/light/` - Favicon assets (copied from public)

---

## Package.json Changes

### Dependencies to Add

| Package | Purpose           |
| ------- | ----------------- |
| `next`  | Next.js framework |

### Dependencies to Remove

| Package                | Reason                      |
| ---------------------- | --------------------------- |
| `vite`                 | Replaced by Next.js bundler |
| `@vitejs/plugin-react` | Vite-specific plugin        |

### Dependencies to Keep

| Package       | Reason                          |
| ------------- | ------------------------------- |
| `react`       | Core library                    |
| `react-dom`   | DOM rendering                   |
| `react-icons` | Icon components                 |
| `typescript`  | Type checking                   |
| `eslint`      | Linting (config updates needed) |
| `prettier`    | Formatting                      |
| `cspell`      | Spell checking                  |

### Scripts to Update

| Script    | Current                       | Target                        |
| --------- | ----------------------------- | ----------------------------- |
| `dev`     | `vite`                        | `next dev`                    |
| `build`   | `tsc -b && vite build`        | `next build`                  |
| `preview` | `vite preview`                | Remove or use `npx serve out` |
| `lint`    | Keep but update ESLint config | Add Next.js ESLint            |

---

## Risks, Constraints, and Verification Checklist

### Risks

| Risk                                                   | Likelihood | Impact | Mitigation                                |
| ------------------------------------------------------ | ---------- | ------ | ----------------------------------------- |
| Mouse trail animation timing differs after hydration   | Low        | Medium | Test animation smoothness post-migration  |
| CSS custom properties not loading in correct order     | Low        | High   | Verify globals.css import order in layout |
| Favicon media queries not working in metadata API      | Medium     | Low    | Test dark/light mode favicon switching    |
| Build fails due to DOM access during static generation | Medium     | High   | Ensure all DOM access is in useEffect     |
| TypeScript config incompatibility                      | Low        | Medium | Review and update tsconfig for Next.js    |

### Constraints

1. All components must remain client components (no partial hydration benefits)
2. Static export mode disables certain Next.js features (ISR, API routes)
3. Image optimization unavailable in static export mode
4. Dynamic routes not applicable (single page application)

### Pre-Migration Verification Checklist

- [ ] Confirm all useEffect hooks properly guard DOM access
- [ ] Verify no top-level DOM access in component files
- [ ] Document all CSS file import paths
- [ ] Catalog all meta tags from index.html
- [ ] Note current favicon behavior for verification

### Post-Migration Verification Checklist

- [ ] Application loads without console errors
- [ ] All three sections render correctly (Info, About Me, Tech Stack)
- [ ] Hash navigation scrolls to correct sections
- [ ] Mouse trail effect functions identically
- [ ] Scroll bar indicator updates on scroll
- [ ] Floating buttons display hover effects
- [ ] Glow box animations trigger correctly
- [ ] Text hover effects work on character level
- [ ] External links open in new tabs
- [ ] Favicons switch based on color scheme preference
- [ ] All fonts load correctly (Fugaz One, Open Sans)
- [ ] Responsive breakpoints function (700px, 768px, 600px, 450px)
- [ ] Static export produces valid HTML
- [ ] Exported site functions without JavaScript (graceful degradation)
- [ ] Build completes without TypeScript errors
- [ ] Build completes without ESLint errors
- [ ] Production build size is comparable to Vite build

---

## Migration Step Sequence

The following sequence outlines the order of operations (implementation details excluded):

1. Initialize Next.js configuration alongside existing Vite setup
2. Create App Router folder structure
3. Create root layout with metadata from index.html
4. Create root page incorporating App.tsx content
5. Add 'use client' directive to all component files
6. Relocate and rename global CSS
7. Update TypeScript configuration
8. Update ESLint configuration
9. Update package.json scripts
10. Remove Vite-specific files
11. Test development server
12. Test static export build
13. Verify all functionality against checklist

---

## Approval Required Before Implementation

This migration plan requires explicit approval before any implementation begins.

### Approval Checklist

- [ ] Overview and scope accurately reflects project goals
- [ ] All assumptions about current application are verified
- [ ] Target Next.js configuration is acceptable
- [ ] Folder and file mapping is complete and accurate
- [ ] Client component strategy is approved
- [ ] Build and export approach meets deployment requirements
- [ ] Risk mitigations are acceptable
- [ ] Verification checklist is comprehensive

### Approver Sign-off

| Role           | Name | Date | Approval |
| -------------- | ---- | ---- | -------- |
| Project Owner  |      |      | Pending  |
| Technical Lead |      |      | Pending  |

### Post-Approval Next Steps

Upon approval, implementation will proceed according to the migration step sequence. No code will be written, modified, or executed until this plan receives explicit approval.

---

**Document Status**: Draft - Pending Approval

**Created**: 2026-01-31

**Last Updated**: 2026-01-31
