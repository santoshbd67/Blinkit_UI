module.export = {
  $jsonSchema: {
    bsonType: "object",
    required: ["mapId", "userId", "vendorId", "createdOn", "createdBy","lastUpdatedOn","lastUpdatedBy"],
    properties: {
      mapId: {
        bsonType: "int",
        description: "unique key for mapping"
      },
      userId: {
        bsonType: "int",
        description: "user for which the relation is"
      },
      vendorId: {
        bsonType: "string",
        description: "vendor for which the relation is"
      },
      createdOn:{
        bsonType: "timestamp",
        description: "user vendor relation was created on date"
      },createdBy:{
        bsonType: "int",
        description: "user vendor relation was created by which user"
      },
      lastUpdatedOn: {
        bsonType: "timestamp",
        description: "when was the mapping last updated"
      },
      lastUpdatedBy: {
        bsonType: "int",
        description: "mapping was last updated by whom"
      }
    }
  }
};
