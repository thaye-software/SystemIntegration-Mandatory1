import { db } from '../database.js';
import type { Author, AuthorFields, AuthorRow } from './authorTypes.js';

function toAuthor(row: AuthorRow): Author {
    return {
        id: row.nAuthorID,
        name: row.cName,
        surname: row.cSurname,
    };
}

const authorRepository = {
    findById(id: number): Author | undefined {
        const row = db.prepare('SELECT * FROM tauthor WHERE nAuthorID = ?').get(id) as AuthorRow | undefined;
        return row && toAuthor(row);
    },

    findAll(): Author[] {
        const rows = db.prepare('SELECT * FROM tauthor ORDER BY nAuthorID').all() as AuthorRow[];
        return rows.map(toAuthor);
    },

    exists(id: number): boolean {
        return db.prepare('SELECT 1 FROM tauthor WHERE nAuthorID = ?').get(id) !== undefined;
    },

    insert(author: AuthorFields): number {
        const result = db.prepare(
            'INSERT INTO tauthor (cName, cSurname) VALUES (?, ?)'
        ).run(author.name, author.surname);

        return Number(result.lastInsertRowid);
    },

    update(id: number, author: AuthorFields): void {
        db.prepare(
            'UPDATE tauthor SET cName = ?, cSurname = ? WHERE nAuthorID = ?'
        ).run(author.name, author.surname, id);
    },

    deleteById(id: number): void {
        db.prepare('DELETE FROM tauthor WHERE nAuthorID = ?').run(id);
    },
};

export { authorRepository }
