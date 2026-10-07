import { type IServicePort } from 'soap';

import { bookRepository } from '../book/bookRepository.js';
import { fault } from '../shared/faults.js';
import { requireId } from '../shared/validation.js';
import { publishingCompanyRepository } from './publishingCompanyRepository.js';
import type { PublishingCompany, PublishingCompanyFields } from './publishingCompanyTypes.js';



function validatePublishingCompanyFields(args: any): PublishingCompanyFields {
    const name = typeof args?.name === 'string' ? args.name.trim() : '';
    if (name.length === 0) {
        throw fault('ValidationFault', 'name is required');
    }
    if (name.length > 40) {
        throw fault('ValidationFault', 'name must be at most 40 characters');
    }

    return { name };
}

function requirePublishingCompany(id: number): PublishingCompany {
    const publishingCompany = publishingCompanyRepository.findById(id);
    if (!publishingCompany) {
        throw fault('NotFoundFault', `Publishing company ${id} does not exist`);
    }
    return publishingCompany;
}

// Same order as the PublishingCompany type in the WSDL: PublishingCompanyFields, then id
function toResponse(publishingCompany: PublishingCompany) {
    return {
        name: publishingCompany.name,
        id: publishingCompany.id,
    };
}



const publishingCompanyService: IServicePort = {
    CreatePublishingCompany(args: any) {
        const id = publishingCompanyRepository.insert(validatePublishingCompanyFields(args));

        return { id };
    },

    GetPublishingCompanyById(args: any) {
        return toResponse(requirePublishingCompany(requireId(args?.id)));
    },

    // Empty request: node-soap passes args as null
    ListPublishingCompanies() {
        return { publishingCompany: publishingCompanyRepository.findAll().map(toResponse) };
    },

    UpdatePublishingCompany(args: any) {
        const id = requireId(args?.id);
        requirePublishingCompany(id);
        publishingCompanyRepository.update(id, validatePublishingCompanyFields(args));

        return { success: true, message: `Publishing company ${id} updated` };
    },

    DeletePublishingCompany(args: any) {
        const id = requireId(args?.id);
        requirePublishingCompany(id);

        const count = bookRepository.countByPublishingCompanyId(id);
        if (count > 0) {
            throw fault('ConflictFault', `Publishing company ${id} is referenced by ${count} book(s)`);
        }

        publishingCompanyRepository.deleteById(id);

        return { success: true, message: `Publishing company ${id} deleted` };
    },
};

export { publishingCompanyService }
