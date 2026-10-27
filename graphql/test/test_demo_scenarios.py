"""README section 2, one test per demonstration step.

Each test uses its own database copy. Setup fixtures insert the demo rows
that a later step reads, so any test can run on its own.
"""

# sys and Path add this folder to the import path so "import support" works.
# support holds the shared GraphQL documents and the checks around them.

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import support


# Every test starts from its own copy of the seed database.
# A later test does not see rows an earlier test inserted. The fixture
# named in the test arguments inserts those rows again, so each test
# can still run on its own.

#   2.1 list what is already in the seed
#   2.2 read one book, one author, and one publisher by id
#   2.3 create author 511 and publisher 159
#   2.4 create book 2000 pointing at those two
#   2.5 update that book
#   2.6 a year before 1900 is refused and writes nothing
#   2.7 a missing id is refused and writes nothing
#   2.8 an author still used by a book cannot be deleted;
#       delete the book first, then the author and the publisher


# 2.1 List. Nothing is written. The seed must already contain rows.
def test_list_existing_rows(client):
    authors = support.assert_ok(support.graphql(client, support.LIST_AUTHORS_AND_PUBLISHERS))
    books = support.assert_ok(support.graphql(client, support.LIST_BOOKS))
    assert authors["authors"]
    assert authors["publishers"]
    assert books["books"]


# 2.2 Read. Look up ids that are already in the seed. Nothing is written.
def test_read_one_of_each(client):
    book = support.assert_ok(support.graphql(client, """
        query {
          book(id: 1000) {
            id
            title
            authorId
            publishingCompanyId
            publishingYear
          }
        }
    """))["book"]
    author = support.assert_ok(support.graphql(client, """
        query {
          author(id: 1) {
            id
            name
            surname
          }
        }
    """))["author"]
    publisher = support.assert_ok(support.graphql(client, """
        query {
          publisher(id: 1) {
            id
            name
          }
        }
    """))["publisher"]
    assert book["id"] == 1000, "README step 2.2 expects book 1000 in library.db"
    assert author["id"] == 1, "README step 2.2 expects author 1 in library.db"
    assert publisher["id"] == 1, "README step 2.2 expects publisher 1 in library.db"
    assert "title" in book and "publishingYear" in book
    assert "surname" in author
    assert "name" in publisher


# 2.3 Create. Add author 511 and publisher 159. No other id may appear.
def test_create_author_and_publisher(client, original_ids):
    created = support.assert_ok(support.graphql(client, support.CREATE_AUTHOR_AND_PUBLISHER))
    assert created["createAuthor"] == {"id": 511, "name": "Demo", "surname": "Author"}
    assert created["createPublisher"] == {"id": 159, "name": "Demo Press"}
    after = support.snapshot(client)
    assert after["authors"] - original_ids["authors"] == {511}
    assert after["publishers"] - original_ids["publishers"] == {159}
    assert after["books"] == original_ids["books"]


# 2.4 Create the book. The fixture has already done step 2.3.
# The only new book id is 2000, and it points at author 511 and publisher 159.
def test_create_book(client, demo_author_and_publisher):
    created = support.assert_ok(support.graphql(client, support.CREATE_BOOK))["createBook"]
    assert created == {
        "id": 2000,
        "title": "Demo Book",
        "authorId": 511,
        "publishingCompanyId": 159,
        "publishingYear": 2024,
    }
    after = support.snapshot(client)
    assert after["books"] - demo_author_and_publisher["books"] == {2000}


# 2.5 Update. The fixture has done steps 2.3 and 2.4, so book 2000
# is still "Demo Book", 2024. Change the title and the year, then read it back.
def test_update_book(client, demo_book):
    updated = support.assert_ok(support.graphql(client, support.UPDATE_BOOK))["updateBook"]
    assert updated == {"id": 2000, "title": "Demo Book Revised", "publishingYear": 2025}
    read_back = support.assert_ok(support.graphql(client, """
        query {
          book(id: 2000) {
            id
            title
            publishingYear
          }
        }
    """))["book"]
    assert read_back["title"] == "Demo Book Revised"
    assert read_back["publishingYear"] == 2025


# 2.6 Reject. Same fixture as 2.5, but this test does not update the book.
# Year 1800 is refused. Book 2000 stays "Demo Book", 2024, and no row is added.
def test_validation_error_writes_nothing(client, demo_book):
    before = support.snapshot(client)
    body = support.graphql(client, """
        mutation {
          createBook(
            title: "Too Old"
            authorId: 511
            publishingCompanyId: 159
            publishingYear: 1800
          ) { id }
        }
    """)
    assert support.error_code(body) == "VALIDATION"
    assert body["data"] is None
    assert support.snapshot(client) == before
    stored = support.assert_ok(support.graphql(client, """
        query {
          book(id: 2000) {
            id
            title
            publishingYear
          }
        }
    """))["book"]
    assert stored["title"] == "Demo Book"
    assert stored["publishingYear"] == 2024


# 2.7 Missing row. Book 999999 is not in the seed. The read changes nothing.
def test_missing_book(client, original_ids):
    body = support.graphql(client, """
        query {
          book(id: 999999) { id title }
        }
    """)
    assert support.error_code(body) == "NOT_FOUND"
    assert body["data"] is None
    assert support.snapshot(client) == original_ids


# 2.8 Delete. The fixture has done steps 2.3 and 2.4.
# Author 511 cannot be deleted while book 2000 still points at them.
# Delete the book first, then the author and the publisher.
# The copy then matches the seed from before the fixture inserted anything.
def test_delete_conflict_then_cleanup(client, demo_book):
    blocked = support.graphql(client, """
        mutation {
          deleteAuthor(id: 511)
        }
    """)
    assert support.error_code(blocked) == "CONFLICT"
    assert blocked["data"] is None
    author = support.assert_ok(support.graphql(client, """
        query {
          author(id: 511) { id name surname }
        }
    """))["author"]
    assert author["id"] == 511

    deleted = support.assert_ok(support.graphql(client, """
        mutation {
          deleteBook(id: 2000)
          deleteAuthor(id: 511)
          deletePublisher(id: 159)
        }
    """))
    assert deleted["deleteBook"] is True
    assert deleted["deleteAuthor"] is True
    assert deleted["deletePublisher"] is True
    assert support.snapshot(client) == demo_book
