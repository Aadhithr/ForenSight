# ForenSight AI

Multimodal AI forensic analysis platform for scene reconstruction and evidence reasoning.
https://youtu.be/Ip_bJENt94Y

## Prerequisites

- Node.js 18+ and npm
- **ffmpeg** (required for video frame extraction)
  - macOS: `brew install ffmpeg`
  - Linux: `sudo apt-get install ffmpeg` or `sudo yum install ffmpeg`
  - Windows: Download from [ffmpeg.org](https://ffmpeg.org/download.html)

## Setup

### Quick Start

1. Install all dependencies:
   ```bash
   npm run install:all
   ```

2. **Backend Setup:**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env and add your GEMINI_API_KEY
   npm run dev
   ```

3. **Frontend Setup (in a new terminal):**
   ```bash
   cd frontend
   cp .env.local.example .env.local
   # Edit .env.local if needed (default should work)
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Backend Details

1. Navigate to `backend/` directory
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and add your API keys:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   NANO_BANANA_API_KEY=your_key_here (optional for now)
   NANO_BANANA_API_URL=https://api.nanobanana.com (optional)
   ```
4. Start the server:
   ```bash
   npm run dev
   ```
   Server runs on http://localhost:3001

### Frontend Details

1. Navigate to `frontend/` directory
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.local.example` to `.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3001
   ```
4. Start the dev server:
   ```bash
   npm run dev
   ```
   Frontend runs on http://localhost:3000

## Features

- Multi-evidence upload (images, videos, audio, text)
- Video frame extraction (1-second intervals)
- Gemini 3-powered analysis:
  - Evidence summarization
  - Timeline construction
  - Contradiction detection
  - Scenario generation
- Real-time analysis progress with reasoning display
- Case-aware chat assistant
- Beautiful animated UI

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Framer Motion
- **Backend**: Express, TypeScript, SQLite
- **AI**: Gemini 3 Pro
- **Image Generation**: Nano Banana Pro (stub implementation)

