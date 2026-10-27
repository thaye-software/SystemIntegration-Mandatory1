# strawberry turns these Python classes into a GraphQL schema.
# GraphQLError is one entry in the JSON errors list a client receives.
# db runs the SQL against the library database.

import strawberry
from strawberry.exceptions import GraphQLError

from app import db


@strawberry.type
class Book:
    id: int
    title: str
    author_id: int = strawberry.field(name="authorId")
    publishing_company_id: int = strawberry.field(name="publishingCompanyId")
    publishing_year: int = strawberry.field(name="publishingYear")


@strawberry.type
class Author:
    id: int
    name: str
    surname: str


@strawberry.type
class Publisher:
    id: int
    name: str


def _not_found(kind: str, entity_id: int) -> GraphQLError:
    return GraphQLError(f"{kind} {entity_id} was not found", extensions={"code": "NOT_FOUND"})


def _validation(message: str) -> GraphQLError:
    return GraphQLError(message, extensions={"code": "VALIDATION"})


def _conflict(message: str) -> GraphQLError:
    return GraphQLError(message, extensions={"code": "CONFLICT"})


def _require_text(value: str, field: str) -> str:
    text = value.strip()
    if not text:
        raise _validation(f"{field} is required")
    return text


def _book_from_row(row) -> Book:
    return Book(
        id=row["nBookID"],
        title=row["cTitle"],
        author_id=row["nAuthorID"],
        publishing_company_id=row["nPublishingCompanyID"],
        publishing_year=int(row["nPublishingYear"]),
    )


def _author_from_row(row) -> Author:
    return Author(
        id=row["nAuthorID"],
        name=row["cName"],
        surname=row["cSurname"],
    )


def _publisher_from_row(row) -> Publisher:
    return Publisher(
        id=row["nPublishingCompanyID"],
        name=row["cName"],
    )


def _require_author(nAuthorID: int) -> None:
    row = db.fetch_one(
        "SELECT nAuthorID FROM tauthor WHERE nAuthorID = ?",
        (nAuthorID,),
    )
    if row is None:
        raise _validation(f"authorId {nAuthorID} does not reference an existing author")


def _require_publisher(nPublishingCompanyID: int) -> None:
    row = db.fetch_one(
        "SELECT nPublishingCompanyID FROM tpublishingcompany WHERE nPublishingCompanyID = ?",
        (nPublishingCompanyID,),
    )
    if row is None:
        raise _validation(
            f"publishingCompanyId {nPublishingCompanyID} does not reference an existing publisher"
        )


def _validate_book(cTitle: str, nAuthorID: int, nPublishingCompanyID: int, nPublishingYear: int) -> str:
    cTitle = _require_text(cTitle, "title")
    if nPublishingYear < 1900:
        raise _validation("publishingYear must be at least 1900")
    _require_author(nAuthorID)
    _require_publisher(nPublishingCompanyID)
    return cTitle


def _get_book(nBookID: int) -> Book:
    row = db.fetch_one("SELECT * FROM tbook WHERE nBookID = ?", (nBookID,))
    if row is None:
        raise _not_found("Book", nBookID)
    return _book_from_row(row)


def _get_author(nAuthorID: int) -> Author:
    row = db.fetch_one("SELECT * FROM tauthor WHERE nAuthorID = ?", (nAuthorID,))
    if row is None:
        raise _not_found("Author", nAuthorID)
    return _author_from_row(row)


def _get_publisher(nPublishingCompanyID: int) -> Publisher:
    row = db.fetch_one(
        "SELECT * FROM tpublishingcompany WHERE nPublishingCompanyID = ?",
        (nPublishingCompanyID,),
    )
    if row is None:
        raise _not_found("Publisher", nPublishingCompanyID)
    return _publisher_from_row(row)


@strawberry.type
class Query:
    @strawberry.field
    def book(self, id: int) -> Book:
        return _get_book(id)

    @strawberry.field
    def books(self) -> list[Book]:
        rows = db.fetch_all("SELECT * FROM tbook ORDER BY nBookID")
        return [_book_from_row(row) for row in rows]

    @strawberry.field
    def author(self, id: int) -> Author:
        return _get_author(id)

    @strawberry.field
    def authors(self) -> list[Author]:
        rows = db.fetch_all("SELECT * FROM tauthor ORDER BY nAuthorID")
        return [_author_from_row(row) for row in rows]

    @strawberry.field
    def publisher(self, id: int) -> Publisher:
        return _get_publisher(id)

    @strawberry.field
    def publishers(self) -> list[Publisher]:
        rows = db.fetch_all(
            "SELECT * FROM tpublishingcompany ORDER BY nPublishingCompanyID"
        )
        return [_publisher_from_row(row) for row in rows]


@strawberry.type
class Mutation:
    @strawberry.mutation
    def create_book(
        self,
        title: str,
        author_id: int,
        publishing_company_id: int,
        publishing_year: int,
        id: int | None = None,
    ) -> Book:
        title = _validate_book(title, author_id, publishing_company_id, publishing_year)
        if id is None:
            new_id = db.execute(
                """
                INSERT INTO tbook (cTitle, nAuthorID, nPublishingCompanyID, nPublishingYear)
                VALUES (?, ?, ?, ?)
                """,
                (title, author_id, publishing_company_id, publishing_year),
            )
        else:
            db.execute(
                """
                INSERT INTO tbook
                    (nBookID, cTitle, nAuthorID, nPublishingCompanyID, nPublishingYear)
                VALUES (?, ?, ?, ?, ?)
                """,
                (id, title, author_id, publishing_company_id, publishing_year),
            )
            new_id = id
        return _get_book(new_id)

    @strawberry.mutation
    def update_book(
        self,
        id: int,
        title: str,
        author_id: int,
        publishing_company_id: int,
        publishing_year: int,
    ) -> Book:
        _get_book(id)
        title = _validate_book(title, author_id, publishing_company_id, publishing_year)
        db.execute(
            """
            UPDATE tbook
            SET cTitle = ?, nAuthorID = ?, nPublishingCompanyID = ?, nPublishingYear = ?
            WHERE nBookID = ?
            """,
            (title, author_id, publishing_company_id, publishing_year, id),
        )
        return _get_book(id)

    @strawberry.mutation
    def delete_book(self, id: int) -> bool:
        _get_book(id)
        db.execute("DELETE FROM tbook WHERE nBookID = ?", (id,))
        return True

    @strawberry.mutation
    def create_author(self, name: str, surname: str, id: int | None = None) -> Author:
        name = _require_text(name, "name")
        surname = _require_text(surname, "surname")
        if id is None:
            new_id = db.execute(
                "INSERT INTO tauthor (cName, cSurname) VALUES (?, ?)",
                (name, surname),
            )
        else:
            db.execute(
                "INSERT INTO tauthor (nAuthorID, cName, cSurname) VALUES (?, ?, ?)",
                (id, name, surname),
            )
            new_id = id
        return _get_author(new_id)

    @strawberry.mutation
    def update_author(self, id: int, name: str, surname: str) -> Author:
        _get_author(id)
        name = _require_text(name, "name")
        surname = _require_text(surname, "surname")
        db.execute(
            "UPDATE tauthor SET cName = ?, cSurname = ? WHERE nAuthorID = ?",
            (name, surname, id),
        )
        return _get_author(id)

    @strawberry.mutation
    def delete_author(self, id: int) -> bool:
        _get_author(id)
        used = db.fetch_one(
            "SELECT COUNT(*) AS n FROM tbook WHERE nAuthorID = ?",
            (id,),
        )
        if used["n"]:
            raise _conflict(f"Author {id} is referenced by a book")
        db.execute("DELETE FROM tauthor WHERE nAuthorID = ?", (id,))
        return True

    @strawberry.mutation
    def create_publisher(self, name: str, id: int | None = None) -> Publisher:
        name = _require_text(name, "name")
        if id is None:
            new_id = db.execute(
                "INSERT INTO tpublishingcompany (cName) VALUES (?)",
                (name,),
            )
        else:
            db.execute(
                "INSERT INTO tpublishingcompany (nPublishingCompanyID, cName) VALUES (?, ?)",
                (id, name),
            )
            new_id = id
        return _get_publisher(new_id)

    @strawberry.mutation
    def update_publisher(self, id: int, name: str) -> Publisher:
        _get_publisher(id)
        name = _require_text(name, "name")
        db.execute(
            "UPDATE tpublishingcompany SET cName = ? WHERE nPublishingCompanyID = ?",
            (name, id),
        )
        return _get_publisher(id)

    @strawberry.mutation
    def delete_publisher(self, id: int) -> bool:
        _get_publisher(id)
        used = db.fetch_one(
            "SELECT COUNT(*) AS n FROM tbook WHERE nPublishingCompanyID = ?",
            (id,),
        )
        if used["n"]:
            raise _conflict(f"Publisher {id} is referenced by a book")
        db.execute(
            "DELETE FROM tpublishingcompany WHERE nPublishingCompanyID = ?",
            (id,),
        )
        return True


schema = strawberry.Schema(query=Query, mutation=Mutation)
