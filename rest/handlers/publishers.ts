import { Router } from 'express';

import { db } from '../database.js';
import { HttpError, parseId, requireBody, requireString } from './validation.js';

interface PublisherRow {
    nPublishingCompanyID: number;
    cName: string;
}

function toPublisher(row: PublisherRow) {
    return {
        id: row.nPublishingCompanyID,
        name: row.cName,
    };
}

function findPublisher(id: number): PublisherRow {
    const row = db.prepare('SELECT * FROM tpublishingcompany WHERE nPublishingCompanyID = ?').get(id) as PublisherRow | undefined;
    if (!row) {
        throw new HttpError(404, `Publisher ${id} not found`);
    }
    return row;
}

// shared by POST and PUT
function parsePublisher(input: unknown) {
    const body = requireBody(input);
    return {
        name: requireString(body, 'name', 40),
    };
}

const router = Router();

// GET /publishers
router.get('/', (_req, res) => {
    const rows = db.prepare('SELECT * FROM tpublishingcompany ORDER BY nPublishingCompanyID').all() as unknown as PublisherRow[];
    res.json(rows.map(toPublisher));
});

// GET /publishers/:id
router.get('/:id', (req, res) => {
    res.json(toPublisher(findPublisher(parseId(req.params.id))));
});

// POST /publishers  { "name" }
router.post('/', (req, res) => {
    const publisher = parsePublisher(req.body);

    const result = db.prepare('INSERT INTO tpublishingcompany (cName) VALUES (?)').run(publisher.name);
    const id = Number(result.lastInsertRowid);

    res.status(201).location(`/publishers/${id}`).json({ id, ...publisher });
});

// PUT /publishers/:id  replaces every field
router.put('/:id', (req, res) => {
    const id = parseId(req.params.id);
    findPublisher(id);
    const publisher = parsePublisher(req.body);

    db.prepare('UPDATE tpublishingcompany SET cName = ? WHERE nPublishingCompanyID = ?').run(publisher.name, id);

    res.json({ id, ...publisher });
});

// DELETE /publishers/:id  refused while books reference the publisher
router.delete('/:id', (req, res) => {
    const id = parseId(req.params.id);
    findPublisher(id);

    const { books } = db.prepare('SELECT COUNT(*) AS books FROM tbook WHERE nPublishingCompanyID = ?').get(id) as { books: number };
    if (books > 0) {
        throw new HttpError(409, `Publisher ${id} cannot be deleted because ${books} book(s) reference it`);
    }

    db.prepare('DELETE FROM tpublishingcompany WHERE nPublishingCompanyID = ?').run(id);

    res.status(204).end();
});

export { router as publishersRouter }
