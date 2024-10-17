const config = require('../config');
const replaceall = require("replaceall");

const metadata_Mapping = {
    file_name: "File Name",
    document_id: "Document ID",
    status: "Status",
    submitted_on: "Submitted On",
    pages: "Pages",
    quality_score: "Quality Score",
    upload_user: "Upload User",
    vendor_name: "VENDOR NAME",
    vendor_id: "VENDOR ID",
    vendor_gstin: "VENDOR GSTIN",
    vendor_state: "VENDOR State",
    billing_gstin: "Billing GSTIN",
    billing_state: "Billing State",
    shipping_gstin: "Shipping GSTIN",
    vendor_master: "Vendor Master",
    billing_master: "Billing Master",
    shipping_master: "Shipping Master",
    user_id: "User",
    error_message: "Error Message",
    stp_system: "STP System",
    ace: "ACE",
    paiges_confidence: "pAIges Confidence",
    paiges_accuracy: "pAIges Accuracy",
    file_size: "File Size",
    user_comment: "User Comment",
    total_review_time: "Total Review Time",
    review_completion_or_deletion_time: "Review Completion/Deletion Time",
    extraction_completion_time: "Extraction Completion Time",
    delete_reason: "Delete Reason",
    manually_reviewed: "Manually Reviewed",
    calculated_accuracy_paiges: "Calculated Accuracy pAIges",
    calculated_accuracy_client: "Calculated Accuracy Client",
    sla_flag: "SLA_flag",
    non_sla_reason: "Non_SLA_reason",
    lastupdated: "lastUpdated",

    //NEW Fields for TAPP/BCP
    ...(config.TAPP_CHANGES_VISIBILITY == 1) && { doc_type: "doc_type" },
    ...(config.TAPP_CHANGES_VISIBILITY == 1) && { status_msg: "status_msg" },
    ...(config.TAPP_CHANGES_VISIBILITY == 1) && { stage: "stage" },
    ...(config.TAPP_CHANGES_VISIBILITY == 1) && { approval_status: "approval_status" },
    ...(config.TAPP_CHANGES_VISIBILITY == 1) && { approver_email: "approver_email" },
    ...(config.TAPP_CHANGES_VISIBILITY == 1) && { sent_to_approval_on: "sent_to_approval_on" },
    ...(config.TAPP_CHANGES_VISIBILITY == 1) && { approved_on: "approved_on" },
    ...(config.TAPP_CHANGES_VISIBILITY == 1) && { approver_comment: "approver_comment" },
    ...(config.TAPP_CHANGES_VISIBILITY == 1) && { approver_designation: "approver_designation" },
    ...(config.TAPP_CHANGES_VISIBILITY == 1) && { re_opened: "re_opened" },
    ...(config.TAPP_CHANGES_VISIBILITY == 1) && { posting_status: "posting_status" }
}

const result_Mapping = {
    document_id: "Document ID",
    field_id: "Field",
    status: "Status",
    left_: "Left",
    right_: "Right",
    top_: "Top",
    bottom_: "Bottom",
    corr_left: "Corr Left",
    corr_right: "Corr Right",
    corr_top: "Corr Top",
    corr_bottom: "Corr Bottom"
}

const sqlTables = {
    metaData: config.metaDataTable,
    result: config.resultDataTable,
    rpaMetaData: config.rpaMetaDataTable
}

const dataTypeCheck = (name, value) => {
    try {
        switch (name) {
            case 'lastupdated':
            case 'submitted_on':
            case 'review_completion_or_deletion_time':
            case 'file_size':
            case 'extraction_completion_time':
            case 'sent_to_approval_on':
            case 'approved_on':
            case 'rpa_posting_time': 
                value = parseInt(value);
                value = isNaN(value) ? null : value;
                return value;
            case 'quality_score':
            case 'left_':
            case 'right_':
            case 'top_':
            case 'bottom_':
            case 'corr_left':
            case 'corr_right':
            case 'corr_top':
            case 'corr_bottom':

            case 'total_review_time':
            case 'paiges_confidence':
            case 'paiges_accuracy':
            case 'calculated_accuracy_paiges':
            case 'calculated_accuracy_client':
                value = parseFloat(value);
                value = isNaN(value) ? null : value;
                return value;
            default:
                //console.log(typeof (value), value)
                //Added check for string on 02-03-2023
                if (typeof (value) === 'string' && value.includes("'"))
                    value = replaceall("'", "''", value);
                return value;
        }
    } catch (error) {
        console.log("Error in dataTypeCheck method");
        console.log(error);
        return null;
    }
}

const valueCheckInRPATable = (name, value) => {
    let response = {
        status: true,
        key: name,
        value: value,
        Error: ''
    };

    if ((name != null || name != undefined) && (value != null || value != undefined)) {
        try {
            if (value && typeof value === 'string')
                value = value.toLowerCase();

            switch (name) {
                // case 'rpa_number_files':
                //     response.status = (value == 'email' || value == 'folder') ? true : false;
                //     if (!response.status)
                //         response.Error = `For ${name} value should be either email or folder.`
                //     return response;

                case 'rpa_receive_time':
                    response.status = (digits_count(value) == 13) ? true : false;
                    if (!response.status)
                        response.Error = `For ${name} value should be 13 digit long.`
                    return response;

                case 'rpa_upload_time':
                    response.status = (digits_count(value) == 13) ? true : false;
                    if (!response.status)
                        response.Error = `For ${name} value should be 13 digit long.`
                    return response;

                // case 'rpa_upload_status': //commented on 20-02-2023 by Amit to show the free text
                //     response.status = (value == 'success' || value == 'failure') ? true : false;
                //     if (!response.status)
                //         response.Error = `For ${name} value should be either success or failure.`
                //     return response;

                case 'rpa_manual_upload_queue':
                    response.status = (value == 0 || value == 1) ? true : false;
                    if (!response.status)
                        response.Error = `For ${name} value should be either 0 or 1.`
                    return response;

                case 'rpa_upload_mode':
                    response.status = (value == 'email' || value == 'folder') ? true : false;
                    if (!response.status)
                        response.Error = `For ${name} value should be either email or folder.`
                    return response;

                case 'rpa_posting_time':
                    response.status = (digits_count(value) == 13) ? true : false;
                    if (!response.status)
                        response.Error = `For ${name} value should be 13 digit long.`
                    return response;

                // case 'rpa_posting_status':  //commented on 20-02-2023 by Amit to show the free text
                //     response.status = (value == 'success' || value == 'failure') ? true : false;
                //     if (!response.status)
                //         response.Error = `For ${name} value should be either success or failure.`
                //     return response;

                case 'rpa_manual_posting_queue':
                    response.status = (value == 0 || value == 1) ? true : false;
                    if (!response.status)
                        response.Error = `For ${name} value should be either 0 or 1.`
                    return response;

                default:
                    return response;
            }
        } catch (error) {
            console.log(`Error in valueCheckInRPATable method at ${new Date().toUTCString()}`);
            console.log(error);
            return response;
        }
    }
    else {
        console.log(`Either name or value is undefined name:${name} value:${value}`);
        response.Error = 'Either name or value is undefined';
        return response;
    }
}

const digits_count = (n) => {
    var count = 0;
    if (n >= 1) ++count;

    while (n / 10 >= 1) {
        n /= 10;
        ++count;
    }

    return count;
}

const allowDataStoreInSQL = (oldDoc, newDoc) => {
    try {
        console.log(`Entered in allowDataStoreInSQL at ${new Date().toUTCString()} for ${oldDoc.documentId}`);
        if (oldDoc.status && newDoc.status && oldDoc.status !== newDoc.status) {
            return true;
        }

        if (config.TAPP_CHANGES_VISIBILITY == 1) {
            const comparingKeys = JSON.parse(config.COMPARING_VALUES_IN_METADATA);

            for (let i = 0; i <= comparingKeys.length; i++) {
                let element = comparingKeys[i];
                if (oldDoc.hasOwnProperty(element) && newDoc.hasOwnProperty(element) && (oldDoc[element] !== newDoc[element])) {
                    return true;
                }
                if (!(oldDoc.hasOwnProperty(element)) && newDoc.hasOwnProperty(element)) {
                    return true;
                }
            };

        }

        return false;

    } catch (error) {
        console.log(`Got Error in allowDataStoreInSQL method at ${new Date().toUTCString()}`);
        console.log(error);
        return false;
    }
}

module.exports = { metadata_Mapping, result_Mapping, sqlTables, dataTypeCheck, valueCheckInRPATable, allowDataStoreInSQL }

