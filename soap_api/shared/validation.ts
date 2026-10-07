import { fault } from './faults.js';

function requireId(value: unknown, field = 'id'): number {
    if (!Number.isInteger(value)) {
        throw fault('ValidationFault', `${field} must be an integer`);
    }
    return value as number;
}

export { requireId }
