const boolean = require("joi/lib/types/boolean");

module.export = {
    $jsonSchema: {
        bsonType: "object",
        //required: ["userId", "role", "userName", "emailId", "password"],
        required: ["userId", "role", "emailId", "password", "company", "designation", "phone"],
        properties: {
            userId: {
                bsonType: "int",
                description: ""
            },
            role: {
                bsonType: "string",
                description: ""
            },
            userName: {
                bsonType: "string",
                description: ""
            },
            emailId: {
                bsonType: "string",
                description: ""
            },
            password: {
                bsonType: "string",
                description: ""
            },
            company: {
                bsonType: "string",
                description: ""
            },
            designation: {
                bsonType: "string",
                description: ""
            },
            phone: {
                bsonType: "number",
                description: ""
            },
            verificationToken: {
                bsonType: "string",
                description: ""
            },
            emailVerified: {
                bsonType: boolean,
                default: false,
                description: "either true or false"
            },
            createdOn: {
                bsonType: "timestamp",
                description: "The date on which the user Created."
            },
            lastLogin: {
                bsonType: "timestamp",
                description: "The date on which the user login for Last Time."
            }
        }
    }
}