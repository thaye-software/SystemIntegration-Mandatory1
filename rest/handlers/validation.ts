// Thrown from route handlers; the error handler in server.ts turns it into { error: message }
class HttpError extends Error {
    constructor(readonly status: number, message: string) {
        super(message);
    }
}

type Body = Record<string, unknown>;

// req.body is undefined when no JSON was sent, and can be an array or a primitive
function requireBody(body: unknown): Body {
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
        throw new HttpError(400, 'Request body must be a JSON object');
    }
    return body as Body;
}

// :id route parameter
function parseId(value: string): number {
    const id = Number(value);
    if (!/^\d+$/.test(value) || !Number.isSafeInteger(id) || id < 1) {
        throw new HttpError(400, 'id must be a positive integer');
    }
    return id;
}

// ?limit= / ?offset= query parameters
function parseQueryInt(value: unknown, field: string, fallback: number, min: number, max: number): number {
    if (value === undefined) {
        return fallback;
    }
    const number = Number(value);
    if (typeof value !== 'string' || !/^\d+$/.test(value) || number < min || number > max) {
        throw new HttpError(400, `${field} must be an integer between ${min} and ${max}`);
    }
    return number;
}

function requireString(body: Body, field: string, maxLength: number): string {
    const value = body[field];
    if (typeof value !== 'string' || value.trim() === '') {
        throw new HttpError(400, `${field} is required and must be a non-empty string`);
    }
    if (value.trim().length > maxLength) {
        throw new HttpError(400, `${field} must be at most ${maxLength} characters`);
    }
    return value.trim();
}

// missing or null becomes '' (e.g. tauthor.cSurname)
function optionalString(body: Body, field: string, maxLength: number): string {
    const value = body[field];
    if (value === undefined || value === null) {
        return '';
    }
    if (typeof value !== 'string') {
        throw new HttpError(400, `${field} must be a string`);
    }
    if (value.trim().length > maxLength) {
        throw new HttpError(400, `${field} must be at most ${maxLength} characters`);
    }
    return value.trim();
}

function requireInteger(body: Body, field: string, min = 1, max = Number.MAX_SAFE_INTEGER): number {
    const value = body[field];
    if (!Number.isInteger(value) || (value as number) < min || (value as number) > max) {
        throw new HttpError(400, `${field} is required and must be an integer between ${min} and ${max}`);
    }
    return value as number;
}

export { HttpError, type Body, requireBody, parseId, parseQueryInt, requireString, optionalString, requireInteger }
