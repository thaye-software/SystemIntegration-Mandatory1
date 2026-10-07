import { db } from '../database.js';
import type { Book, BookFields, BookRow } from './bookTypes.js';

function toBook(row: BookRow): Book {
    return {
        id: row.nBookID,
        title: row.cTitle,
        authorId: row.nAuthorID,
        publishingYear: row.nPublishingYear,
        publishingCompanyId: row.nPublishingCompanyID,
    };
}

const bookRepository = {
    findById(id: number): Book | undefined {
        const row = db.prepare('SELECT * FROM tbook WHERE nBookID = ?').get(id) as BookRow | undefined;
        return row && toBook(row);
    },

    insert(book: BookFields): number {
        const result = db.prepare(
            'INSERT INTO tbook (cTitle, nAuthorID, nPublishingYear, nPublishingCompanyID) VALUES (?, ?, ?, ?)'
        ).run(book.title, book.authorId, book.publishingYear, book.publishingCompanyId);

        return Number(result.lastInsertRowid);
    },

    update(id: number, book: BookFields): void {
        db.prepare(
            'UPDATE tbook SET cTitle = ?, nAuthorID = ?, nPublishingYear = ?, nPublishingCompanyID = ? WHERE nBookID = ?'
        ).run(book.title, book.authorId, book.publishingYear, book.publishingCompanyId, id);
    },

    deleteById(id: number): void {
        db.prepare('DELETE FROM tbook WHERE nBookID = ?').run(id);
    },

    countByAuthorId(authorId: number): number {
        const { count } = db.prepare('SELECT COUNT(*) AS count FROM tbook WHERE nAuthorID = ?').get(authorId) as { count: number };
        return count;
    },

    countByPublishingCompanyId(publishingCompanyId: number): number {
        const { count } = db.prepare('SELECT COUNT(*) AS count FROM tbook WHERE nPublishingCompanyID = ?').get(publishingCompanyId) as { count: number };
        return count;
    },
};

export { bookRepository }
