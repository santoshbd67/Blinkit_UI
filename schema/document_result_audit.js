module.export = {
   $jsonSchema: {
      bsonType: "object",
      required: ["documentId", "resultId", "pageNumber", "rowNumber", "fieldName", "oldValue", "newValue", "updatedOn", "updatedBy"],
      properties: {
         documentId: {
            bsonType: "string",
            description: ""
         },
         resultId: {
            bsonType: "string",
            description: ""
         },
         pageNumber: {
            bsonType: "int",
            description: ""
         },
         rowNumber: {
            bsonType: "int",
            description: ""
         },
         fieldName: {
            bsonType: "string",
            description: ""
         },
         oldValue: {
            bsonType: "string",
            description: ""
         },
         newValue: {
            bsonType: "string",
            description: ""
         },
         updatedOn: {
            bsonType: "timestamp",
            description: ""
         },
         updatedBy: {
            bsonType: "string",
            description: ""
         },
         notes: {
            bsonType: "string",
            description: ""
         }
      }
   }
}