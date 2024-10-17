module.export = {
   $jsonSchema: {
      bsonType: "object",
      required: ["templateId", "documentInfoFields", "documentLineItems", "createdOn", "lastUpdatedOn"],
      properties: {
         templateId: {
            bsonType: "string",
            description: ""
         },
         documentInfoFields: {
            bsonType: "array",
            required: ["id", "label", "index"],
            properties: {
               id: {
                  bsonType: "string",
                  description: "must be a string if the field exists"
               },
               label: {
                  bsonType: "string",
                  "description": "must be a string and is required"
               },
               mappingId: {
                  bsonType: "string",
                  "description": "this is the id from ABBY output"
               },
               index: {
                  bsonType: "int",
                  "description": "must be a string and is required"
               },
               type: {
                  bsonType: "string",
                  "description": "must be a string and is required"
               },
               className: {
                  bsonType: "string",
                  "description": "options - apply css"
               },
               displaySpan: {
                  bsonType: "number",
                  "description": "how many columns should this field display in the UI - default should be 1 means 1/12"
               }
            }
         },
         documentLineItems: {
            bsonType: "array",
            required: ["id", "label", "index"],
            properties: {
               id: {
                  bsonType: "string",
                  description: "must be a string if the field exists"
               },
               label: {
                  bsonType: "string",
                  "description": "must be a string and is required"
               },
               index: {
                  bsonType: "int",
                  "description": "must be a string and is required"
               },
               type: {
                  bsonType: "string",
                  "description": "must be a string and is required"
               },
               className: {
                  bsonType: "string",
                  "description": "options - apply css"
               },
               numericFormat: {
                  bsonType: "object",
                  description: "optional - {pattern: '$0,00',culture: 'en-US'} // refer handsontable column details"
               }
            }
         },
         createdOn: {
            bsonType: "timestamp",
            description: ""
         },
         lastUpdatedOn: {
            bsonType: "timestamp",
            description: ""
         }
      }
   }
}