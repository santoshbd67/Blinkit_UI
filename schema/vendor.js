module.export = {
   $jsonSchema: {
      bsonType: "object",
      required: ["vendorId", "name", "address", "logo", "createdOn", "lastUpdatedOn"],
      properties: {
         vendorId: {
            bsonType: "string",
            description: ""
         },
         name: {
            bsonType: "string",
            description: ""
         },
         address: {
            bsonType: "string",
            description: ""
         },
         logo: {
            bsonType: "string",
            description: ""
         },
         currency: {
            bsonType: "string",
            description: ""
         },
         firstInvoiceDate: {
            bsonType: "date",
            description: ""
         },
         lastInvoiceDate: {
            bsonType: "date",
            description: ""
         },
         lastInvoiceSubmittedOn: {
            bsonType: "timestamp",
            description: ""
         },
         lastInvoiceProcessedOn: {
            bsonType: "timestamp",
            description: ""
         },
         createdOn: {
            bsonType: "timestamp",
            description: ""
         },
         lastUpdatedOn: {
            bsonType: "timestamp",
            description: ""
         },
         avgValuePerQuarter: {
            bsonType: "double",
            description: ""
         },
         avgInvociesPerQuarter: {
            bsonType: "double",
            description: ""
         },
         xmlMapping: {
            bsonType: "object",
            description: "Format for XML to json mapping"
         }
      }
   }
}