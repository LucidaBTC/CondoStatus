# CertAnalyzer - Simple

AI-powered Ontario condo status certificate analyzer. Upload a PDF, get a detailed breakdown.

## Quick Deploy to Vercel (15 minutes)

### Step 1: Get a Venice API Key (2 min)
1. Go to [venice.ai](https://venice.ai)
2. Sign up / log in
3. Go to Settings → API
4. Create an API key
5. Copy it

### Step 2: Deploy to Vercel (5 min)
1. Push this folder to a GitHub repo
2. Go to [vercel.com](https://vercel.com) and sign up with GitHub
3. Click "New Project"
4. Import your GitHub repo
5. Add environment variable:
   - `VENICE_API_KEY` = your key from step 1
6. Click Deploy

### Step 3: Done!
Your app is live at `https://your-project.vercel.app`

---

## Run Locally

```bash
# Install dependencies
npm install

# Create .env.local
echo "VENICE_API_KEY=your-key-here" > .env.local

# Run dev server
npm run dev

# Open http://localhost:3000
```

---

## How It Works

1. User uploads a PDF status certificate
2. Server extracts text from PDF
3. Venice API (Claude) analyzes the text
4. User sees a detailed report with:
   - Risk rating (GREEN/YELLOW/RED)
   - Extracted data (fees, reserve fund, insurance, etc.)
   - Flagged issues with recommendations
   - Side-by-side PDF viewer
   - Client letter generator

## Pages

- `/` - Landing page with upload
- `/demo` - Sample report (no upload required)
- `/report/[id]` - Analysis report with PDF viewer

---

## Tech Stack

- **Frontend**: Next.js 14, React, Tailwind CSS
- **AI**: Claude via Venice.ai API
- **PDF**: pdf-parse for text extraction

---

## No Database Needed

This simplified version stores everything in browser sessionStorage. Reports are not persisted - each analysis is fresh.

To add persistence later, add Supabase (see full version).

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VENICE_API_KEY` | Yes | Your Venice.ai API key |

---

## License

MIT
