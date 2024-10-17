module.export = {
    $jsonSchema: {
        bsonType: "object",
        required: ["tokenId", "token", "userId", "role", "createdOn", "expiryDueOn", "disabled"],
        properties: {
            tokenId: {
                bsonType: "int",
                description: "unique key for token"
            },
            token: {
                bsonType: "string",
                description: "token value"
            },
            userId: {
                bsonType: "int",
                description: "userId for whom the token was generated"
            },
            role: {
                bsonType: "string",
                description: "authentication level of the issued token"
            },
            createdOn: {
                bsonType: "timestamp",
                description: "The date on which the token was Created."
            },
            expiryDueOn: {
                bsonType: "timestamp",
                description: "The date on which the token is due to expire"
            },
            disabled: {
                bsonType: "boolean",
                description: "Status of token disabled or not"
            }
        }
    }
}