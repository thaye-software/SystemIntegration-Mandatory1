import express from 'express';

import { db } from './database.js';
import { authorsRouter } from './handlers/authors.js';
import { booksRouter } from './handlers/books.js';
import { publishersRouter } from './handlers/publishers.js';
import { HttpError } from './handlers/validation.js';

const app = express();
app.use(express.json());

// smoke test: proves the app can read library.db
app.get('/health', (_req, res) => {
    const { count } = db.prepare('SELECT COUNT(*) AS count FROM tauthor').get() as { count: number };
    res.json({ status: 'ok', authors: count });
});

app.use('/books', booksRouter);
app.use('/authors', authorsRouter);
app.use('/publishers', publishersRouter);

// last: unknown routes and thrown errors
app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
});
app.use((err: Error & { type?: string }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof HttpError) {
        res.status(err.status).json({ error: err.message });
        return;
    }
    // thrown by express.json() on a malformed body
    if (err.type === 'entity.parse.failed') {
        res.status(400).json({ error: 'Request body is not valid JSON' });
        return;
    }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
});

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => console.log(`Library REST API listening on http://localhost:${PORT}`));
