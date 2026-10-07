# xmlbuilder2 cheatsheet for building a WSDL

```ts
import { create } from 'xmlbuilder2';
```

## The functions you need

| Function | What it does | Returns |
|---|---|---|
| `create({ version: '1.0', encoding: 'UTF-8' })` | Starts a new XML document | the document |
| `.ele(name, attributes?)` | Adds a child element (a tag) | **the new child** |
| `.att(name, value)` or `.att({ ... })` | Adds attribute(s) to the current element | the same element |
| `.txt(text)` | Adds text content between the tags | the same element |
| `.com(text)` | Adds an XML comment `<!-- ... -->` | the same element |
| `.up()` | Moves back to the parent element | the parent |
| `.end({ prettyPrint: true })` | Turns the whole document into a string | `string` |

Two things to remember:

- `.ele()` returns the **child**, not the element you called it on. Either call `.up()` to go back, or store each parent in a variable (easier to read, used below).
- Attributes are usually passed as the second argument to `.ele()`: `.ele('xs:element', { name: 'title', type: 'xs:string' })`. That's the same as `.ele('xs:element').att('name', 'title').att('type', 'xs:string')`.

## XSD tag → xmlbuilder2 call

`parent` means whichever element the tag belongs inside.

| XSD tag | xmlbuilder2 call | Goes inside |
|---|---|---|
| `<xs:schema>` | `types.ele('xs:schema', { targetNamespace: TNS, elementFormDefault: 'qualified' })` | `wsdl:types` |
| `<xs:element>` (simple) | `parent.ele('xs:element', { name: 'title', type: 'xs:string' })` | `xs:schema`, `xs:sequence` |
| `<xs:element>` (optional / list) | `parent.ele('xs:element', { name: 'author', type: 'xs:string', minOccurs: '0', maxOccurs: 'unbounded' })` | `xs:sequence` |
| `<xs:element>` (default / fixed) | `parent.ele('xs:element', { name: 'language', type: 'xs:string', default: 'da' })` | `xs:sequence` |
| `<xs:element>` (uses your own type) | `parent.ele('xs:element', { name: 'book', type: 'tns:Book' })` | `xs:schema`, `xs:sequence` |
| `<xs:complexType>` (named, reusable) | `schema.ele('xs:complexType', { name: 'Book' })` | `xs:schema` |
| `<xs:complexType>` (anonymous) | `element.ele('xs:complexType')` | `xs:element` |
| `<xs:sequence>` | `complexType.ele('xs:sequence')` | `xs:complexType` |
| `<xs:attribute>` | `complexType.ele('xs:attribute', { name: 'id', type: 'xs:int', use: 'required' })` | `xs:complexType` (after `xs:sequence`), `xs:extension` |
| `<xs:simpleContent>` | `complexType.ele('xs:simpleContent')` | `xs:complexType` |
| `<xs:extension>` | `simpleContent.ele('xs:extension', { base: 'xs:string' })` | `xs:simpleContent` |
| `<xs:simpleType>` | `schema.ele('xs:simpleType', { name: 'Genre' })` | `xs:schema`, `xs:element` |
| `<xs:restriction>` | `simpleType.ele('xs:restriction', { base: 'xs:string' })` | `xs:simpleType` |
| `<xs:enumeration>` | `restriction.ele('xs:enumeration', { value: 'Fantasy' })` | `xs:restriction` |
| `<xs:minLength>` / `<xs:maxLength>` | `restriction.ele('xs:maxLength', { value: '100' })` | `xs:restriction` |
| `<xs:minInclusive>` / `<xs:maxInclusive>` | `restriction.ele('xs:minInclusive', { value: '0' })` | `xs:restriction` |
| `<xs:pattern>` | `restriction.ele('xs:pattern', { value: '\\d{13}' })` | `xs:restriction` |

Attribute values must be strings, so write `minOccurs: '0'`, not `minOccurs: 0`.

## WSDL tags → xmlbuilder2 call

The schema lives inside `wsdl:types`. The rest of the WSDL uses the same functions:

| WSDL tag | xmlbuilder2 call | Goes inside |
|---|---|---|
| `<wsdl:definitions>` | `doc.ele('wsdl:definitions', { 'xmlns:wsdl': ..., 'xmlns:soap': ..., 'xmlns:xs': ..., 'xmlns:tns': TNS, targetNamespace: TNS, name: 'LibraryService' })` | document root |
| `<wsdl:types>` | `defs.ele('wsdl:types')` | `wsdl:definitions` |
| `<wsdl:message>` | `defs.ele('wsdl:message', { name: 'GetBookRequest' })` | `wsdl:definitions` |
| `<wsdl:part>` | `message.ele('wsdl:part', { name: 'parameters', element: 'tns:GetBook' })` | `wsdl:message` |
| `<wsdl:portType>` | `defs.ele('wsdl:portType', { name: 'LibraryPortType' })` | `wsdl:definitions` |
| `<wsdl:operation>` | `portType.ele('wsdl:operation', { name: 'GetBook' })` | `wsdl:portType`, `wsdl:binding` |
| `<wsdl:input>` / `<wsdl:output>` | `operation.ele('wsdl:input', { message: 'tns:GetBookRequest' })` | `wsdl:operation` |
| `<wsdl:binding>` | `defs.ele('wsdl:binding', { name: 'LibraryBinding', type: 'tns:LibraryPortType' })` | `wsdl:definitions` |
| `<soap:binding>` | `binding.ele('soap:binding', { style: 'document', transport: 'http://schemas.xmlsoap.org/soap/http' })` | `wsdl:binding` |
| `<soap:operation>` | `bindingOp.ele('soap:operation', { soapAction: 'GetBook' })` | `wsdl:operation` (in binding) |
| `<soap:body>` | `bindingInput.ele('soap:body', { use: 'literal' })` | `wsdl:input` / `wsdl:output` (in binding) |
| `<wsdl:service>` | `defs.ele('wsdl:service', { name: 'LibraryService' })` | `wsdl:definitions` |
| `<wsdl:port>` | `service.ele('wsdl:port', { name: 'LibraryPort', binding: 'tns:LibraryBinding' })` | `wsdl:service` |
| `<soap:address>` | `port.ele('soap:address', { location: 'http://localhost:3000/soap' })` | `wsdl:port` |

## Namespace URIs

Declare these as `xmlns:...` attributes on `wsdl:definitions`. Child elements then just use the prefix.

| Prefix | URI |
|---|---|
| `wsdl` | `http://schemas.xmlsoap.org/wsdl/` |
| `soap` | `http://schemas.xmlsoap.org/wsdl/soap/` |
| `xs` | `http://www.w3.org/2001/XMLSchema` |
| `tns` | your own, e.g. `http://example.com/library` |

## Small example: the schema part

```ts
const TNS = 'http://example.com/library';

const doc = create({ version: '1.0', encoding: 'UTF-8' });

const defs = doc.ele('wsdl:definitions', {
  'xmlns:wsdl': 'http://schemas.xmlsoap.org/wsdl/',
  'xmlns:soap': 'http://schemas.xmlsoap.org/wsdl/soap/',
  'xmlns:xs': 'http://www.w3.org/2001/XMLSchema',
  'xmlns:tns': TNS,
  targetNamespace: TNS,
  name: 'LibraryService',
});

const schema = defs
  .ele('wsdl:types')
  .ele('xs:schema', { targetNamespace: TNS, elementFormDefault: 'qualified' });

// <xs:complexType name="Book"> with a sequence and an id attribute
const book = schema.ele('xs:complexType', { name: 'Book' });
const bookSeq = book.ele('xs:sequence');
bookSeq.ele('xs:element', { name: 'title', type: 'xs:string' });
bookSeq.ele('xs:element', { name: 'author', type: 'xs:string', maxOccurs: 'unbounded' });
bookSeq.ele('xs:element', { name: 'year', type: 'xs:int', minOccurs: '0' });
book.ele('xs:attribute', { name: 'id', type: 'xs:int', use: 'required' }); // after the sequence

// Request element: <GetBook><id>1</id></GetBook>
schema
  .ele('xs:element', { name: 'GetBook' })
  .ele('xs:complexType')
  .ele('xs:sequence')
  .ele('xs:element', { name: 'id', type: 'xs:int' });

// Response element: <GetBookResponse><book>...</book></GetBookResponse>
schema
  .ele('xs:element', { name: 'GetBookResponse' })
  .ele('xs:complexType')
  .ele('xs:sequence')
  .ele('xs:element', { name: 'book', type: 'tns:Book' });

// ... messages, portType, binding, service go on `defs` the same way

const wsdl = doc.end({ prettyPrint: true });
```

Output of the `Book` part:

```xml
<xs:complexType name="Book">
  <xs:sequence>
    <xs:element name="title" type="xs:string"/>
    <xs:element name="author" type="xs:string" maxOccurs="unbounded"/>
    <xs:element name="year" type="xs:int" minOccurs="0"/>
  </xs:sequence>
  <xs:attribute name="id" type="xs:int" use="required"/>
</xs:complexType>
```

## Same thing with `.up()` instead of variables

```ts
schema
  .ele('xs:complexType', { name: 'Book' })
    .ele('xs:sequence')
      .ele('xs:element', { name: 'title', type: 'xs:string' }).up()
      .ele('xs:element', { name: 'author', type: 'xs:string' }).up()
    .up()                                   // back to complexType
    .ele('xs:attribute', { name: 'id', type: 'xs:int', use: 'required' });
```

This works, but it's easy to miscount the `.up()` calls. Storing parents in variables is usually clearer.
