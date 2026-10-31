gRPC API
====================

RPCs
----
GetBookById(GetBookByIdRequest) -> Book
CreateBook(CreateBookRequest)   -> CreateBookResponse { id }
WatchBooks(WatchBooksRequest)   -> stream Book

The project assumes that a library.db file exists in the project root
(not in the grpc folder). Same file as the other three APIs.

Node 22.13 or later is required (node:sqlite).


1 Install
---------
    cd grpc
    npm install


2 Run the server
----------------
    npm start

    listens on localhost:50051 (override with PORT)
    server reflection is on, so Postman / grpcurl can list the methods


3 Demo without Postman (keeps library.db clean)
----------------------------------------------
    # leave npm start running, then in another terminal:
    cd grpc
    npm run demo

    Sequence:
    - GetBookById 1000
    - GetBookById 999999 -> NOT_FOUND
    - CreateBook year 1800 -> INVALID_ARGUMENT
    - WatchBooks + CreateBook "gRPC Demo Book"
    - deletes that row afterwards


4 Postman
---------
    Import:
        grpc/postman/library-grpc.postman_collection.json
        grpc/postman/library-grpc.postman_environment.json

    New > gRPC Request
    Server URL: localhost:50051
    Use server reflection, or import grpc/proto/library.proto
    Service: library.Library

    Demo order is the folder order in the collection.
    Invoke WatchBooks first and leave it running, then CreateBook
    in a second tab. The stream receives the new Book.

    After a CreateBook demo:
        DELETE FROM tbook WHERE cTitle = 'gRPC Demo Book';


5 grpcurl (optional)
--------------------
    grpcurl -plaintext localhost:50051 list
    grpcurl -plaintext -d '{"id": 1000}' localhost:50051 library.Library/GetBookById
    grpcurl -plaintext localhost:50051 library.Library/WatchBooks


JSON field names
----------------
authorId, publisherId, publishingYear
publisherId is tpublishingcompany.nPublishingCompanyID
(the assignment text says "publisher ID")
