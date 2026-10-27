GraphQL API
====================

Types: Book, Author, Publisher
Queries: book(id), authors, publishers
Mutations: create, update (all fields), and delete for each type

The project assumes that a library.db file exists in the project root
(not in the graphql folder)

Intallation guide with windows powershell

1 Install python .venv (if it doesnt exist)
-----------------
    This project assumes Python 3.11 or later is installed.

    # check if a .venv is available:
    # from the graphql directory:
    ...\SystemIntegration-Mandatory1\graphql
    # check if a python .venv is available:
    if (Test-Path .\.venv\Scripts\python.exe) { ".venv available" } else { ".venv not available" }

    # if not, create a .venv folder
    python -m venv .venv

    # Avtivate the .venv
    .\.venv\Scripts\Activate.ps1

    # install the dependencies
    python -m pip install -r dependency_requirements.txt

2 Run all tests (if a .venv exists)
---------------

    # go to the graphql directory:
    ...\SystemIntegration-Mandatory1\graphql

    # Start the .venv
    .\.venv\Scripts\Activate.ps1

    # install dependencies (id missing)
    pip install -r dependency_requirements.txt


    # start the graphQl server on 8001. --reload is optional
    uvicorn app.main:app --reload --port 8001


    # in another powershell, go to the graphql folder, and run the tests
    .venv\Scripts\python.exe -m pytest test -q

    # run the tests with coverage
    .venv\Scripts\python.exe -m pytest test -q --cov=app --cov-report=term-missing



        Coverage report 2026-10-27:
            Name           Stmts   Miss  Cover       Lines not covered
        -----------------------------------------------
        app\__init__.py       0      0   100%
        app\db.py            23      1    96%        12
        app\main.py           5      0   100%
        app\schema.py       150     18    88%        48, 83, 92, 116, 126, 175, 226, 240-247, 265, 279-285, 295
        -----------------------------------------------
        TOTAL               178     19    89%
        8 passed, 72 warnings in 1.22s
        PS D:\TESTCMLDDRIVE\KODE\PycharmProjects\TOPOP2026E\Subjects\Mandatories\Integration\chrman1-graphQL>


2 demo in browser
---------------

    # leave the server from section 0 running
    # open GraphiQL
    http://127.0.0.1:8001/graphql

    # paste one execution block on the left, press play, read the JSON on the right
    # run these in order, then always run the cleanup at the end
    # a finished run adds nothing that was not already in library.db
    # ids used below: book 5001, author 5002, publisher 5003

    # list what is already there (writes nothing)
    query { authors { id name surname } publishers { id name } }
    query { books { id title authorId publishingCompanyId publishingYear } }

    # read one existing book, author, and publisher (writes nothing)
    query { book(id: 1000) { id title authorId publishingCompanyId publishingYear } }
    query { author(id: 1) { id name surname } }
    query { publisher(id: 1) { id name } }

    # create the demo author and publisher
    mutation {
      createAuthor(id: 5002, name: "Demo", surname: "Author") { id name surname }
      createPublisher(id: 5003, name: "Demo Press") { id name }
    }

    # create the demo book pointing at those ids
    mutation {
      createBook(id: 5001, title: "Demo Book", authorId: 5002, publishingCompanyId: 5003, publishingYear: 2024) {
        id title authorId publishingCompanyId publishingYear
      }
    }

    # update that book (every field is sent again)
    mutation {
      updateBook(id: 5001, title: "Demo Book Revised", authorId: 5002, publishingCompanyId: 5003, publishingYear: 2025) {
        id title publishingYear
      }
    }

    # year before 1900: nothing is saved
    # errors[0].extensions.code is VALIDATION
    mutation {
      createBook(title: "Too Old", authorId: 5002, publishingCompanyId: 5003, publishingYear: 1800) { id }
    }

    # missing row: nothing is written
    # errors[0].extensions.code is NOT_FOUND
    query { book(id: 999999) { id title } }

    # delete fails while book 5001 still points at the author
    # errors[0].extensions.code is CONFLICT
    mutation { deleteAuthor(id: 5002) }

    # cleanup: book first, then author, then publisher. Each field returns true.
    # run this before another demo if a run stopped early
    mutation {
      deleteBook(id: 5001)
      deleteAuthor(id: 5002)
      deletePublisher(id: 5003)
    }

    # check that the book author and publisher doesnt exist
    query { book(id: 5001) { id title authorId publishingCompanyId publishingYear } }
    query { author(id: 5002) { id name surname } }
    query { publisher(id: 5003) { id name } }


3 Postman
---------------

    # leave the server from the run section listening on port 8001
    # in Postman: Import, then choose
    graphql/postman/library-graphql.postman_collection.json

    # open the collection and run it with the Collection Runner
    # it is the same sequence as section 2


