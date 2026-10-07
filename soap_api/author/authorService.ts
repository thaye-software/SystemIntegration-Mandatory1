import { type IServicePort } from 'soap';

import { bookRepository } from '../book/bookRepository.js';
import { fault } from '../shared/faults.js';
import { requireId } from '../shared/validation.js';
import { authorRepository } from './authorRepository.js';
import type { Author, AuthorFields } from './authorTypes.js';



function validateAuthorFields(args: any): AuthorFields {
    const name = typeof args?.name === 'string' ? args.name.trim() : '';
    if (name.length === 0) {
        throw fault('ValidationFault', 'name is required');
    }
    if (name.length > 40) {
        throw fault('ValidationFault', 'name must be at most 40 characters');
    }

    let surname: string | null = null;
    if (args.surname !== undefined && args.surname !== null) {
        if (typeof args.surname !== 'string') {
            throw fault('ValidationFault', 'surname must be a string');
        }
        if (args.surname.trim().length > 60) {
            throw fault('ValidationFault', 'surname must be at most 60 characters');
        }
        surname = args.surname.trim() || null;
    }

    return { name, surname };
}

function requireAuthor(id: number): Author {
    const author = authorRepository.findById(id);
    if (!author) {
        throw fault('NotFoundFault', `Author ${id} does not exist`);
    }
    return author;
}

// Same order as the Author type in the WSDL: AuthorFields, then id
function toResponse(author: Author) {
    return {
        name: author.name,
        ...(author.surname !== null && { surname: author.surname }),
        id: author.id,
    };
}



const authorService: IServicePort = {
    CreateAuthor(args: any) {
        const id = authorRepository.insert(validateAuthorFields(args));

        return { id };
    },

    GetAuthorById(args: any) {
        return toResponse(requireAuthor(requireId(args?.id)));
    },

    // Empty request: node-soap passes args as null
    ListAuthors() {
        return { author: authorRepository.findAll().map(toResponse) };
    },

    UpdateAuthor(args: any) {
        const id = requireId(args?.id);
        requireAuthor(id);
        authorRepository.update(id, validateAuthorFields(args));

        return { success: true, message: `Author ${id} updated` };
    },

    DeleteAuthor(args: any) {
        const id = requireId(args?.id);
        requireAuthor(id);

        const count = bookRepository.countByAuthorId(id);
        if (count > 0) {
            throw fault('ConflictFault', `Author ${id} is referenced by ${count} book(s)`);
        }

        authorRepository.deleteById(id);

        return { success: true, message: `Author ${id} deleted` };
    },
};

export { authorService }
