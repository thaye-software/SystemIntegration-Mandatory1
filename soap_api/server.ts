import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { listen } from 'soap';

import libaryService from './services/libaryService.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WSDL_FILE = path.join(__dirname, 'library.wsdl');

if (!existsSync(WSDL_FILE)) {
    console.error(`WSDL not found at ${WSDL_FILE}. Run "npm run generate:wsdl" first.`);
    process.exit(1);
}

const wsdl = readFileSync(WSDL_FILE, 'utf8');



const PATH = '/soap';
const httpServer = createServer((_req, res) => {
    res.statusCode = 404;
    res.end(`404: try POST ${PATH} or GET ${PATH}?wsdl`);
});


const PORT = Number(process.env.PORT) || 8000;
httpServer.listen(PORT, () => {
    listen(httpServer, {
        path: PATH,
        services: libaryService,
        xml: wsdl,
        forceSoap12Headers: true,   // SOAP 1.2 envelope on responses and faults
        suppressStack: true,
    });
    console.log(`Library SOAP 1.2 service listening on http://localhost:${PORT}${PATH}`);
    console.log(`WSDL at http://localhost:${PORT}${PATH}?wsdl`);
});
