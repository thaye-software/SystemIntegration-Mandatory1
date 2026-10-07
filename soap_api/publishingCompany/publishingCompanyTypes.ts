// Row as stored in the tpublishingcompany table
type PublishingCompanyRow = {
    nPublishingCompanyID: number;
    cName: string;
};

// The publishing company fields without id (input of CreatePublishingCompany)
type PublishingCompanyFields = {
    name: string;
};

type PublishingCompany = PublishingCompanyFields & {
    id: number;
};

export type { PublishingCompanyRow, PublishingCompanyFields, PublishingCompany }
