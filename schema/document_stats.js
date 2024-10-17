module.export = {
   $jsonSchema: {
      bsonType: "object",
      required: ["period", "vendorId", "templateId"],
      properties: {
         period: {
            bsonType: "int",
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
         totalDocumentsSubmitted: {
            bsonType: "int",
            description: ""
         },
         totalDocumentsProcessed: {
            bsonType: "int",
            description: ""
         },
         failedDocumentsCount: {
            bsonType: "int",
            enum: ["Invoice"],
            description: ""
         },
         totalPageCount: {
            bsonType: "int",
            description: ""
         },
         avgPageCount: {
            bsonType: "double",
            description: ""
         },
         totalPagesProcessed: {
            bsonType: "int",
            description: ""
         },
         failedPagesCount: {
            bsonType: "int",
            description: ""
         },
         avgConfidenceScore: {
            bsonType: "double",
            description: ""
         },
         totalProcessingTime: {
            bsonType: "double",
            description: ""
         },
         avgProcessingTime: {
            bsonType: "double",
            description: ""
         },
         totalPreProcessingTime: {
            bsonType: "double",
            description: ""
         },
         avgPreProcessingTime: {
            bsonType: "double",
            description: ""
         },
         totalExtractionTime: {
            bsonType: "double",
            description: ""
         },
         avgExtractionTime: {
            bsonType: "double",
            description: ""
         },
         totalCorrectionTime: {
            bsonType: "double",
            description: ""
         },
         avgCorrectionTime: {
            bsonType: "double",
            description: ""
         },
         totalReviewTime: {
            bsonType: "double",
            description: ""
         },
         avgReviewTime: {
            bsonType: "double",
            description: ""
         },
         totalTimeSpent: {
            bsonType: "double",
            description: ""
         },
         avgTimeSpent: {
            bsonType: "double",
            description: ""
         },
         totalAmount: {
            bsonType: "double",
            description: ""
         },
         avgAmount: {
            bsonType: "double",
            description: ""
         },
         distinctVendors: {
            bsonType: "int",
            description: ""
         }
      }
   }
}