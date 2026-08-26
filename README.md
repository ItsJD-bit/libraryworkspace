# Book Catalog AI

A Node.js backend for generating AI-assisted cataloging suggestions from book metadata. It returns proposed Dewey Decimal Classification (DDC), a Cutter number, and Library of Congress Subject Headings (LCSH) for librarian review.

## Project structure

```text
src/
  app.js                    Express middleware and route composition
  server.js                 Application startup
  config/environment.js     Environment defaults
  middleware/errorHandler.js
  routes/catalogRoutes.js
  routes/healthRoutes.js
  schemas/catalogSchema.js  Request and AI response contracts
  services/catalogService.js AI provider integrations
public/
  css/styles.css
  js/catalog.js
  js/patrons.js
  js/patron-registration.js
  js/discussion-room.js
  js/internet-room.js
  js/circulation.js
  js/page-transition.js
views/
  *.ejs                          Server-rendered page views
```

## Requirements

- Node.js 20 or newer
- Ollama installed locally, or an OpenAI API key

## Setup

```powershell
npm install
Copy-Item .env.example .env
```

Set `ADMIN_NAME`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and `SESSION_SECRET` in `.env` before the first start. The first administrator is created automatically, passwords are stored as bcrypt hashes, and `/account-manager` requires an authenticated administrator session.

For the free local setup, leave `AI_PROVIDER=ollama` in `.env`. Install Ollama from [ollama.com/download](https://ollama.com/download), then download the model:

```powershell
ollama pull llama3.1
```

Start Ollama if it is not already running, then start the service:

```powershell
npm run dev
```

The API runs at `http://localhost:3000` by default.

To use OpenAI instead, set `AI_PROVIDER=openai` and add `OPENAI_API_KEY` to `.env`.

Open `http://localhost:3000` in a browser to use the Book Catalog AI workspace. The interface submits book details to the API and presents the resulting DDC, Cutter, and LCSH suggestions in a review-focused layout.

## API

### `GET /health`

Returns service status.

### `POST /api/catalog`

Request body:

```json
{
  "title": "The example book",
  "author": "A. Example",
  "isbn": "9780000000000",
  "publisher": "Example Press",
  "publicationYear": 2025,
  "description": "A short description of the book's content."
}
```

The response contains a `catalog` object with:

- `ddc.number`, `ddc.label`, and confidence/rationale
- `cutter.number`, basis, and confidence/rationale
- An array of suggested `lcsh` headings with confidence/rationale
- `reviewNotes` for ambiguity or follow-up checks

These are recommendations, not authoritative catalog records. Validate them against current DDC schedules, Cutter tables, LCSH authority records, and local shelving policy before using them in production.

## Validation

```powershell
npm run check
```

Express renders the pages from `views/` using EJS. Start the application with `npm run dev` or `npm start`, then open the displayed network URL from another device on the same network.
