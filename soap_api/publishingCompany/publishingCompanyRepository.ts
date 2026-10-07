import { db } from '../database.js';
import type { PublishingCompany, PublishingCompanyFields, PublishingCompanyRow } from './publishingCompanyTypes.js';

function toPublishingCompany(row: PublishingCompanyRow): PublishingCompany {
    return {
        id: row.nPublishingCompanyID,
        name: row.cName,
    };
}

const publishingCompanyRepository = {
    findById(id: number): PublishingCompany | undefined {
        const row = db.prepare('SELECT * FROM tpublishingcompany WHERE nPublishingCompanyID = ?').get(id) as PublishingCompanyRow | undefined;
        return row && toPublishingCompany(row);
    },

    findAll(): PublishingCompany[] {
        const rows = db.prepare('SELECT * FROM tpublishingcompany ORDER BY nPublishingCompanyID').all() as PublishingCompanyRow[];
        return rows.map(toPublishingCompany);
    },

    exists(id: number): boolean {
        return db.prepare('SELECT 1 FROM tpublishingcompany WHERE nPublishingCompanyID = ?').get(id) !== undefined;
    },

    insert(publishingCompany: PublishingCompanyFields): number {
        const result = db.prepare(
            'INSERT INTO tpublishingcompany (cName) VALUES (?)'
        ).run(publishingCompany.name);

        return Number(result.lastInsertRowid);
    },

    update(id: number, publishingCompany: PublishingCompanyFields): void {
        db.prepare(
            'UPDATE tpublishingcompany SET cName = ? WHERE nPublishingCompanyID = ?'
        ).run(publishingCompany.name, id);
    },

    deleteById(id: number): void {
        db.prepare('DELETE FROM tpublishingcompany WHERE nPublishingCompanyID = ?').run(id);
    },
};

export { publishingCompanyRepository }
