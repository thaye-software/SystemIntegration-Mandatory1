import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

// Client for npm run demo. Calls the three RPCs against a running server.
// Start the server first (npm start in another terminal).

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROTO_PATH = path.join(__dirname, '..', 'proto', 'library.proto');
const DB_PATH = path.join(__dirname, '..', '..', 'library.db');
const ADDRESS = process.env.GRPC_TARGET ?? 'localhost:50051';

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: false,
    longs: Number,
    enums: String,
    defaults: true,
    oneofs: true,
});

const libraryProto = grpc.loadPackageDefinition(packageDefinition) as grpc.GrpcObject;
const libraryPackage = libraryProto.library as grpc.GrpcObject;
const LibraryClient = libraryPackage.Library as grpc.ServiceClientConstructor;
const client = new LibraryClient(ADDRESS, grpc.credentials.createInsecure());

type Book = {
    id: number;
    title: string;
    authorId: number;
    publisherId: number;
    publishingYear: number;
};

// Wrap a unary RPC (one request, one response) in a Promise so we can await it.
function unary<Req, Res>(method: string, request: Req): Promise<Res> {
    return new Promise((resolve, reject) => {
        (client as unknown as Record<string, (req: Req, cb: (err: grpc.ServiceError | null, res: Res) => void) => void>)
            [method](request, (err, res) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(res);
            });
    });
}

function statusName(code: number | undefined): string {
    return grpc.status[code ?? grpc.status.UNKNOWN] ?? String(code);
}

async function expectError(label: string, run: () => Promise<unknown>, code: grpc.status) {
    try {
        await run();
        throw new Error(`${label}: expected ${statusName(code)}`);
    } catch (err) {
        const rpc = err as grpc.ServiceError;
        if (rpc.code !== code) {
            throw err;
        }
        console.log(`${label}: ${statusName(rpc.code)} — ${rpc.details}`);
    }
}

async function main() {
    console.log(`Talking to ${ADDRESS}\n`);

    // Book 1000 is already in library.db
    const existing = await unary< { id: number }, Book >('getBookById', { id: 1000 });
    console.log('GetBookById 1000:', existing);

    await expectError(
        'GetBookById 999999',
        () => unary('getBookById', { id: 999999 }),
        grpc.status.NOT_FOUND,
    );

    await expectError(
        'CreateBook year 1800',
        () => unary('createBook', {
            title: 'Too Old',
            authorId: 394,
            publisherId: 74,
            publishingYear: 1800,
        }),
        grpc.status.INVALID_ARGUMENT,
    );

    // Open WatchBooks first (leave the stream running), then CreateBook.
    const received = new Promise<Book>((resolve, reject) => {
        const stream = (client as unknown as {
            watchBooks: (req: object) => grpc.ClientReadableStream<Book>;
        }).watchBooks({});
        stream.on('data', (book) => {
            stream.cancel();
            resolve(book);
        });
        stream.on('error', (err) => {
            // cancel() above shows up as CANCELLED — that is expected
            if ((err as grpc.ServiceError).code === grpc.status.CANCELLED) {
                return;
            }
            reject(err);
        });
    });

    await new Promise((resolve) => setTimeout(resolve, 150));

    const created = await unary< {
        title: string;
        authorId: number;
        publisherId: number;
        publishingYear: number;
    }, { id: number } >('createBook', {
        title: 'gRPC Demo Book',
        authorId: 394,
        publisherId: 74,
        publishingYear: 2026,
    });
    console.log('CreateBook:', created);

    const streamed = await received;
    console.log('WatchBooks received:', streamed);

    // No DeleteBook RPC; remove the demo row so the shared DB stays clean
    const db = new DatabaseSync(DB_PATH);
    db.prepare('DELETE FROM tbook WHERE nBookID = ?').run(created.id);
    db.close();
    console.log(`Cleanup: deleted book ${created.id} so library.db is unchanged`);
}

main()
    .catch((err) => {
        console.error(err);
        process.exitCode = 1;
    })
    .finally(() => {
        client.close();
    });
