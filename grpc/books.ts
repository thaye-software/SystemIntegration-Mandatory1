import { EventEmitter } from 'node:events';
import * as grpc from '@grpc/grpc-js';

import { db } from './database.js';

// Handlers for the three RPCs in library.proto.

// What we send back to the client. proto field author_id becomes authorId in JS.
type Book = {
    id: number;
    title: string;
    authorId: number;
    publisherId: number;
    publishingYear: number;
};

// A row from tbook. Column names stay as they are in library.db.
type BookRow = {
    nBookID: number;
    cTitle: string;
    nAuthorID: number;
    nPublishingYear: number | null;
    nPublishingCompanyID: number;
};

type CreateBookInput = {
    title: string;
    authorId: number;
    publisherId: number;
    publishingYear: number;
};

class RpcError extends Error {
    constructor(readonly code: grpc.status, message: string) {
        super(message);
    }
}

// WatchBooks subscribers listen on this. CreateBook emits after a successful insert.
// Only clients of this process are notified.
const bookEvents = new EventEmitter();
bookEvents.setMaxListeners(0);

function fail(code: grpc.status, message: string): never {
    throw new RpcError(code, message);
}

// Turn our RpcError into what grpc-js sends to the client.
function toServiceError(err: unknown): grpc.ServiceError {
    if (err instanceof RpcError) {
        return Object.assign(new Error(err.message), {
            code: err.code,
            details: err.message,
        }) as grpc.ServiceError;
    }
    console.error(err);
    return Object.assign(new Error('Internal server error'), {
        code: grpc.status.INTERNAL,
        details: 'Internal server error',
    }) as grpc.ServiceError;
}

function toBook(row: BookRow): Book {
    return {
        id: row.nBookID,
        title: row.cTitle,
        authorId: row.nAuthorID,
        publisherId: row.nPublishingCompanyID,
        publishingYear: row.nPublishingYear === null ? 0 : Number(row.nPublishingYear),
    };
}

function requirePositiveInt(value: unknown, field: string): number {
    if (!Number.isInteger(value) || (value as number) < 1) {
        fail(grpc.status.INVALID_ARGUMENT, `${field} must be a positive integer`);
    }
    return value as number;
}

// proto3 missing int32 is 0 and missing string is "",
// so 0 / "" are treated as "the client did not send this field".
function parseCreateBook(input: CreateBookInput): CreateBookInput {
    const title = typeof input.title === 'string' ? input.title.trim() : '';
    if (title.length === 0) {
        fail(grpc.status.INVALID_ARGUMENT, 'title is required');
    }
    if (title.length > 255) {
        fail(grpc.status.INVALID_ARGUMENT, 'title must be at most 255 characters');
    }

    const authorId = requirePositiveInt(input.authorId, 'authorId');
    const publisherId = requirePositiveInt(input.publisherId, 'publisherId');
    const publishingYear = input.publishingYear;

    if (!Number.isInteger(publishingYear) || publishingYear < 1900) {
        fail(grpc.status.INVALID_ARGUMENT, 'publishingYear must be an integer of at least 1900');
    }

    // library.db has no foreign keys, so references are checked here
    if (!db.prepare('SELECT 1 FROM tauthor WHERE nAuthorID = ?').get(authorId)) {
        fail(grpc.status.INVALID_ARGUMENT, `authorId ${authorId} does not reference an existing author`);
    }
    if (!db.prepare('SELECT 1 FROM tpublishingcompany WHERE nPublishingCompanyID = ?').get(publisherId)) {
        fail(grpc.status.INVALID_ARGUMENT, `publisherId ${publisherId} does not reference an existing publisher`);
    }

    return { title, authorId, publisherId, publishingYear };
}

function findBook(id: number): Book {
    const row = db.prepare('SELECT * FROM tbook WHERE nBookID = ?').get(id) as BookRow | undefined;
    if (!row) {
        fail(grpc.status.NOT_FOUND, `Book ${id} not found`);
    }
    return toBook(row);
}

// Unary: one request, one Book. call.request is { id }. callback(null, book) is success.
function getBookById(call: grpc.ServerUnaryCall<{ id: number }, Book>, callback: grpc.sendUnaryData<Book>) {
    try {
        const id = requirePositiveInt(call.request.id, 'id');
        callback(null, findBook(id));
    } catch (err) {
        callback(toServiceError(err));
    }
}

// Unary: insert the row, notify WatchBooks, return { id }.
function createBook(
    call: grpc.ServerUnaryCall<CreateBookInput, { id: number }>,
    callback: grpc.sendUnaryData<{ id: number }>,
) {
    try {
        const book = parseCreateBook(call.request);
        const result = db.prepare(
            'INSERT INTO tbook (cTitle, nAuthorID, nPublishingCompanyID, nPublishingYear) VALUES (?, ?, ?, ?)',
        ).run(book.title, book.authorId, book.publisherId, book.publishingYear);
        const created = findBook(Number(result.lastInsertRowid));

        bookEvents.emit('book.created', created);
        callback(null, { id: created.id });
    } catch (err) {
        callback(toServiceError(err));
    }
}

// Server stream: the call stays open. Each CreateBook is written to every subscriber.
function watchBooks(call: grpc.ServerWritableStream<object, Book>) {
    const onCreated = (book: Book) => {
        call.write(book);
    };

    bookEvents.on('book.created', onCreated);

    const cleanup = () => {
        bookEvents.off('book.created', onCreated);
    };
    call.on('cancelled', cleanup);
    call.on('error', cleanup);
    call.on('close', cleanup);
}

// server.ts registers this object. Keys must be camelCase RPC names from the proto.
const libraryHandlers = {
    getBookById,
    createBook,
    watchBooks,
};

export { libraryHandlers, type Book }
