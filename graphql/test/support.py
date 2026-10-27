# shutil copies the seed database into a temporary file.
# TestClient sends requests to the FastAPI app without opening a port.

import shutil
from pathlib import Path

from starlette.testclient import TestClient

# ROOT assumes the library file will be in the project root folder and not the graphql folder
ROOT = Path(__file__).resolve().parents[2]
SEED_DB = ROOT / "library.db"

LIST_AUTHORS_AND_PUBLISHERS = """
query {
  authors { id name surname }
  publishers { id name }
}
"""

LIST_BOOKS = """
query {
  books {
    id
    title
    authorId
    publishingCompanyId
    publishingYear
  }
}
"""

CREATE_AUTHOR_AND_PUBLISHER = """
mutation {
  createAuthor(id: 511, name: "Demo", surname: "Author") {
    id
    name
    surname
  }
  createPublisher(id: 159, name: "Demo Press") {
    id
    name
  }
}
"""

CREATE_BOOK = """
mutation {
  createBook(
    id: 2000
    title: "Demo Book"
    authorId: 511
    publishingCompanyId: 159
    publishingYear: 2024
  ) {
    id
    title
    authorId
    publishingCompanyId
    publishingYear
  }
}
"""

UPDATE_BOOK = """
mutation {
  updateBook(
    id: 2000
    title: "Demo Book Revised"
    authorId: 511
    publishingCompanyId: 159
    publishingYear: 2025
  ) {
    id
    title
    publishingYear
  }
}
"""


def graphql(client: TestClient, document: str) -> dict:
    response = client.post("/graphql", json={"query": document})
    assert response.status_code == 200, response.text
    return response.json()


def assert_ok(body: dict) -> dict:
    assert body.get("errors") in (None, []), body
    return body["data"]


def error_code(body: dict) -> str:
    errors = body.get("errors") or []
    assert errors, body
    return errors[0]["extensions"]["code"]


def snapshot(client: TestClient) -> dict[str, set[int]]:
    listed = assert_ok(graphql(client, LIST_AUTHORS_AND_PUBLISHERS))
    books = assert_ok(graphql(client, LIST_BOOKS))
    return {
        "authors": {row["id"] for row in listed["authors"]},
        "publishers": {row["id"] for row in listed["publishers"]},
        "books": {row["id"] for row in books["books"]},
    }


def copy_seed(destination: Path) -> None:
    shutil.copy(SEED_DB, destination)
