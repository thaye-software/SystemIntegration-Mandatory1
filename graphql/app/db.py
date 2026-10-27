# sqlite3 is Python's built-in driver for SQLite databases.
# Path builds the filesystem path to the database file.
# library.db lives in the repository root, one folder above graphql/.
# app/db.py -> app/ -> graphql/ -> repository root.

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parents[2] / "library.db"


def connect() -> sqlite3.Connection:
    if not DB_PATH.is_file():
        raise FileNotFoundError(f"SQLite database not found: {DB_PATH}")
    connection = sqlite3.connect(DB_PATH, check_same_thread=False)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def fetch_one(sql: str, params: tuple = ()) -> sqlite3.Row | None:
    with connect() as connection:
        return connection.execute(sql, params).fetchone()


def fetch_all(sql: str, params: tuple = ()) -> list[sqlite3.Row]:
    with connect() as connection:
        return connection.execute(sql, params).fetchall()


def execute(sql: str, params: tuple = ()) -> int:
    """Run a write statement. Returns lastrowid for inserts, rowcount otherwise."""
    with connect() as connection:
        cursor = connection.execute(sql, params)
        connection.commit()
        if sql.lstrip().upper().startswith("INSERT"):
            return int(cursor.lastrowid)
        return cursor.rowcount
