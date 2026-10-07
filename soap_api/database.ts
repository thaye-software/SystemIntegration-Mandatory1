import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// library.db lives in the repository root, shared by all four APIs
const db = new DatabaseSync(path.join(__dirname, '..', 'library.db'));

export { db }
