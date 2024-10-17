module.export = {
    $jsonSchema: {
        bsonType: "object",
        required: ["settingId", "settingType", "settingValue"],
        properties: {
            settingId: {
                bsonType: "string",
                description: ""
            },
            settingType: {
                bsonType: "string",
                description: ""
            },
            settingValue: {
                bsonType: "string",
                description: ""
            }
        }
    }
}