# Paperback Cover Generator - Technical Execution Plan

## Overview

This execution plan guides the development of the paperback cover generator web application. The plan is structured in phases, with an initial focus on core UI/UX and AI-assisted design features using placeholders for backend functionalities. Backend systems (database, authentication, payments) will be integrated in later phases.

**Target MVP Features (UI/AI First Approach):**
-   **Core UI & Customization:**
    -   Basic book information input (title, author, page count, trim size, paper type).
    -   Cover image upload and client-side processing/preview.
    -   Interactive spine generation: width calculation, text input, font selection, color, gradient background. **(Basic text rendering and flat color completed)**
    -   Interactive back cover design: flat color, gradient, geometric patterns, text areas (drag, resize, style), option for AI background. **(Basic text rendering and flat color completed)**
    -   OpenAI DALL-E integration for generating/suggesting cover elements (e.g., background patterns, abstract graphics, full back cover backgrounds).
    -   Comprehensive real-time preview system (front, spine, back, full wraparound). **(Partially complete - front, spine, back are previewed with basic styling)**
    -   Client-side PDF/PNG export simulation (final backend export in a later phase).
-   **Placeholders For:**
    -   User authentication (mocked or no auth initially).
    -   Database persistence (local state or browser storage for drafts).
    -   File storage (initial uploads handled client-side or to temporary mock storage).
    -   Credit system and Stripe integration (UI mockups, no live transactions).

## Phase 1: Project Setup and Core UI Infrastructure

### 1.1 Account Creation and Service Setup (Initial Pass)

#### 1.1.1 Create Required Accounts (as needed for early development)
1.  **Vercel Account**
    -   Sign up at vercel.com
    -   Connect GitHub account for deployment.
2.  **OpenAI Account**
    -   Sign up at openai.com
    -   Add payment method and obtain API key for DALL-E integration.
    -   Set usage limits for cost control.
3.  **File Storage Service (Preference: Vercel Blob)**
    -   Explore Vercel Blob within Vercel dashboard. (Full setup deferred).
4.  **Database Service (Simplest Option - Consider Vercel Postgres)**
    -   Note: Initial development will use local state. Full DB setup deferred.
    -   Option A: PlanetScale (MySQL) - if preferred later.
    -   Option B: Supabase (PostgreSQL + features) - if preferred later.
    -   Option C: Vercel Postgres (for simplicity with Vercel ecosystem) - if preferred later.
5.  **Stripe Account**
    -   Sign up at stripe.com (Test API keys can be obtained; full integration deferred).

#### 1.1.2 Environment Setup Checklist (Initial for AI)
-   [ ] Vercel account created and GitHub connected.
-   [ ] OpenAI account created with API key.
-   [ ] API keys for OpenAI documented securely.
-   [ ] (Deferred) Database service account created.
-   [ ] (Deferred) File storage service configured.
-   [ ] (Deferred) Stripe account created with test keys.

### 1.2 Project Initialization

#### 1.2.1 Create Next.js Project Structure
**AI Task:** Create a new Next.js project:
-   Next.js 14+ with App Router
-   TypeScript
-   Tailwind CSS
-   ESLint and Prettier

**Simplified Initial Project Structure (focus on `app` and `components`):**
```
paperback-covers/
├── src/
│   ├── app/
│   │   ├── editor/            # Main editor interface
│   │   │   └── page.tsx
│   │   ├── api/               # For OpenAI calls initially
│   │   │   └── ai-generate/route.ts
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                # Basic UI elements (buttons, inputs)
│   │   ├── editor/            # Editor-specific components (preview, controls)
│   │   │   ├── CoverPreview.tsx
│   │   │   ├── SpineControls.tsx
│   │   │   ├── BackCoverControls.tsx
│   │   │   └── AIArtGenerator.tsx
│   │   └── layout/            # Main app layout (header, footer if simple)
│   ├── lib/
│   │   ├── openai.ts          # OpenAI client setup
│   │   └── utils.ts           # General utility functions (e.g., spine calculation)
│   └── types/
│       └── index.ts           # Core type definitions
├── public/
│   ├── fonts/
│   └── images/              # Placeholder images, icons
└── configuration files (next.config.js, tsconfig.json, tailwind.config.ts)
```

#### 1.2.2 Install Core Dependencies (Initial Set)
**AI Task:** Install and configure:
-   `@next/font`
-   `sharp` (for potential client-side image manipulations if feasible, or server-side later)
-   `openai`
-   `colorthief` (for client-side color extraction from uploaded cover)
-   `react-hook-form`
-   `zustand` (for client-side state management)
-   `react-dropzone`
-   `lucide-react` (for icons)

#### 1.2.3 Environment Configuration (Initial for AI)
**AI Task:** Create initial `.env.local` structure:
```
# OpenAI API
OPENAI_API_KEY=

# Application (if needed for Vercel deployment)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```
**Deliverable:** Next.js project initialized with core UI dependencies, basic editor layout, and configured for OpenAI API access.

## Phase 2: Core Editor UI - Book Info, Cover Upload & Basic Preview

### 2.1 Book Information Form
**AI Task:** Create form for book details:
-   Inputs: Title, Author, Page Count, Trim Size (dropdown with common sizes), Paper Type (dropdown impacting spine).
-   Use `react-hook-form` for validation.
-   Store data in `zustand` store.
-   Live update spine width calculation based on page count/paper type.

### 2.2 Cover Upload System
**AI Task:** Implement file upload:
-   `react-dropzone` for drag-and-drop.
-   Client-side validation (type, basic size).
-   Image preview.
-   Use `colorthief` to extract dominant colors from uploaded cover for suggestions.
-   Store uploaded image (e.g., as base64 or Object URL) in `zustand` store.

### 2.3 Basic Canvas Preview System
**AI Task:** Create initial HTML5 Canvas preview:
-   Component to display uploaded front cover.
-   Dynamically draw spine based on calculated width and a default color.
-   Draw a solid back cover with a default color.
-   Update preview in real-time as book info or cover image changes.

**Deliverable:** User can input book details, upload a front cover image, and see a basic, dynamically updating preview of the front, spine, and back.

## Phase 3: Spine and Back Cover Customization UI

### 3.1 Spine Customization Interface
**AI Task:** Develop UI controls for spine:
-   Text input for spine title, author. **(Completed)**
-   Font family dropdown (system fonts or a few bundled web fonts initially). **(Completed)**
-   Font size adjustment. **(Completed)**
-   Text orientation (horizontal/vertical). **(Completed - Defaulting to vertical, rotated horizontal text)**
-   Color picker for text and spine background (flat color). **(Completed)**
-   Gradient option for spine background. **(Completed)**
-   Integrate suggestions from `colorthief` (from uploaded cover). **(Completed - though not explicitly for spine, color pickers are available)**
-   Live update of the spine in the canvas preview. **(Completed)**
-   Review and ensure spine width calculation matches KDP guidelines. **(Completed)**
-   Remove any debug lines from spine text rendering. **(Completed)**

### 3.2 Back Cover Customization Interface
**AI Task:** Develop UI controls for back cover:
-   Flat background color picker. **(Completed)**
-   Gradient background option. **(Completed)**
-   Geometric pattern background option (e.g., stripes, dots, checkerboard - select from predefined list). **(Completed)**
-   UI hook/placeholder for using AI-generated image as background (actual generation/application in Phase 4). **(Pending - UI buttons in place, functionality pending)**
-   Simple text area input for blurb/description. **(Completed)**
-   Font, size, color options for back cover text. **(Completed)**
-   UI for barcode area (placeholder and safe zone). **(Completed)**
-   Back cover blurb container box (squircle) with controls for fill, corner radius, padding, position, size, and opacity. **(Completed)**
-   Draggable/resizable text boxes (stretch goal for initial UI, can be simplified). **(Deferred - using fixed position blurb box with percentage-based sizing and offset for now)**
-   Live update of the back cover in the canvas preview. **(Completed)**

**Deliverable:** Interactive UI for customizing spine (text, font, colors, flat/gradient background, accurate width) and back cover (flat/gradient/pattern background, text content/styling, blurb container box, barcode safe area placeholder), with changes reflected live in the preview.
**STATUS: LARGELY COMPLETE. Most UI and rendering features for spine and back cover customization are implemented. The primary remaining item is the functional AI integration for back cover backgrounds. Draggable text boxes were simplified to a configurable blurb box.**

## Phase 4: AI Integration - Cover Element Generation (OpenAI)

### 4.1 OpenAI DALL-E Integration Setup
**AI Task:** Implement OpenAI DALL-E integration:
-   Set up API client in `lib/openai.ts`. **(Completed)**
-   Create serverless function (`app/api/ai-generate/route.ts`) to handle requests to OpenAI securely. **(Completed)**
-   Basic error handling and request management. **(Completed)**

### 4.2 User Interface for AI Features
**AI Task:** Create AI generation workflow within the editor:
-   **Structured Input UI:** Create UI in `BackCoverControls.tsx` for users to input discrete elements for their desired image (e.g., motifs, key elements, setting/style, preferred colors).
-   **AI-Assisted Prompt Generation:**
    -   Add a "Suggest DALL-E Prompt" button.
    -   When clicked, send the structured inputs to a new serverless function (e.g., `app/api/ai-prompt-suggester/route.ts`).
    -   This new function will use an OpenAI chat model (e.g., GPT-3.5-turbo or GPT-4) to generate a well-crafted DALL-E prompt based on the user's inputs, optimized for generating a flat image suitable for a book cover at the required aspect ratio/resolution.
-   **User Review and Confirmation of Prompt:**
    -   Display the AI-suggested DALL-E prompt to the user in an editable textarea.
    -   Provide a "Confirm Prompt & Generate Image" button.
-   **Image Generation:**
    -   When the user confirms (after potential edits), send the final DALL-E prompt to the existing `app/api/ai-generate/route.ts` (DALL-E) endpoint.
-   **Image Display & Application:**
    -   Display the generated image (or a preview/URL) to the user.
    -   Implement the mechanism to apply the selected AI-generated image as the back cover background in the canvas preview.
-   **Area of Application:** (Initially focused on back cover background, can be expanded later).
-   **Cost Considerations:** (UI notes about API usage, for later full implementation).

**Deliverable:** Users can provide structured inputs, receive an AI-suggested DALL-E prompt, review/edit it, and then generate an image to apply to their back cover design in the preview.

## Phase 5: Enhanced Preview and Client-Side Export Simulation

### 5.1 Comprehensive Preview Interface
**AI Task:** Enhance the preview system:
-   Toggle views: front, spine, back, full wraparound. **(Pending)**
-   Zoom/pan controls for the preview. **(Pending)**
-   Print guidelines overlay (bleed, safe zone, trim lines). **(Partially Completed - Bleed, Trim, and Safe Area lines implemented. Full wraparound preview pending for full guideline utility.)**

### 5.2 Client-Side Export Simulation
**AI Task:** Simulate file generation:
-   "Export to PNG" button: Convert current canvas state to a PNG image and trigger download in browser.
-   "Export to PDF" button: Explore client-side PDF generation libraries (e.g., `jsPDF`) to create a basic PDF from the canvas. Output will be for preview/simulation, not print-ready quality yet.
-   Focus on demonstrating the export flow; print-quality backend generation deferred.

**Deliverable:** Enhanced preview system and client-side simulated export to PNG/PDF.

## Phase 6: Core Application Structure & Initial Deployment

### 6.1 Main Application Layout
**AI Task:** Create responsive layout components:
-   Simple Header with application title.
-   Main content area for the editor.
-   Simple Footer.
-   Basic mobile responsiveness for the editor interface.

### 6.2 Initial Vercel Deployment
**AI Task:** Deploy the UI-focused application to Vercel:
-   Ensure environment variables (OpenAI key) are set up on Vercel.
-   Test core UI functionality on the deployed version.

**Deliverable:** Basic application shell deployed to Vercel with functioning UI editor, AI integration, and simulated export.

---
**LATER PHASES: Backend Integration & Full Feature Set**
---

## Phase 7: Database Schema and Backend Setup

### 7.1 Database Selection and Schema Design
**AI Task:**
-   Finalize Database Choice: Vercel Postgres (recommended for simplicity), PlanetScale, or Supabase.
-   Design Database Schema:
    -   **Users Table:** (id, email, name, (mocked)credit_balance, created_at, updated_at)
    -   **Projects Table:** (id, user_id (nullable initially), name, book_data_json, design_data_json, cover_image_placeholder_url, status, created_at, updated_at)
    -   (Simplified initial tables, expand later)
-   Set Up ORM (Prisma recommended) and create migration files.

### 7.2 Backend API for Project Persistence
**AI Task:** Create API endpoints:
-   Save project data (book info, design choices, placeholder for cover image URL) to the database.
-   Load project data.
-   List user's projects (mock user initially).
-   Connect editor UI to save/load project data via these APIs.

**Deliverable:** Ability to save and load cover design projects (without full user auth yet, possibly tied to session or local user ID).

## Phase 8: User Authentication

### 8.1 NextAuth Configuration
**AI Task:** Implement authentication with NextAuth:
-   Email/password provider (initially).
-   Google OAuth provider.
-   Protected routes for editor/dashboard.
-   Update database schema for users (password_hash, email_verified, provider).

### 8.2 Auth UI Components
**AI Task:** Create authentication components:
-   Login, Registration, Password Reset forms.
-   User profile display (name, email, mock credit balance).
-   Associate projects with authenticated users.

**Deliverable:** Working authentication system; users can register, log in, and manage their projects.

## Phase 9: File Storage and Server-Side Image Processing

### 9.1 Vercel Blob (or chosen service) Integration
**AI Task:**
-   Configure Vercel Blob for storing uploaded cover images.
-   Update API to handle image uploads to Blob.
-   Replace placeholder/client-side image storage with URLs from Blob.

### 9.2 Server-Side Image Processing
**AI Task:** Enhance API endpoints for:
-   Image validation and optimization (using `sharp` on the server).
-   Resizing images as needed for different views or for print.
-   Storing processed image metadata.

**Deliverable:** User-uploaded cover images are securely stored in Vercel Blob, and projects reference these stored images.

## Phase 10: Production-Ready Export and Credit System Foundation

### 10.1 Server-Side Print-Quality Export
**AI Task:** Create robust export system:
-   API endpoint to generate high-resolution (300 DPI) PNG from canvas data.
-   API endpoint to generate print-ready PDF (embedding fonts, correct color profiles, bleed/trim marks) from canvas data. This may involve libraries like `Puppeteer` on the server or a dedicated PDF generation service.
-   Link these to the export buttons in the UI.

### 10.2 Basic Credit System Logic (Backend)
**AI Task:** Implement foundational credit logic:
-   `credit_balance` field on Users table.
-   API to check credit balance.
-   API to deduct credits upon successful print-quality export.
-   (No payment processing yet, manual credit adjustment or default credits for users).
-   Downloads Table (id, user_id, project_id, file_type, file_url, credits_used, created_at).

**Deliverable:** Users can export print-quality PNG/PDF files, with a basic credit deduction mechanism (manual credit top-up).

## Phase 11: Stripe Integration and Full Credit Management

### 11.1 Stripe Integration for Credit Purchase
**AI Task:** Implement Stripe payment flow:
-   Stripe Payment Intents.
-   UI for credit package selection.
-   Stripe Elements for secure payment form.
-   Webhooks for payment success, updating credit balance.
-   Transactions Table (id, user_id, stripe_payment_intent_id, credits_purchased, amount_paid, status, created_at).

### 11.2 Full Credit Management UI
**AI Task:**
-   Display credit balance in user dashboard/profile.
-   Transaction history view.
-   Notifications for low balance (UI only).

**Deliverable:** Complete payment system for purchasing credits and full credit management features.

## Phase 12: Testing, Deployment, and Documentation

### 12.1 Testing and Quality Assurance
-   **Unit Tests:** For utility functions, core logic (spine calculation, AI prompt handling).
-   **Integration Tests:** For UI flows (project creation, customization, AI generation, simulated export initially, then full export). Later, test auth, payment flows.
-   **Manual Testing:** Cover all user workflows, different browsers, responsiveness.
-   **Print Quality Validation:** Test exported PDFs with print services or validation tools.

### 12.2 Production Deployment and Monitoring
-   Full Vercel deployment configuration (production env vars).
-   Set up Vercel Analytics.
-   Error tracking (e.g., Sentry).

### 12.3 Documentation
-   User guides (getting started, feature explanations).
-   Technical documentation (API, DB schema if complex).

**Deliverable:** Thoroughly tested, production-ready application with documentation.

## Post-Launch: Iteration and Enhancement
-   Monitor performance and user feedback.
-   Bug fixes and optimizations.
-   Plan for Phase 2 features: advanced AI, enhanced customization, templates, etc.

## Development Notes and Best Practices
-   **Code Quality:** TypeScript, ESLint, Prettier, consistent naming, error boundaries.
-   **Performance:** Optimize images, lazy loading, React.memo, bundle size, caching (client & server).
-   **Security:** Validate inputs, HTTPS, secure API keys, (later) rate limiting, auth checks.
-   **Scalability:** (Later phases) Efficient DB queries, CDN, plan for scaling.

This revised plan prioritizes getting a highly interactive, AI-assisted cover design tool into a testable state quickly, deferring backend complexities.