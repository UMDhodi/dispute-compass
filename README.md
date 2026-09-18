# DisputeCompass 🧭

**AI-powered legal document analysis and dispute navigation.**

> **Legal Disclaimer:** DisputeCompass provides legal information and educational assistance only. It does not provide legal advice and is not a substitute for a qualified attorney. Always consult a licensed lawyer for your specific legal situation.

---

## Overview

DisputeCompass is a GenAI-powered application that makes legal information accessible to everyday people — particularly tenants, consumers, and anyone facing a small dispute. It transforms complex legal documents into plain-English insights, actionable roadmaps, and professional-grade briefs.

Built for **Hackathon 2026** using NVIDIA NIM's enterprise AI inference platform with Llama 3.3 70B.

## Features — 5 Modules

| Module | Description |
|--------|-------------|
| 🔍 **Clause & Risk Analyzer** | Upload any legal document; get color-coded risk scoring for every clause with plain-English explanations |
| ⚖️ **Document Comparator** | Side-by-side comparison of two contract versions with favorable/adverse change identification |
| 🗺️ **Action Roadmap** | Describe your dispute situation; get a step-by-step action plan with evidence checklist and deadlines |
| 💬 **Document Q&A Copilot** | Ask plain-English questions about your document; get answers grounded in the document with citations |
| 📝 **Legal Brief Generator** | Generate professional demand letters, legal notices, and lawyer briefing dossiers |

## Tech Stack

- **Frontend:** Next.js 15 · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui
- **AI:** NVIDIA NIM API (`meta/llama-3.3-70b-instruct`) via OpenAI-compatible SDK
- **Database:** Prisma ORM + SQLite (local `dev.db`)
- **Fonts:** Geist (headings) + Inter (body)
- **File Processing:** pdf-parse (PDF), mammoth (DOCX)

## Design System

**Palette:** Calm Clarity — Slate/charcoal base with teal/sage green accents
- Background: `#FAFAF9` (warm linen)
- Brand: `#0E9384` (teal)
- Text: `#1A1A19`
- Risk critical: `#DC2626` · warning: `#D97706` · safe: `#16A34A`

**Logo:** 4-point compass rose with north petal styled as a document corner fold

## Getting Started

### Prerequisites

- Node.js 18+ (tested on 22.x)
- npm 10+
- NVIDIA NIM API key from [build.nvidia.com](https://build.nvidia.com)

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd dispute-compass

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local and add your NVIDIA_API_KEY
```

### Configure NVIDIA API Key

Edit `.env.local`:

```env
DATABASE_URL="file:./dev.db"
NVIDIA_API_KEY="your_nvidia_api_key_here"
```

### Database Setup

```bash
# Generate Prisma client and create SQLite database
npx prisma generate
npx prisma db push
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
dispute-compass/
├── prisma/
│   └── schema.prisma         # SQLite schema
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── analyze/      # Clause & Risk Analyzer API
│   │   │   ├── compare/      # Document Comparator API
│   │   │   ├── roadmap/      # Action Roadmap API
│   │   │   ├── qa/           # Document Q&A API
│   │   │   ├── brief/        # Brief Generator API
│   │   │   └── extract/      # PDF/DOCX text extraction
│   │   ├── analyze/          # Analyzer page
│   │   ├── compare/          # Comparator page
│   │   ├── roadmap/          # Roadmap page
│   │   ├── qa/               # Q&A page
│   │   ├── brief/            # Brief Generator page
│   │   ├── layout.tsx        # Root layout with Navbar + Footer
│   │   ├── page.tsx          # Landing page
│   │   └── globals.css       # Design tokens + base styles
│   ├── components/
│   │   ├── layout/
│   │   │   ├── navbar.tsx    # Sticky responsive navbar
│   │   │   └── footer.tsx    # Footer with legal disclaimer
│   │   ├── ui/               # shadcn/ui components
│   │   ├── logo.tsx          # Compass rose SVG logo
│   │   ├── file-upload.tsx   # Drag-drop file upload
│   │   ├── risk-badge.tsx    # Risk level badges
│   │   └── disclaimer-banner.tsx # Legal disclaimer components
│   └── lib/
│       ├── nvidia.ts         # NVIDIA NIM API client
│       ├── prisma.ts         # Prisma singleton
│       ├── prompts.ts        # AI system prompts (5 modules)
│       ├── sanitize.ts       # Input sanitization
│       └── utils.ts          # Utilities (cn, etc.)
└── .env.example              # Environment variable template
```

## API Routes

All routes accept `POST` with JSON bodies:

| Route | Body | Response |
|-------|------|----------|
| `POST /api/extract` | `FormData: file` | `{ text, fileName, charCount }` |
| `POST /api/analyze` | `{ text, sessionId? }` | `{ result: AnalysisResult }` |
| `POST /api/compare` | `{ docA, docB, labelA?, labelB? }` | `{ result: CompareResult }` |
| `POST /api/roadmap` | `{ situation, documentText?, disputeType? }` | `{ result: RoadmapResult }` |
| `POST /api/qa` | `{ question, documentText, sessionId? }` | `{ result: QAResult }` |
| `POST /api/brief` | `{ situation, briefType?, yourName?, recipientName?, documentText? }` | `{ result: BriefResult }` |

## Security & Privacy

- All documents processed server-side, never stored in cloud
- Input sanitization strips null bytes, control characters, and caps length
- SQLite database is local-only (`dev.db` — gitignored)
- Legal disclaimers shown prominently throughout the application
- No user authentication required (designed for hackathon demo)

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -m 'feat: add your feature'`
4. Push and open a PR

## License

MIT License — see [LICENSE](LICENSE) for details.

---

*Built with ❤️ for [Hackathon 2026] · Not a substitute for professional legal advice*
