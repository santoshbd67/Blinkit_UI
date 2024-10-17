const Joi = require("joi");
const { join } = require("lodash");

const schemaMaster = {
    testAPI: Joi.object().keys({
        documentId: Joi.string().required(),
        fileName: Joi.string().required(),
        documentType: Joi.string().required(),
        mimeType: Joi.string().required(),
    }),
    addDocument: Joi.object()
        .keys({
            documentId: Joi.string().required(),
            fileName: Joi.string().required(),
            documentType: Joi.string().required(),
            mimeType: Joi.string().required(),
            uploadUrl: Joi.string().required(),
            size: Joi.number().required(),
            submittedBy: Joi.string().required(),
            status: Joi.string().required(),
        })
        .pattern(/./, Joi.any()),
    updateDocument: Joi.object()
        .keys({
            documentId: Joi.string().required(),
            status: Joi.string().optional(),
        })
        .pattern(/./, Joi.any()),
    removeDocument: Joi.object()
        .keys({
            documentId: Joi.string().required(),
        })
        .pattern(/./, Joi.any()),

    addResult: Joi.object()
        .keys({
            resultId: Joi.string().optional().allow(""),
            templateId: Joi.string().optional().allow(""),
            documentId: Joi.string().required(),
            documentInfo: Joi.array()
                .items(
                    Joi.object({
                        fieldId: Joi.string().optional().allow(""),
                        fieldValue: Joi.string().optional().allow(""),
                        confidence: Joi.number().optional().allow(""),
                        boundingBox: Joi.object().optional().allow(""),
                        pageNumber: Joi.string().optional().allow(""),
                    }).pattern(/./, Joi.any())
                )
                .required(),
            documentLineItems: Joi.array().items(
                Joi.object({
                    pageNumber: Joi.string().optional().allow(""),
                    rowNumber: Joi.number().optional().allow(""),
                    fieldset: Joi.array().items(
                        Joi.object({
                            fieldId: Joi.string().optional().allow(""),
                            boundingBox: Joi.object().optional().allow(""),
                            fieldValue: Joi.string().optional().allow(""),
                            confidence: Joi.number().optional().allow(null),
                        }).pattern(/./, Joi.any())
                    ),
                }).pattern(/./, Joi.any())
            ),
        })
        .pattern(/./, Joi.any()),

    updateResult: Joi.object()
        .keys({
            resultId: Joi.string().optional().allow(""),
            templateId: Joi.string().optional().allow(""),
            documentId: Joi.string().required(),
            documentInfo: Joi.array()
                .items(
                    Joi.object({
                        fieldId: Joi.string().optional().allow(""),
                        fieldValue: Joi.string().optional().allow(""),
                        confidence: Joi.number().optional().allow(""),
                        boundingBox: Joi.object().optional().allow(""),
                        pageNumber: Joi.string().optional().allow(""),
                    }).pattern(/./, Joi.any())
                )
                .required(),
            documentLineItems: Joi.array().items(
                Joi.object({
                    pageNumber: Joi.string().optional().allow(""),
                    rowNumber: Joi.number().optional().allow(""),
                    fieldset: Joi.array().items(
                        Joi.object({
                            fieldId: Joi.string().optional().allow(""),
                            boundingBox: Joi.object().optional().allow(""),
                            fieldValue: Joi.string().optional().allow(""),
                            confidence: Joi.number().optional().allow(null),
                        }).pattern(/./, Joi.any())
                    ),
                }).pattern(/./, Joi.any())
            ),
        })
        .pattern(/./, Joi.any()),

    addQueryForResult: Joi.object().keys({
        currency: Joi.string().required(),
        dateCreated: Joi.string().required(),
        documentId: Joi.string().required(),
        documentName: Joi.string().required(),
        documentType: Joi.string().required(),
        fieldId: Joi.string().optional().allow(""), //
        fieldLabel: Joi.string().optional().allow(""), //
        invoiceDate: Joi.string().required(),
        invoiceNumber: Joi.string().required(),
        pageCount: Joi.string().required(), //
        pageIndex: Joi.string().optional(), //
        pageUrl: Joi.string().required().allow(""),
        queryId: Joi.string().optional(),
        queryStatus: Joi.string().required(), //
        queryText: Joi.string().required(), //
        queryType: Joi.string().required(), //
        queryUserId: Joi.string().required(), //
        queryUserName: Joi.string().required(), //
        totalAmount: Joi.string().required(),
        uploadUrl: Joi.string().required(),
    }),
    updateQueryForResult: Joi.object().keys({
        queryId: Joi.string().required(),
        documentId: Joi.string().required(),
        resolutionText: Joi.string().required(),
        resolvedByUserId: Joi.string().required(),
        resolvedByUserName: Joi.string().required(),
        dateResponded: Joi.string().required(),
    }),
    registerQueryForResult: Joi.object().keys({
        queryUserId: Joi.string().required(),
        queryUserName: Joi.string().required(),
        queryType: Joi.string().required(),
        queryText: Joi.string().required(),
        queryStatus: Joi.string().required(),
        fieldLabel: Joi.string().required(),
        fieldId: Joi.string().required(),
        dateCreated: Joi.number().required(),
        queryId: Joi.string().required(),
        documentId: Joi.string().required(),
        resolutionText: Joi.string().required(),
        resolvedByUserId: Joi.string().required(),
        resolvedByUserName: Joi.string().required(),
        dateResponded: Joi.string().required(),
        pageCount: Joi.number().required(),
        pageIndex: Joi.number().required(),
        pageUrl: Joi.string().required(),
        fileName: Joi.string().required(),
        documentType: Joi.string().required(),
        uploadUrl: Joi.string().required(),
        invoiceDate: Joi.string().required(),
        invoiceNumber: Joi.string().required(),
        totalAmount: Joi.string().required(),
        currency: Joi.string().required(),
        title: Joi.string().required(),
        documentName: Joi.string().required(),
        Attachments: Joi.any().optional(),
    }),
    preProcessing: Joi.object()
        .keys({
            documentId: Joi.string().required(),
            uploadUrl: Joi.string().required(),
            mimeType: Joi.string().required(),
        })
        .pattern(/./, Joi.any()),
    extraction: Joi.object()
        .keys({
            documentId: Joi.string().required(),
            tiffUrl: Joi.string().required(),
            mimeType: Joi.string().required(),
        })
        .pattern(/./, Joi.any()),

    addVendor: Joi.object()
        .keys({
            vendorId: Joi.string().required(),
            name: Joi.string().required(),
            address: Joi.string().required(),
            logo: Joi.string().required(),
            currency: Joi.string().required(),
            firstInvoiceDate: Joi.date().iso().optional().allow(""),
            lastInvoiceDate: Joi.date().iso().optional().allow(""),
            lastInvoiceSubmittedOn: Joi.date().timestamp().optional().allow(""),
            lastInvoiceProcessedOn: Joi.date().timestamp().optional().allow(""),
            avgValuePerQuarter: Joi.number().optional().allow(""),
            avgInvoicesPerQuarter: Joi.number().optional().allow(""),
        })
        .pattern(/./, Joi.any()),

    updateVendor: Joi.object()
        .keys({
            vendorId: Joi.string().required(),
            name: Joi.string().optional(),
            address: Joi.string().optional(),
            logo: Joi.string().optional(),
            currency: Joi.string().optional(),
            firstInvoiceDate: Joi.date().iso().optional().allow(""),
            lastInvoiceDate: Joi.date().iso().optional().allow(""),
            lastInvoiceSubmittedOn: Joi.date().timestamp().optional().allow(""),
            lastInvoiceProcessedOn: Joi.date().timestamp().optional().allow(""),
            avgValuePerQuarter: Joi.number().optional().allow(""),
            avgInvoicesPerQuarter: Joi.number().optional().allow(""),
        })
        .pattern(/./, Joi.any()),

    updateRPADocumentStatus: Joi.object()
        .keys({
            documentId: Joi.string().required(),
            rpaStage: Joi.string().optional(),
            status: Joi.string().optional(),
            statusMsg: Joi.string().optional(),
        })
        .pattern(/./, Joi.any()),

    addUser: Joi.object()
        .keys({
            role: Joi.string().required(),
            userName: Joi.string().required(),
            emailId: Joi.string()
                .email({
                    minDomainAtoms: 2,
                })
                .required(),
            password: Joi.string().required(),
        })
        .pattern(/./, Joi.any()),
    deleteUser: Joi.object().keys({
        userId: Joi.string(),
        emailId: Joi.string()
            // .email({
            //     minDomainAtoms: 2,
            // })
            .required(),
    }),
    getTiffInvoiceURL: Joi.object().keys({
        vendorId: Joi.string().required(),
        location: Joi.string().required(),
        mimeType: Joi.string().required(),
        pageIndex: Joi.number().required(),
    }),

    updateXmlMapping: Joi.object()
        .keys({
            xmlMapId: Joi.number().required(),
        })
        .options({ allowUnknown: true }),

    addRole: Joi.object()
        .keys({
            role: Joi.string().required(),
            token: Joi.string().required(),
            RoutesAccess: Joi.array().required()
        })
        .pattern(/./, Joi.any()),

    getRole: Joi.object()
        .keys({
            role: Joi.string().required(),
            token: Joi.string().required(),
        })
        .pattern(/./, Joi.any()),

    updateRole: Joi.object()
        .keys({
            role: Joi.string().required(),
            token: Joi.string().required(),
            RoutesAccess: Joi.array().required()
        })
        .pattern(/./, Joi.any()),

    addRawPrediction: Joi.object()
        .keys({
            documentId: Joi.string().required(),
            rawPrediction: Joi.string().required(),
            submittedOn: Joi.number().required()
        })
        .pattern(/./, Joi.any()),

    updateRawPrediction: Joi.object()
        .keys({
            documentId: Joi.string().required(),
            rawPrediction: Joi.string().required(),
            lastUpdatedOn: Joi.number().required()
        })
        .pattern(/./, Joi.any()),
};

module.exports = schemaMaster;