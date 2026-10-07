// Row as stored in the tbook table
type BookRow = {
    nBookID: number;
    cTitle: string;
    nAuthorID: number;
    nPublishingYear: number | null;
    nPublishingCompanyID: number;
};

// The book fields without id (input of CreateBook)
type BookFields = {
    title: string;
    authorId: number;
    publishingYear: number | null;
    publishingCompanyId: number;
};

type Book = BookFields & {
    id: number;
};

export type { BookRow, BookFields, Book }
