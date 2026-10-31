import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { ReflectionService } from '@grpc/reflection';

import { libraryHandlers } from './books.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROTO_PATH = path.join(__dirname, 'proto', 'library.proto');

// Load the .proto at runtime (no protoc / generated stubs).
// keepCase: false turns author_id into authorId in JS and JSON.
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: false,
    longs: Number,
    enums: String,
    defaults: true,
    oneofs: true,
});

const libraryProto = grpc.loadPackageDefinition(packageDefinition) as grpc.GrpcObject;
const libraryPackage = libraryProto.library as grpc.GrpcObject;
const libraryService = libraryPackage.Library as grpc.ServiceClientConstructor;

const server = new grpc.Server();
server.addService(libraryService.service, libraryHandlers);

// Lets Postman / grpcurl list RPCs without uploading the proto file.
new ReflectionService(packageDefinition).addToServer(server);

const PORT = Number(process.env.PORT) || 50051;
const ADDRESS = `0.0.0.0:${PORT}`;

// createInsecure = no TLS. Fine for localhost.
server.bindAsync(ADDRESS, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log(`Library gRPC API listening on localhost:${port}`);
    console.log('RPCs: GetBookById, CreateBook, WatchBooks (server stream)');
});
