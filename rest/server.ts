import express from 'express';

import { db } from './database.js';

const app = express();
app.use(express.json());

// smoke test: proves the app can read library.db
app.get('/health', (_req, res) => {
    const { count } = db.prepare('SELECT COUNT(*) AS count FROM tauthor').get() as { count: number };
    res.json({ status: 'ok', authors: count });
});

// last: unknown routes and thrown errors
app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
});
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
});

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => console.log(`Library REST API listening on http://localhost:${PORT}`));
