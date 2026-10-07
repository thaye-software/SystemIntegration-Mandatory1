import { type IServicePort } from 'soap';

import { authorRepository } from '../author/authorRepository.js';
import { publishingCompanyRepository } from '../publishingCompany/publishingCompanyRepository.js';
import { fault } from '../shared/faults.js';
import { requireId } from '../shared/validation.js';
import { bookRepository } from './bookRepository.js';
import type { Book, BookFields } from './bookTypes.js';



function validateBookFields(args: any): BookFields {
    const title = typeof args?.title === 'string' ? args.title.trim() : '';
    if (title.length === 0) {
        throw fault('ValidationFault', 'title is required');
    }
    if (title.length > 255) {
        throw fault('ValidationFault', 'title must be at most 255 characters');
    }

    const authorId = requireId(args.authorId, 'authorId');
    if (!authorRepository.exists(authorId)) {
        throw fault('ValidationFault', `Author ${authorId} does not exist`);
    }

    const publishingCompanyId = requireId(args.publishingCompanyId, 'publishingCompanyId');
    if (!publishingCompanyRepository.exists(publishingCompanyId)) {
        throw fault('ValidationFault', `Publishing company ${publishingCompanyId} does not exist`);
    }

    let publishingYear: number | null = null;
    if (args.publishingYear !== undefined && args.publishingYear !== null) {
        if (!Number.isInteger(args.publishingYear) || args.publishingYear < 1900) {
            throw fault('ValidationFault', 'publishingYear must be an integer of at least 1900');
        }
        publishingYear = args.publishingYear;
    }

    return { title, authorId, publishingYear, publishingCompanyId };
}

function requireBook(id: number): Book {
    const book = bookRepository.findById(id);
    if (!book) {
        throw fault('NotFoundFault', `Book ${id} does not exist`);
    }
    return book;
}

// Same order as the Book type in the WSDL: BookFields, then id
function toResponse(book: Book) {
    return {
        title: book.title,
        authorId: book.authorId,
        ...(book.publishingYear !== null && { publishingYear: book.publishingYear }),
        publishingCompanyId: book.publishingCompanyId,
        id: book.id,
    };
}



const bookService: IServicePort = {
    CreateBook(args: any) {
        const id = bookRepository.insert(validateBookFields(args));

        return { id };
    },

    GetBookById(args: any) {
        return toResponse(requireBook(requireId(args?.id)));
    },

    UpdateBook(args: any) {
        const id = requireId(args?.id);
        requireBook(id);
        bookRepository.update(id, validateBookFields(args));

        return { success: true, message: `Book ${id} updated` };
    },

    DeleteBook(args: any) {
        const id = requireId(args?.id);
        requireBook(id);
        bookRepository.deleteById(id);

        return { success: true, message: `Book ${id} deleted` };
    },
};

export { bookService }
