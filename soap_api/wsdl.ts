import { create } from "xmlbuilder2";
import { writeFileSync } from "node:fs";


const TNS = "http://library.com/library.wsdl";
const definitions = create({ version: "1.1", encoding: "UTF-8" })
    .ele("wsdl:definitions", {
        name: "librarySystem",
        targetNamespace: TNS,
        "xmlns:wsdl": "http://schemas.xmlsoap.org/wsdl/",
        "xmlns:soap12": "http://schemas.xmlsoap.org/wsdl/soap12/",
        "xmlns:xsd": "http://www.w3.org/2001/XMLSchema",
        "xmlns:tns": TNS,
    });






const schema = definitions
    .ele("wsdl:types")
    .ele("xsd:schema", {
        targetNamespace: TNS,
        elementFormDefault: "qualified",
    });

const book = schema
    .ele("xsd:complexType", { name: "Book"})
    .ele("xsd:sequence");

book.ele("xsd:element", { name: "id", type: "xsd:int" });

book.ele("xsd:element", { name: "title" })
    .ele("xsd:simpleType")
    .ele("xsd:restriction", { base: "xsd:string" })
    .ele("xsd:maxLength", { value: "255" });

book.ele("xsd:element", { name: "authorId", type: "xsd:int", minOccurs: "1" });

book.ele("xsd:element", { name: "publishingYear", minOccurs: "0" })
    .ele("xsd:simpleType")
    .ele("xsd:restriction", { base: "xsd:int" })
    .ele("xsd:minInclusive", { value: "1900" });

book.ele("xsd:element", { name: "publishingCompanyId", type: "xsd:int", minOccurs: "1" });



const author = schema
    .ele("xsd:complexType", { name: "Author"})
    .ele("xsd:sequence");

author.ele("xsd:element", { name: "id", type: "xsd:int"});
author.ele("xsd:element", { name: "name" })
    .ele("xsd:simpleType")
    .ele("xsd:restriction", { base: "xsd:string" })
    .ele("xsd:maxLength", { value: "40" });

author.ele("xsd:element", { name: "surname", minOccurs: "0" })
    .ele("xsd:simpleType")
    .ele("xsd:restriction", { base: "xsd:string" })
    .ele("xsd:maxLength", { value: "60" });



const publishingCompany = schema
    .ele("xsd:complexType", {name: "PublishingCompany"})
    .ele("xsd:sequence");

publishingCompany.ele("xsd:element", { name: "id", type: "xsd:int"});
publishingCompany.ele("xsd:element", { name: "name" })
    .ele("xsd:simpleType")
    .ele("xsd:restriction", { base: "xsd:string" })
    .ele("xsd:maxLength", { value: "40" });



const FAULTS = ["NotFoundFault", "ValidationFault", "ConflictFault"];
for (const fault of FAULTS) {
    schema.ele("xsd:element", { name: fault })
        .ele("xsd:complexType")
        .ele("xsd:sequence")
        .ele("xsd:element", { name: "message", type: "xsd:string" });
}

for (const fault of FAULTS) {
    definitions.ele("wsdl:message", { name: `${fault}Message` })
        .ele("wsdl:part", { name: "detail", element: `tns:${fault}` });
}



const OUTPUT_FILE = "library.wsdl"
const wsdl = definitions.end({ prettyPrint: true });
writeFileSync(OUTPUT_FILE, wsdl);
console.log("Wrote " + OUTPUT_FILE);
