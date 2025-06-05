# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Main development directory**: `paperback-covers/`

```bash
# Development server (uses Turbopack)
cd paperback-covers && npm run dev

# Build for production
cd paperback-covers && npm run build

# Start production server
cd paperback-covers && npm start

# Lint code
cd paperback-covers && npm run lint
```

## Project Architecture

This is a Next.js 15 application for generating paperback book covers with AI assistance. The project uses the App Router pattern with TypeScript and Tailwind CSS.

### Key Architecture Patterns

- **State Management**: Zustand store (`src/lib/store.ts`) manages the entire project state including book details, design data, and cover images
- **Component Structure**: Editor UI is split into focused components (BookInfoForm, CoverUpload, SpineControls, BackCoverControls, AIArtGenerator) that all connect to the central Zustand store
- **Canvas Rendering**: HTML5 Canvas in CoverPreview component renders real-time book cover preview with front cover, spine, and back cover
- **AI Integration**: OpenAI DALL-E integration via serverless API routes for generating cover art

### Core Data Flow

1. User inputs book details (title, author, page count, trim size, paper type) → BookDetails interface
2. Design customizations (colors, fonts, backgrounds, text) → DesignData interface  
3. Cover image upload → stored in Project state
4. AI generation → structured inputs → prompt generation → DALL-E → applied to back cover
5. Real-time canvas preview updates with all changes
6. Export to PNG/PDF via client-side generation (jsPDF, HTML5 Canvas)

### Key Files

- `src/lib/store.ts` - Zustand state management with Project, BookDetails, DesignData interfaces
- `src/types/index.ts` - Core TypeScript interfaces for the entire application
- `src/app/editor/page.tsx` - Main editor layout with responsive grid
- `src/components/editor/CoverPreview.tsx` - Canvas rendering engine for book cover visualization
- `src/lib/utils.ts` - Spine width calculation and other utilities
- `src/lib/openai.ts` - OpenAI client configuration
- `src/app/api/ai-generate/route.ts` - DALL-E image generation endpoint
- `src/app/api/ai-prompt-suggester/route.ts` - GPT-powered prompt optimization

### Spine Width Calculation

The application calculates spine width based on page count and paper type using KDP guidelines. The calculation is in `calculateSpineWidth` function and updates live as user changes book details.

### AI Workflow

1. User provides structured inputs (motifs, elements, style, colors)
2. AI suggests optimized DALL-E prompt via GPT model
3. User reviews/edits prompt
4. DALL-E generates image
5. Image applied as back cover background in canvas

### Canvas Export System

Both PNG and PDF exports simulate 300 DPI by upscaling canvas operations before export. Uses jsPDF for PDF generation and standard canvas toBlob for PNG export.

## Environment Variables

Required in `.env.local`:
```
OPENAI_API_KEY=your_openai_api_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Current Development Status

According to execution_plan.md, the project has completed Phases 1-6:
- Core UI and customization features are implemented
- AI integration with DALL-E is functional  
- Client-side export to PNG/PDF is working
- Basic deployment to Vercel is complete

Future phases will add backend persistence, authentication, file storage, and production-ready exports.