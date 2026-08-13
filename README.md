# Event Builder

A 5-section event planning tool — Transport, Translations, Venue, Meal, Logistics —
laid out as a mosaic of tiles. Click a tile to fill in that section's details.
Now running as a small Node.js/Express app instead of a static HTML file.

## Run it

```bash
npm install
npm start
```

Then open http://localhost:3000

## How it's structured

- `server.js` — Express server. Serves the frontend from `public/` and exposes
  a small JSON API for saving, loading, resetting, and exporting the draft.
- `public/` — frontend (`index.html`, `styles.css`, `app.js`) plus
  `sections.json`, the shared field definitions used by both the browser and
  the server-side export.
- `data/event.json` — the current draft, persisted to disk. Created
  automatically on first run; not committed to git.

## API

| Method | Path                | Description                          |
|--------|----------------------|---------------------------------------|
| GET    | `/api/event`         | Returns the current draft             |
| POST   | `/api/event`         | Overwrites the draft with the request body |
| POST   | `/api/event/reset`   | Clears the draft back to defaults     |
| GET    | `/api/event/export`  | Downloads a plain-text run sheet      |

This version stores one draft per server (a single `data/event.json` file),
which fits a single event being planned at a time. If you need multiple
events or multiple users, the natural next step is swapping the flat file
for a real database keyed by event ID — happy to help with that when you're
ready.
