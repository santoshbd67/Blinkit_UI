export const AppConfig = {
  documentStatus: [
    "NEW",
    //"INVALID",
    "FAILED",
    //"REJECTED",
    "PRE_PROCESSING",
    //"READY_FOR_EXTRACTION",
    "EXTRACTION_INPROGRESS",
    //"EXTRACTION_DONE",
    "REVIEW",
    //"RPA_PROCESSING",
    "PROCESSED",
    "REVIEW_COMPLETED",
    "DELETED",
    "RPA_PROCESSED",
    "RPA_PROCESSING",
    "RPA_FAILED",
    "RPA_PENDING_APPROVAL"
  ],
  validator: {
    email: "[a-z0-9._%+-]+@[a-z0-9.-]+.[a-z]{2,}$",
    password:"(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[$@$!%*?&])[A-Za-z\d$@$!%*?&].{7,29}"
  },
  itemsPerPage: 10,
  AHT: 12 * 60 * 1000,
  queryTypesOnResult: ["Tax Query", "Vendor GSTN query", "Price Query", "GRN Query"],
  allowedRoles: ['viewer', 'reviewer', 'admin'],
};
