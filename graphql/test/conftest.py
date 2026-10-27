# sys and Path add this folder to the import path so "import support" works.
# pytest supplies the fixtures that prepare each test.
# TestClient calls the FastAPI app in-process.
# support holds the shared GraphQL documents. app is the web application.

import sys
from pathlib import Path

import pytest
from starlette.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parent))

import support
from app.main import app


# Return a TestClient backed by a fresh copy of the database.
@pytest.fixture
def client(tmp_path, monkeypatch):
    db_copy = tmp_path / "library.db"
    support.copy_seed(db_copy)
    monkeypatch.setattr("app.db.DB_PATH", db_copy)
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def original_ids(client):
    return support.snapshot(client)


@pytest.fixture
def demo_author_and_publisher(client, original_ids):
    created = support.assert_ok(support.graphql(client, support.CREATE_AUTHOR_AND_PUBLISHER))
    assert created["createAuthor"] == {"id": 511, "name": "Demo", "surname": "Author"}
    assert created["createPublisher"] == {"id": 159, "name": "Demo Press"}
    return original_ids


@pytest.fixture
def demo_book(client, demo_author_and_publisher):
    created = support.assert_ok(support.graphql(client, support.CREATE_BOOK))
    assert created["createBook"]["id"] == 2000
    assert created["createBook"]["title"] == "Demo Book"
    return demo_author_and_publisher
