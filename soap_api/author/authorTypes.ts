// Row as stored in the tauthor table
type AuthorRow = {
    nAuthorID: number;
    cName: string;
    cSurname: string | null;
};

// The author fields without id (input of CreateAuthor)
type AuthorFields = {
    name: string;
    surname: string | null;
};

type Author = AuthorFields & {
    id: number;
};

export type { AuthorRow, AuthorFields, Author }
