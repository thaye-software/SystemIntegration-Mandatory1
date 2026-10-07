type FaultName = 'NotFoundFault' | 'ValidationFault' | 'ConflictFault';

// All declared faults are the client's fault: SOAP 1.2 Sender -> HTTP 400
function fault(name: FaultName, message: string) {
    return {
        Fault: {
            statusCode: 400,
            Code: { Value: 'soap:Sender' },
            Reason: { Text: message },
            Detail: { [`tns:${name}`]: { 'tns:message': message } },
        },
    };
}

export { fault }
