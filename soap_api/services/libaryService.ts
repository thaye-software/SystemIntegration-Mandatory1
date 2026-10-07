import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { type IServices } from 'soap';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new DatabaseSync(path.join(__dirname, '..', '..', 'library.db'));



type FaultName = 'NotFoundFault' | 'ValidationFault' | 'ConflictFault';
function fault(name: FaultName, message: string) {
    return {
        Fault: {
            statusCode: 400,
            Code: { Value: 'soap:Sender' },
            Reason: { Text: message },
            Detail: { [`tns:${name}`]: { 'tns:message': message } },
        },
    };
}



// Validation
function requireId(value: unknown, field = 'id'): number {
    if (!Number.isInteger(value)) {
        throw fault('ValidationFault', `${field} must be an integer`);
    }
    return value as number;
}

function exists(table: string, idColumn: string, id: number): boolean {
    return db.prepare(`SELECT 1 FROM ${table} WHERE ${idColumn} = ?`).get(id) !== undefined;
}



// Book
type BookRow = {
    nBookID: number;
    cTitle: string;
    nAuthorID: number;
    nPublishingYear: number | null;
    nPublishingCompanyID: number;
};

type BookFields = {
    title: string;
    authorId: number;
    publishingYear: number | null;
    publishingCompanyId: number;
};

function validateBookFields(args: any): BookFields {
    const title = typeof args?.title === 'string' ? args.title.trim() : '';
    if (title.length === 0) {
        throw fault('ValidationFault', 'title is required');
    }
    if (title.length > 255) {
        throw fault('ValidationFault', 'title must be at most 255 characters');
    }

    const authorId = requireId(args.authorId, 'authorId');
    if (!exists('tauthor', 'nAuthorID', authorId)) {
        throw fault('ValidationFault', `Author ${authorId} does not exist`);
    }

    const publishingCompanyId = requireId(args.publishingCompanyId, 'publishingCompanyId');
    if (!exists('tpublishingcompany', 'nPublishingCompanyID', publishingCompanyId)) {
        throw fault('ValidationFault', `Publishing company ${publishingCompanyId} does not exist`);
    }

    let publishingYear: number | null = null;
    if (args.publishingYear !== undefined && args.publishingYear !== null) {
        if (!Number.isInteger(args.publishingYear) || args.publishingYear < 1900) {
            throw fault('ValidationFault', 'publishingYear must be an integer of at least 1900');
        }
        publishingYear = args.publishingYear;
    }

    return { title, authorId, publishingYear, publishingCompanyId };
}

function requireBook(id: number): BookRow {
    const row = db.prepare('SELECT * FROM tbook WHERE nBookID = ?').get(id) as BookRow | undefined;
    if (!row) {
        throw fault('NotFoundFault', `Book ${id} does not exist`);
    }
    return row;
}




const libaryService: IServices = {
    LibraryService: {
        LibraryPort: {
            CreateBook(args: any) {
                const book = validateBookFields(args);
                const result = db.prepare(
                    'INSERT INTO tbook (cTitle, nAuthorID, nPublishingYear, nPublishingCompanyID) VALUES (?, ?, ?, ?)'
                ).run(book.title, book.authorId, book.publishingYear, book.publishingCompanyId);

                return { id: Number(result.lastInsertRowid) };
            },

            GetBookById(args: any) {
                const row = requireBook(requireId(args?.id));

                // Same order as the Book type in the WSDL: BookFields, then id
                return {
                    title: row.cTitle,
                    authorId: row.nAuthorID,
                    ...(row.nPublishingYear !== null && { publishingYear: row.nPublishingYear }),
                    publishingCompanyId: row.nPublishingCompanyID,
                    id: row.nBookID,
                };
            },

            UpdateBook(args: any) {
                const id = requireId(args?.id);
                requireBook(id);
                const book = validateBookFields(args);

                db.prepare(
                    'UPDATE tbook SET cTitle = ?, nAuthorID = ?, nPublishingYear = ?, nPublishingCompanyID = ? WHERE nBookID = ?'
                ).run(book.title, book.authorId, book.publishingYear, book.publishingCompanyId, id);

                return { success: true, message: `Book ${id} updated` };
            },

            DeleteBook(args: any) {
                const id = requireId(args?.id);
                requireBook(id);

                db.prepare('DELETE FROM tbook WHERE nBookID = ?').run(id);

                return { success: true, message: `Book ${id} deleted` };
            },
        },
    },
};

export { libaryService }
