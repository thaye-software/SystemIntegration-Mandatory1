import { type IServices } from 'soap';

import { authorService } from './author/authorService.js';
import { bookService } from './book/bookService.js';
import { publishingCompanyService } from './publishingCompany/publishingCompanyService.js';

// The keys must match the names in the WSDL:
// { <service name>: { <port name>: { <operation name>(args) { return { ... }; } } } }
const libaryService: IServices = {
    LibraryService: {
        LibraryPort: {
            ...bookService,
            ...authorService,
            ...publishingCompanyService,
        },
    },
};

export { libaryService }
