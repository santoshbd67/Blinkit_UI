module.export = {
   $jsonSchema: {
      bsonType: "object",
      required: ["documentId", "uploadUrl", "status"],
      properties: {
         documentId: {
            bsonType: "string",
            description: "documentId. This is required and created within the tapp app"
         },
         templateId: {
            bsonType: "string",
            description: "The template id to which the document belongs to. This will be populated by the pre-processor. This is a $ref attribute to the template collection"
         },
         vendorId: {
            bsonType: "string",
            description: "The vendor to which the document belongs to. This will be populated by the pre-processor. This is a $ref attribute to the vendor collection"
         },
         name: {
            bsonType: "string",
            description: "The name of the document. This will be populated by the pre-processor."
         },
         fileName: {
            bsonType: "string",
            description: "The filename of the document. This is populated during the document upload process."
         },
         documentType: {
            bsonType: "string",
            enum: ["Invoice"],
            description: "The type of the document. This will be populated by the pre-processor."
         },
         mimeType: {
            bsonType: "string",
            description: "The mime-type of the document. This will be populated by the pre-processor."
         },
         size: {
            bsonType: ["double"],
            description: "The size of the document. This is populated during the document upload process."
         },
         checksum: {
            bsonType: "string",
            description: "The checksum of the document. This will be populated by the pre-processor."
         },
         uploadUrl: {
            bsonType: "string",
            description: "The document location on the network. This is populated during the document upload process."
         },
         resultUrl: {
            bsonType: "string",
            description: "The extraction result location on the network. This will be populated by the extraction engine/service."
         },
         status: {
            bsonType: "string",
            enum: ["NEW", "PRE-PROCESSING", "EXTRACTION", "CORRECTION", "REVIEW", "READY", "FAILED", "REJECTED"],
            description: "The status of the document. This is populated by all services"
         },
         statusMsg: {
            bsonType: "string",
            description: "The status of the document. This is populated by all services"
         },
         submittedOn: {
            bsonType: "timestamp",
            description: "The date on which the document is submitted or uploaded."
         },
         submittedBy: {
            bsonType: "string",
            description: "The user id who has submitted the document. For system action use 'system' as the user id"
         },
         lastUpdatedOn: {
            bsonType: "timestamp",
            description: "The date on which the document is last updated."
         },
         lastUpdatedBy: {
            bsonType: "string",
            description: "The user id who has updated the document. For system action use 'system' as the user id"
         },
         lastProcessedOn: {
            bsonType: "timestamp",
            description: "The date on which the document is last updated."
         },
         version: {
            bsonType: "string",
            description: ""
         },
         pageCount: {
            bsonType: "int",
            description: ""
         },
         pages: {
            bsonType: "array",
            required: ["index", "url"],
            properties: {
               index: {
                  bsonType: "int",
                  description: "must be a string if the field exists"
               },
               url: {
                  bsonType: "string",
                  "description": "must be a string and is required"
               }
            }
         },
         resultId: {
            bsonType: "string",
            description: ""
         },
         invoiceDate: {
            bsonType: "string",
            description: ""
         },
         invoiceNumber: {
            bsonType: "string",
            description: ""
         },
         poNumber: {
            bsonType: "string",
            description: ""
         },
         totalAmount: {
            bsonType: "double",
            description: ""
         },
         currency: {
            bsonType: "string",
            description: ""
         },
         keywords: {
            bsonType: "array",
            description: ""
         },
         language: {
            bsonType: "string",
            description: ""
         }
      }
   }
}
