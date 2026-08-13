const express = require('express');
const fs = require('fs/promises');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'event.json');

const DEFAULT_STATE = {
  meta: { eventName: '', eventDate: '', eventCity: '' },
  data: {
    transport: {},
    translations: {},
    venue: {},
    meal: {},
    logistics: {}
  }
};

async function ensureDataFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify(DEFAULT_STATE, null, 2));
  }
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Get the current draft
app.get('/api/event', async (req, res) => {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf-8');
    res.json(JSON.parse(raw));
  } catch (err) {
    console.error('Failed to read event data:', err);
    res.status(500).json({ error: 'Could not load event data' });
  }
});

// Save (overwrite) the current draft
app.post('/api/event', async (req, res) => {
  try {
    const incoming = req.body;
    if (!incoming || typeof incoming !== 'object') {
      return res.status(400).json({ error: 'Invalid payload' });
    }
    await fs.writeFile(DATA_FILE, JSON.stringify(incoming, null, 2));
    res.json({ ok: true });
  } catch (err) {
    console.error('Failed to save event data:', err);
    res.status(500).json({ error: 'Could not save event data' });
  }
});

// Reset the draft back to defaults
app.post('/api/event/reset', async (req, res) => {
  try {
    await fs.writeFile(DATA_FILE, JSON.stringify(DEFAULT_STATE, null, 2));
    res.json(DEFAULT_STATE);
  } catch (err) {
    console.error('Failed to reset event data:', err);
    res.status(500).json({ error: 'Could not reset event data' });
  }
});

// Plain-text run sheet export, generated server-side
app.get('/api/event/export', async (req, res) => {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf-8');
    const state = JSON.parse(raw);
    const SECTIONS = require('./public/sections.json');

    const pct = (sec) => {
      const total = SECTIONS.find(s => s.key === sec).fields.length;
      const filled = SECTIONS.find(s => s.key === sec).fields
        .filter(f => (state.data[sec]?.[f.id] || '').trim() !== '').length;
      return total ? Math.round((filled / total) * 100) : 0;
    };
    const overall = Math.round(
      SECTIONS.reduce((sum, s) => sum + pct(s.key), 0) / SECTIONS.length
    );

    let out = `EVENT BUILDER — RUN SHEET\n`;
    out += `${state.meta.eventName || 'Untitled event'}\n`;
    out += `Date: ${state.meta.eventDate || '—'}   Location: ${state.meta.eventCity || '—'}\n`;
    out += `Overall completion: ${overall}%\n`;
    out += `${'='.repeat(50)}\n\n`;
    SECTIONS.forEach(sec => {
      out += `${sec.name.toUpperCase()}  (${pct(sec.key)}%)\n`;
      out += `${'-'.repeat(50)}\n`;
      sec.fields.forEach(f => {
        out += `${f.label}: ${state.data[sec.key]?.[f.id] || '—'}\n`;
      });
      out += `\n`;
    });

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${(state.meta.eventName || 'event-builder').replace(/[^a-z0-9-]+/gi,'-')}-run-sheet.txt"`);
    res.send(out);
  } catch (err) {
    console.error('Failed to export event data:', err);
    res.status(500).json({ error: 'Could not export event data' });
  }
});

ensureDataFile().then(() => {
  app.listen(PORT, () => {
    console.log(`Event Builder running at http://localhost:${PORT}`);
  });
});
