import { Router } from 'express';

import { db } from '../database.js';
import { HttpError, parseId, parseQueryInt, requireBody, requireInteger, requireString } from './validation.js';

interface BookRow {
    nBookID: number;
    cTitle: string;
    nAuthorID: number;
    nPublishingYear: number | null;
    nPublishingCompanyID: number;
}

function toBook(row: BookRow) {
    return {
        id: row.nBookID,
        title: row.cTitle,
        authorId: row.nAuthorID,
        publisherId: row.nPublishingCompanyID,
        publishingYear: row.nPublishingYear,
    };
}

function findBook(id: number): BookRow {
    const row = db.prepare('SELECT * FROM tbook WHERE nBookID = ?').get(id) as BookRow | undefined;
    if (!row) {
        throw new HttpError(404, `Book ${id} not found`);
    }
    return row;
}

// shared by POST and PUT; library.db has no foreign keys, so references are checked here
function parseBook(input: unknown) {
    const body = requireBody(input);
    const book = {
        title: requireString(body, 'title', 255),
        authorId: requireInteger(body, 'authorId'),
        publisherId: requireInteger(body, 'publisherId'),
        publishingYear: requireInteger(body, 'publishingYear', 1900, new Date().getFullYear()),
    };

    if (!db.prepare('SELECT 1 FROM tauthor WHERE nAuthorID = ?').get(book.authorId)) {
        throw new HttpError(400, `authorId ${book.authorId} does not reference an existing author`);
    }
    if (!db.prepare('SELECT 1 FROM tpublishingcompany WHERE nPublishingCompanyID = ?').get(book.publisherId)) {
        throw new HttpError(400, `publisherId ${book.publisherId} does not reference an existing publisher`);
    }
    return book;
}

const router = Router();

// GET /books?limit=10&offset=0
router.get('/', (req, res) => {
    const limit = parseQueryInt(req.query.limit, 'limit', 10, 1, 100);
    const offset = parseQueryInt(req.query.offset, 'offset', 0, 0, Number.MAX_SAFE_INTEGER);

    const rows = db.prepare('SELECT * FROM tbook ORDER BY nBookID LIMIT ? OFFSET ?').all(limit, offset) as unknown as BookRow[];
    const { total } = db.prepare('SELECT COUNT(*) AS total FROM tbook').get() as { total: number };

    res.json({ data: rows.map(toBook), pagination: { limit, offset, total } });
});

// GET /books/:id
router.get('/:id', (req, res) => {
    res.json(toBook(findBook(parseId(req.params.id))));
});

// POST /books  { "title", "authorId", "publisherId", "publishingYear" }
router.post('/', (req, res) => {
    const book = parseBook(req.body);

    const result = db.prepare(
        'INSERT INTO tbook (cTitle, nAuthorID, nPublishingCompanyID, nPublishingYear) VALUES (?, ?, ?, ?)'
    ).run(book.title, book.authorId, book.publisherId, book.publishingYear);
    const id = Number(result.lastInsertRowid);

    res.status(201).location(`/books/${id}`).json({ id, ...book });
});

// PUT /books/:id  replaces every field
router.put('/:id', (req, res) => {
    const id = parseId(req.params.id);
    findBook(id);
    const book = parseBook(req.body);

    db.prepare(
        'UPDATE tbook SET cTitle = ?, nAuthorID = ?, nPublishingCompanyID = ?, nPublishingYear = ? WHERE nBookID = ?'
    ).run(book.title, book.authorId, book.publisherId, book.publishingYear, id);

    res.json({ id, ...book });
});

// DELETE /books/:id
router.delete('/:id', (req, res) => {
    const id = parseId(req.params.id);
    findBook(id);

    db.prepare('DELETE FROM tbook WHERE nBookID = ?').run(id);

    res.status(204).end();
});

export { router as booksRouter }
