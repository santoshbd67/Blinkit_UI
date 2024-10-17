module.export = {
   $jsonSchema: {
      bsonType: "object",
      required: ["documentId", "vendorId", "templateId"],
      properties: {
         documentId: {
            bsonType: "string",
            description: ""
         },
         vendorId: {
            bsonType: "string",
            description: ""
         },
         templateId: {
            bsonType: "string",
            description: ""
         },
         pageCount: {
            bsonType: "int",
            description: ""
         },
         fieldCount: {
            bsonType: "int",
            description: ""
         },
         processedPageCount: {
            bsonType: "int",
            description: ""
         },
         failedPageCount: {
            bsonType: "int",
            description: ""
         },
         totalCorrections: {
            bsonType: "int",
            description: ""
         },
         totalInteractions: {
            bsonType: "int",
            description: ""
         },
         processingTime: {
            bsonType: "double",
            description: ""
         },
         preProcessingTime: {
            bsonType: "double",
            description: ""
         },
         extractionTime: {
            bsonType: "double",
            description: ""
         },
         postProcessingTime: {
            bsonType: "double",
            description: ""
         },
         correctionTime: {
            bsonType: "double",
            description: ""
         },
         reviewTime: {
            bsonType: "double",
            description: ""
         },
         totalViews: {
            bsonType: "int",
            description: ""
         },
         totalViewTime: {
            bsonType: "double",
            description: ""
         },
         confidenceScore: {
            bsonType: "double",
            description: ""
         },
         lastUpdatedOn: {
            bsonType: "timestamp",
            description: ""
         }
      }
   }
}