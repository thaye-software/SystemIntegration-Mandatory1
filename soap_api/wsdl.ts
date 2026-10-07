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

// The book fields without id (used as input when creating a book)
const bookFields = schema
    .ele("xsd:complexType", { name: "BookFields"})
    .ele("xsd:sequence");

bookFields.ele("xsd:element", { name: "title" })
    .ele("xsd:simpleType")
    .ele("xsd:restriction", { base: "xsd:string" })
    .ele("xsd:maxLength", { value: "255" });

bookFields.ele("xsd:element", { name: "authorId", type: "xsd:int", minOccurs: "1" });

bookFields.ele("xsd:element", { name: "publishingYear", minOccurs: "0" })
    .ele("xsd:simpleType")
    .ele("xsd:restriction", { base: "xsd:int" })
    .ele("xsd:minInclusive", { value: "1900" });

bookFields.ele("xsd:element", { name: "publishingCompanyId", type: "xsd:int", minOccurs: "1" });

// Book = BookFields + id
schema.ele("xsd:complexType", { name: "Book" })
    .ele("xsd:complexContent")
    .ele("xsd:extension", { base: "tns:BookFields" })
    .ele("xsd:sequence")
    .ele("xsd:element", { name: "id", type: "xsd:int" });



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



// CreateBook
schema.ele("xsd:element", { name: "CreateBookRequest", type: "tns:BookFields" });

schema.ele("xsd:element", { name: "CreateBookResponse" })
    .ele("xsd:complexType")
    .ele("xsd:sequence")
    .ele("xsd:element", { name: "id", type: "xsd:int" });



// Every operation has a <name>Request and <name>Response element in the schema
const OPERATIONS = [
    { name: "CreateBook", faults: ["ValidationFault"] },
];

for (const operation of OPERATIONS) {
    definitions.ele("wsdl:message", { name: `${operation.name}RequestMessage` })
        .ele("wsdl:part", { name: "parameters", element: `tns:${operation.name}Request` });
    definitions.ele("wsdl:message", { name: `${operation.name}ResponseMessage` })
        .ele("wsdl:part", { name: "parameters", element: `tns:${operation.name}Response` });
}



// PortType: the abstract interface (operations and their messages)
const portType = definitions.ele("wsdl:portType", { name: "LibraryPortType" });

for (const operation of OPERATIONS) {
    const portTypeOperation = portType.ele("wsdl:operation", { name: operation.name });
    portTypeOperation.ele("wsdl:input", { message: `tns:${operation.name}RequestMessage` });
    portTypeOperation.ele("wsdl:output", { message: `tns:${operation.name}ResponseMessage` });

    for (const fault of operation.faults) {
        portTypeOperation.ele("wsdl:fault", { name: fault, message: `tns:${fault}Message` });
    }
}



// Binding: how the portType is sent over the wire (SOAP 1.2, document/literal)
const binding = definitions.ele("wsdl:binding", { name: "LibraryBinding", type: "tns:LibraryPortType" });
binding.ele("soap12:binding", { style: "document", transport: "http://schemas.xmlsoap.org/soap/http" });

for (const operation of OPERATIONS) {
    const bindingOperation = binding.ele("wsdl:operation", { name: operation.name });
    bindingOperation.ele("soap12:operation", { soapAction: `${TNS}/${operation.name}` });
    bindingOperation.ele("wsdl:input").ele("soap12:body", { use: "literal" });
    bindingOperation.ele("wsdl:output").ele("soap12:body", { use: "literal" });

    for (const fault of operation.faults) {
        bindingOperation.ele("wsdl:fault", { name: fault })
            .ele("soap12:fault", { name: fault, use: "literal" });
    }
}



// Service: where the binding is available
definitions.ele("wsdl:service", { name: "LibraryService" })
    .ele("wsdl:port", { name: "LibraryPort", binding: "tns:LibraryBinding" })
    .ele("soap12:address", { location: "http://localhost:8000/soap" });







const OUTPUT_FILE = "library.wsdl"
const wsdl = definitions.end({ prettyPrint: true });
writeFileSync(OUTPUT_FILE, wsdl);
console.log("Wrote " + OUTPUT_FILE);
