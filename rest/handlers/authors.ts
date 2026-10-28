import { Router } from 'express';

import { db } from '../database.js';
import { HttpError, optionalString, parseId, requireBody, requireString } from './validation.js';

interface AuthorRow {
    nAuthorID: number;
    cName: string;
    cSurname: string | null;
}

function toAuthor(row: AuthorRow) {
    return {
        id: row.nAuthorID,
        name: row.cName,
        surname: row.cSurname ?? '',
    };
}

function findAuthor(id: number): AuthorRow {
    const row = db.prepare('SELECT * FROM tauthor WHERE nAuthorID = ?').get(id) as AuthorRow | undefined;
    if (!row) {
        throw new HttpError(404, `Author ${id} not found`);
    }
    return row;
}

// shared by POST and PUT
function parseAuthor(input: unknown) {
    const body = requireBody(input);
    return {
        name: requireString(body, 'name', 40),
        surname: optionalString(body, 'surname', 60),
    };
}

const router = Router();

// GET /authors
router.get('/', (_req, res) => {
    const rows = db.prepare('SELECT * FROM tauthor ORDER BY nAuthorID').all() as unknown as AuthorRow[];
    res.json(rows.map(toAuthor));
});

// GET /authors/:id
router.get('/:id', (req, res) => {
    res.json(toAuthor(findAuthor(parseId(req.params.id))));
});

// POST /authors  { "name", "surname"? }
router.post('/', (req, res) => {
    const author = parseAuthor(req.body);

    const result = db.prepare('INSERT INTO tauthor (cName, cSurname) VALUES (?, ?)').run(author.name, author.surname);
    const id = Number(result.lastInsertRowid);

    res.status(201).location(`/authors/${id}`).json({ id, ...author });
});

// PUT /authors/:id  replaces every field
router.put('/:id', (req, res) => {
    const id = parseId(req.params.id);
    findAuthor(id);
    const author = parseAuthor(req.body);

    db.prepare('UPDATE tauthor SET cName = ?, cSurname = ? WHERE nAuthorID = ?').run(author.name, author.surname, id);

    res.json({ id, ...author });
});

// DELETE /authors/:id  refused while books reference the author
router.delete('/:id', (req, res) => {
    const id = parseId(req.params.id);
    findAuthor(id);

    const { books } = db.prepare('SELECT COUNT(*) AS books FROM tbook WHERE nAuthorID = ?').get(id) as { books: number };
    if (books > 0) {
        throw new HttpError(409, `Author ${id} cannot be deleted because ${books} book(s) reference it`);
    }

    db.prepare('DELETE FROM tauthor WHERE nAuthorID = ?').run(id);

    res.status(204).end();
});

export { router as authorsRouter }
