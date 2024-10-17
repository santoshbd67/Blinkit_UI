let chai = require('chai');
let chaiHttp = require('chai-http');
const cryptoJS = require('crypto-js');
let documentService = require('../services/documentService');
let userService = require('../services/userService');
let sinon = require('sinon')
const expect = chai.expect
// chai.use(chaiHttp)
// const HOST = 'http://106.51.226.169:9090'
const HOST = 'http://localhost:9090'

const documentId = "doc_test_id_1234578";
const wrongTestDocumentId = "doc_wrong_test_id_6497";

const adminEmailId = "admin@taoautomation.com";
const adminPassword = "admin";
let token;
let wrongToken = null;
describe('Documents Routing Service', () => {
    /** USER login **/
    describe('/user/login route', function () {
        let requestData = {
            "ver": "1.0",
            "params": {
                "msgid": ""
            },
            "request": {
                "emailId": adminEmailId,
                "password": cryptoJS.MD5(adminPassword).toString()
            }
        };

        it('should send SUCCESS response when valid request', (done) => {
            chai.request(HOST)
                .post('/user/login')
                .send(requestData)
                .end((err, res) => {
                    if (res) {
                        token = res.body.result.token;
                        expect(res.body.responseCode).to.eql("OK")
                        expect(res.body.params.status).to.eql("Success")
                    }
                    done()
                });
        });

        it('should send FAILED response when valid request', (done) => {
            let failedData = requestData;
            failedData.request.emailId = null;
            chai.request(HOST)
                .post('/user/login')
                .send(failedData)
                .end((err, res) => {
                    if (res) {
                        expect(res.body.params.status).to.eql("Failed")
                        expect(res.body.responseCode).to.eql("ERROR")
                    }
                    done()
                });
        });

    });
    /** Add Document **/
    describe('/document/add route', () => {
        let requestData = {
            "ver": "1.0",
            "params": {
                "msgid": ""
            },
            "request": {
                "documentId": documentId,
                "fileName": "angular_app_structure.JPG",
                "documentType": "invoice",
                "mimeType": "image/tiff",
                "uploadUrl": "/import/1_Doc_12.TIF",
                "size": 46070,
                "status": "NEW",
                "submittedBy": "system"
            }
        };
        let serviceStub = sinon.stub(documentService, 'addDocument')
        serviceStub.returns(new Promise((resolve, reject) => {
            resolve(requestData)
        }))
        it('should send SUCCESS response when valid request', (done) => {

            chai.request(HOST)
                .post('/document/add')
                .send(requestData)
                .end((err, res) => {
                    if (res) {
                        expect(res.body.params.status).to.eql("Success")
                        expect(res.body.responseCode).to.eql("OK")

                    }
                    done()
                });
        });
        it('should send FAILED response when valid request', (done) => {

            let failedData = requestData;
            failedData.request.documentId = null;
            chai.request(HOST)
                .post('/document/add')
                .send(failedData)
                .end((err, res) => {
                    if (res) {
                        expect(res.body.params.status).to.eql("Failed")
                        expect(res.body.responseCode).to.eql("ERROR")
                    }
                    done()
                });
        });
    });
    /** Add Result Document **/
    describe('/document/result/add route', () => {
        let requestData = {
            "ver": "1.0", "params": { "msgid": "" },
            "request": { "documentId": documentId, "processingEngine": "ABBYY", "resultFile": "export/doc_1575568758431_aa899a8abbb.xml", "documentInfo": [{ "label": "PO Number", "id": "poNumber", "boundingBox": "", "correctedBy": "system", "correctedOn": 1575710791, "correctedValue": "rrrrrrr", "fieldId": "poNumber", "fieldValue": "", "pageNumber": "" }, { "label": "Invoice Number", "id": "invoiceNumber", "boundingBox": { "left": "2164", "right": "2358", "top": "466", "bottom": "495" }, "correctedBy": "system", "correctedOn": 1575710791, "correctedValue": "", "fieldId": "invoiceNumber", "fieldValue": "DGIN135024", "pageNumber": "1", "confidence": 80 }, { "label": "Invoice Date", "id": "invoiceDate", "boundingBox": { "left": "2168", "right": "2359", "top": "516", "bottom": "545" }, "correctedBy": "system", "correctedOn": 1575710791, "correctedValue": "", "fieldId": "invoiceDate", "fieldValue": "20 Dec 2017", "pageNumber": "1", "confidence": 100 }, { "label": "Vendor Name", "id": "vendorName", "boundingBox": { "left": "1688", "right": "2316", "top": "59", "bottom": "169" }, "correctedBy": "system", "correctedOn": 1575710791, "correctedValue": "", "fieldId": "vendorName", "fieldValue": "GUIDANT\nGROUP", "pageNumber": "1", "confidence": 100 }, { "label": "Vendor Address", "id": "vendorAddress", "boundingBox": { "left": "59", "right": "638", "top": "295", "bottom": "334" }, "correctedBy": "system", "correctedOn": 1575710791, "correctedValue": "", "fieldId": "vendorAddress", "fieldValue": "800 the Boulevard, Capability Green, Luton", "pageNumber": "1", "confidence": 100 }, { "label": "Vendor Pan", "id": "vendorPAN", "boundingBox": "", "correctedBy": "", "correctedOn": "", "correctedValue": "", "fieldId": "", "fieldValue": "", "pageNumber": "" }, { "label": "Vendor GSTIN", "id": "vendorGSTIN", "boundingBox": "", "correctedBy": "", "correctedOn": "", "correctedValue": "", "fieldId": "", "fieldValue": "", "pageNumber": "" }, { "label": "Vendor Email Address", "id": "vendorEmail", "boundingBox": "", "correctedBy": "", "correctedOn": "", "correctedValue": "", "fieldId": "", "fieldValue": "", "pageNumber": "" }, { "label": "Vendor Bank Name", "id": "vendorBankName", "boundingBox": "", "correctedBy": "", "correctedOn": "", "correctedValue": "", "fieldId": "", "fieldValue": "", "pageNumber": "" }, { "label": "Vendor bank SWIFT code", "id": "vendorBankSwiftCode", "boundingBox": "", "correctedBy": "", "correctedOn": "", "correctedValue": "", "fieldId": "", "fieldValue": "", "pageNumber": "" }, { "label": "Vendor bank ac No", "id": "vendorBankAccountNo", "boundingBox": "", "correctedBy": "", "correctedOn": "", "correctedValue": "", "fieldId": "", "fieldValue": "", "pageNumber": "" }, { "label": "Total Amount", "id": "totalAmount", "boundingBox": { "left": "2240", "right": "2359", "top": "1297", "bottom": "1328" }, "correctedBy": "system", "correctedOn": 1575710791, "correctedValue": "", "fieldId": "totalAmount", "fieldValue": "11253.60", "pageNumber": "1", "confidence": 87.5 }, { "label": "Bill to Address", "id": "billingAddress", "boundingBox": { "left": "59", "right": "398", "top": "418", "bottom": "696" }, "correctedBy": "system", "correctedOn": 1575710791, "correctedValue": "", "fieldId": "billingAddress", "fieldValue": "Diageo GB\nDiageo Great Britain Limited\nShared Service Centre\nPO Box 16498\nLondon\nNW10 7WP", "pageNumber": "1", "confidence": 95.5056179775281 }, { "label": "Ship To Address", "id": "shippingAddress", "boundingBox": "", "correctedBy": "", "correctedOn": "", "correctedValue": "", "fieldId": "", "fieldValue": "", "pageNumber": "" }, { "label": "Currency", "id": "currency", "boundingBox": "", "correctedBy": "", "correctedOn": "", "correctedValue": "", "fieldId": "", "fieldValue": "", "pageNumber": "" }, { "label": "Subtotal ", "id": "subTotal", "boundingBox": "", "correctedBy": "", "correctedOn": "", "correctedValue": "", "fieldId": "", "fieldValue": "", "pageNumber": "" }, { "label": "Fx Rate ", "id": "fxRate", "boundingBox": "", "correctedBy": "", "correctedOn": "", "correctedValue": "", "fieldId": "", "fieldValue": "", "pageNumber": "" }, { "label": "Item Quantity", "id": "itemQuantity", "boundingBox": "", "correctedBy": "", "correctedOn": "", "correctedValue": "", "fieldId": "", "fieldValue": "", "pageNumber": "" }, { "label": "Taxes (CGST,IGST,SGST)", "id": "taxes", "boundingBox": "", "correctedBy": "", "correctedOn": "", "correctedValue": "", "fieldId": "", "fieldValue": "", "pageNumber": "" }, { "label": "Tax Value", "id": "taxValue", "boundingBox": "", "correctedBy": "", "correctedOn": "", "correctedValue": "", "fieldId": "", "fieldValue": "", "pageNumber": "" }, { "label": "Freight Amount", "id": "freightAmount", "boundingBox": "", "correctedBy": "", "correctedOn": "", "correctedValue": "", "fieldId": "", "fieldValue": "", "pageNumber": "" }, { "label": "Discount Amount", "id": "discountAmount", "boundingBox": "", "correctedBy": "", "correctedOn": "", "correctedValue": "", "fieldId": "", "fieldValue": "", "pageNumber": "" }, { "label": "Invoice Type", "id": "invoiceType", "boundingBox": "", "correctedBy": "", "correctedOn": "", "correctedValue": "", "fieldId": "", "fieldValue": "", "pageNumber": "" }, { "label": "Invoice Language", "id": "invoiceLanguage", "boundingBox": "", "correctedBy": "", "correctedOn": "", "correctedValue": "", "fieldId": "", "fieldValue": "", "pageNumber": "" }, { "label": "Customer ID", "id": "customerId", "boundingBox": "", "correctedBy": "", "correctedOn": "", "correctedValue": "", "fieldId": "", "fieldValue": "", "pageNumber": "" }, { "label": "Customer Name", "id": "customerName", "boundingBox": "", "correctedBy": "", "correctedOn": "", "correctedValue": "", "fieldId": "", "fieldValue": "", "pageNumber": "" }, { "label": "Customer Address", "id": "customerAddress", "boundingBox": "", "correctedBy": "", "correctedOn": "", "correctedValue": "", "fieldId": "", "fieldValue": "", "pageNumber": "" }, { "label": "Sort Code", "id": "sortCode", "boundingBox": "", "correctedBy": "", "correctedOn": "", "correctedValue": "", "fieldId": "", "fieldValue": "", "pageNumber": "" }, { "label": "Constant Symbol", "id": "constantSymbol", "boundingBox": "", "correctedBy": "", "correctedOn": "", "correctedValue": "", "fieldId": "", "fieldValue": "", "pageNumber": "" }, { "label": "IBAN", "id": "IBAN", "boundingBox": "", "correctedBy": "", "correctedOn": "", "correctedValue": "", "fieldId": "", "fieldValue": "", "pageNumber": "" }, { "label": "Due Date", "id": "dueDate", "boundingBox": "", "correctedBy": "", "correctedOn": "", "correctedValue": "", "fieldId": "", "fieldValue": "", "pageNumber": "" }, { "label": "Payment Terms", "id": "paymentTerms", "boundingBox": "", "correctedBy": "", "correctedOn": "", "correctedValue": "", "fieldId": "", "fieldValue": "", "pageNumber": "" }, { "label": "Amount Rounding", "id": "amountRoundoff", "boundingBox": "", "correctedBy": "", "correctedOn": "", "correctedValue": "", "fieldId": "", "fieldValue": "", "pageNumber": "" }, { "label": "Amount Paid", "id": "amountPaid", "boundingBox": "", "correctedBy": "", "correctedOn": "", "correctedValue": "", "fieldId": "", "fieldValue": "", "pageNumber": "" }, { "label": "VAT Rate", "id": "VATRate", "boundingBox": "", "correctedBy": "", "correctedOn": "", "correctedValue": "", "fieldId": "", "fieldValue": "", "pageNumber": "" }, { "label": "VAT Base", "id": "VATBase", "boundingBox": "", "correctedBy": "", "correctedOn": "", "correctedValue": "", "fieldId": "", "fieldValue": "", "pageNumber": "" }, { "label": "VAT Amount", "id": "VATAmount", "boundingBox": "", "correctedBy": "", "correctedOn": "", "correctedValue": "", "fieldId": "", "fieldValue": "", "pageNumber": "" }, { "label": "VAT Total", "id": "VATTotal", "boundingBox": "", "correctedBy": "", "correctedOn": "", "correctedValue": "", "fieldId": "", "fieldValue": "", "pageNumber": "" }], "documentLineItems": [{ "pageNumber": "1", "rowNumber": 1, "fieldset": [{ "fieldId": "itemValue", "fieldValue": "3.126 00", "confidence": 100, "boundingBox": { "left": "1809", "right": "2022", "top": "927", "bottom": "999" }, "pageNumber": "1", "correctedBy": "system", "correctedOn": 1575620810 }, { "fieldId": "taxRate", "fieldValue": "625 20", "confidence": 100, "boundingBox": { "left": "2022", "right": "2208", "top": "927", "bottom": "999" }, "pageNumber": "1", "correctedBy": "system", "correctedOn": 1575620810 }, { "fieldId": "itemDescription", "fieldValue": "Basic", "confidence": 100, "boundingBox": { "left": "1311", "right": "1474", "top": "927", "bottom": "999" }, "pageNumber": "1", "correctedValue": "Basic info", "correctedBy": "system", "correctedOn": 1575620810 }, { "fieldId": "UOM", "fieldValue": "500", "confidence": 100, "boundingBox": { "left": "1474", "right": "1641", "top": "927", "bottom": "999" }, "pageNumber": "1", "correctedBy": "system", "correctedOn": 1575620810 }, { "fieldId": "unitPrice", "fieldValue": "62520", "confidence": 100, "boundingBox": { "left": "1641", "right": "1809", "top": "927", "bottom": "999" }, "pageNumber": "1", "correctedBy": "system", "correctedOn": 1575620810 }, { "fieldId": "totalBase", "fieldValue": "3751 20", "confidence": 100, "boundingBox": { "left": "2208", "right": "2359", "top": "927", "bottom": "999" }, "pageNumber": "1", "correctedBy": "system", "correctedOn": 1575620810 }] }, { "pageNumber": "1", "rowNumber": 2, "fieldset": [{ "fieldId": "itemValue", "fieldValue": "3.126 00", "confidence": 100, "boundingBox": { "left": "1809", "right": "2022", "top": "999", "bottom": "1072" }, "pageNumber": "1", "correctedBy": "system", "correctedOn": 1575568825 }, { "fieldId": "taxRate", "fieldValue": "625 20", "confidence": 100, "boundingBox": { "left": "2022", "right": "2208", "top": "999", "bottom": "1072" }, "pageNumber": "1", "correctedBy": "system", "correctedOn": 1575568825 }, { "fieldId": "itemDescription", "fieldValue": "Basic", "confidence": 100, "boundingBox": { "left": "1311", "right": "1474", "top": "999", "bottom": "1072" }, "pageNumber": "1", "correctedValue": "Special", "correctedBy": "system", "correctedOn": 1575568825 }, { "fieldId": "UOM", "fieldValue": "500", "confidence": 100, "boundingBox": { "left": "1474", "right": "1641", "top": "999", "bottom": "1072" }, "pageNumber": "1", "correctedBy": "system", "correctedOn": 1575568825 }, { "fieldId": "unitPrice", "fieldValue": "62520", "confidence": 100, "boundingBox": { "left": "1641", "right": "1809", "top": "999", "bottom": "1072" }, "pageNumber": "1", "correctedBy": "system", "correctedOn": 1575568825 }, { "fieldId": "totalBase", "fieldValue": "3751 20", "confidence": 100, "boundingBox": { "left": "2208", "right": "2359", "top": "999", "bottom": "1072" }, "pageNumber": "1", "correctedBy": "system", "correctedOn": 1575568825 }] }, { "pageNumber": "1", "rowNumber": 3, "fieldset": [{ "fieldId": "itemValue", "fieldValue": "3.126 00", "confidence": 100, "boundingBox": { "left": "1809", "right": "2022", "top": "1072", "bottom": "1139" }, "pageNumber": "1", "correctedBy": "system", "correctedOn": 1575568825 }, { "fieldId": "taxRate", "fieldValue": "625 20", "confidence": 100, "boundingBox": { "left": "2022", "right": "2208", "top": "1072", "bottom": "1139" }, "pageNumber": "1", "correctedBy": "system", "correctedOn": 1575568825 }, { "fieldId": "itemDescription", "fieldValue": "Basic", "confidence": 100, "boundingBox": { "left": "1311", "right": "1474", "top": "1072", "bottom": "1139" }, "pageNumber": "1", "correctedBy": "system", "correctedOn": 1575568825 }, { "fieldId": "UOM", "fieldValue": "500", "confidence": 100, "boundingBox": { "left": "1474", "right": "1641", "top": "1072", "bottom": "1139" }, "pageNumber": "1", "correctedBy": "system", "correctedOn": 1575568825 }, { "fieldId": "unitPrice", "fieldValue": "62520", "confidence": 100, "boundingBox": { "left": "1641", "right": "1809", "top": "1072", "bottom": "1139" }, "pageNumber": "1", "correctedBy": "system", "correctedOn": 1575568825 }, { "fieldId": "totalBase", "fieldValue": "3.751 20", "confidence": 100, "boundingBox": { "left": "2208", "right": "2359", "top": "1072", "bottom": "1139" }, "pageNumber": "1", "correctedBy": "system", "correctedOn": 1575568825 }] }, { "pageNumber": "1", "rowNumber": 4, "fieldset": [{ "fieldId": "itemValue", "boundingBox": { "left": "1809", "right": "2022", "top": "1139", "bottom": "1174" }, "pageNumber": "1" }, { "fieldId": "taxRate", "boundingBox": { "left": "2022", "right": "2208", "top": "1139", "bottom": "1174" }, "pageNumber": "1" }, { "fieldId": "itemDescription", "boundingBox": { "left": "1311", "right": "1474", "top": "1139", "bottom": "1174" }, "pageNumber": "1" }, { "fieldId": "UOM", "boundingBox": { "left": "1474", "right": "1641", "top": "1139", "bottom": "1174" }, "pageNumber": "1" }, { "fieldId": "unitPrice", "boundingBox": { "left": "1641", "right": "1809", "top": "1139", "bottom": "1174" }, "pageNumber": "1" }, { "fieldId": "totalBase", "boundingBox": { "left": "2208", "right": "2359", "top": "1139", "bottom": "1174" }, "pageNumber": "1" }] }] },
        };

        let serviceStub = sinon.stub(documentService, 'addResult')
        serviceStub.returns(new Promise((resolve, reject) => {
            resolve(requestData)
        }))
        it('should send SUCCESS response when valid request', (done) => {
            chai.request(HOST)
                .post('/document/result/add')
                .send(requestData)
                .end((err, res) => {
                    if (res) {
                        expect(res.body.params.status).to.eql("Success")
                        expect(res.body.responseCode).to.eql("OK")
                    }
                    done()
                })
        })
        it('should send FAILED response when valid request', (done) => {
            let failedData = requestData;
            failedData.request.documentId = null;
            chai.request(HOST)
                .post('/document/result/add')
                .send(failedData)
                .end((err, res) => {
                    if (res) {
                        expect(res.body.params.status).to.eql("Failed")
                        expect(res.body.responseCode).to.eql("ERROR")
                    }
                    done()
                })
        })
    });

    /** Get Document **/
    describe('/document/get/:id route', () => {
        let requestData = { "ver": "1.0", "params": { "msgid": "" }, "responseCode": "OK", "request": { "documentId": documentId } }
        let serviceStub = sinon.stub(documentService, 'getDocument')
        serviceStub.returns(new Promise((resolve, reject) => {
            resolve(requestData)
        }));
        it('should send SUCCESS response when valid request', (done) => {
            chai.request(HOST)
                .get('/document/get/' + documentId)
                .end((err, res) => {
                    if (res) {
                        expect(res.body.params.status).to.eql("Success")
                        expect(res.body.responseCode).to.eql("OK")

                        expect(res.body.result.document.documentId).to.eql(documentId)
                    }
                    done()
                })
        })
        it('should send ERROR response when ID does not exist', (done) => {
            chai.request(HOST)

                .get('/document/get/' + wrongTestDocumentId)
                .end((err, res) => {
                    if (res) {
                        expect(res.body.params.status).to.eql("Failed")
                        expect(res.body.responseCode).to.eql("ERROR")
                    }
                    done()
                })
        })
    })

    /** Get Result Document **/
    describe('/document/result/get/:id route', () => {
        let requestData = { "ver": "1.0", "params": { "msgid": "" }, "responseCode": "OK", "request": { "documentId": documentId } }
        let serviceStub = sinon.stub(documentService, 'getResult')
        serviceStub.returns(new Promise((resolve, reject) => {
            resolve(requestData)
        }));

        it('should send SUCCESS response when valid request', (done) => {
            chai.request(HOST)
                .get('/document/result/get/' + documentId)
                .end((err, res) => {
                    if (res) {
                        expect(res.body.params.status).to.eql("Success")
                        expect(res.body.responseCode).to.eql("OK")
                        expect(res.body.result.document.documentId).to.eql(documentId)
                    }
                    done()
                })
        })
        it('should send ERROR response when ID does not exist', (done) => {
            chai.request(HOST)
                .get('/document/result/get/' + wrongTestDocumentId)
                .end((err, res) => {
                    if (res) {
                        expect(res.body.params.status).to.eql("Failed")
                        expect(res.body.responseCode).to.eql("ERROR")
                    }
                    done()
                })
        })
    })


    /** Find Document **/
    describe('/document/find route', () => {
        it('should send SUCCESS response when valid request', (done) => {
            setTimeout(() => {
                let requestData = { "ver": "1.0", "ts": 1571813791276, "params": { "msgid": "" }, "request": { "token": token, "filter": {}, "offset": 0, "limit": 20, "page": 1 } };
                chai.request(HOST)
                    .post('/document/find')
                    .send(requestData)
                    .end((err, res) => {
                        if (res) {
                            expect(res.body.params.status).to.equal("Success")
                            expect(res.body.responseCode).to.eql("OK")
                        }
                        done()
                    })
            }, 100)
        })
        it('should send ERROR response when bad request', (done) => {
            setTimeout(() => {
                let errorData = { "ver": "1.0", "ts": 1574856294374, "params": { "msgid": "" }, "request": { "token": wrongToken, "filter": "", "offset": 0, "limit": 20, "page": 1 } };
                chai.request(HOST)
                    .post('/document/find')
                    .send(errorData)
                    .end((err, res) => {
                        if (res) {
                            expect(res.body.params.status).to.equal("Failed")
                            expect(res.body.responseCode).to.eql("ERROR")
                        }
                        done()
                    })
            }, 100)
        })
    })

    /**Find Result Document **/
    describe('/document/result/find route', () => {
        let requestData = { "ver": "1.0", "ts": 1571813791276, "params": { "msgid": "" }, "request": { "filter": {}, "offset": 0, "limit": 20, "page": 1 } };
        let errorData = { "ver": "1.0", "ts": 1574856294374, "params": { "msgid": "" }, "request": { "filter": "" } };
        let serviceStub = sinon.stub(documentService, 'findResults')
        serviceStub.returns(new Promise((resolve, reject) => {
            resolve(requestData)
        }))
        it('should send SUCCESS response when valid request', (done) => {
            chai.request(HOST)
                .post('/document/result/find')
                .send(requestData)
                .end((err, res) => {
                    if (res) {
                        expect(res.body.params.status).to.equal("Success")
                        expect(res.body.responseCode).to.eql("OK")
                    }
                    done()
                })
        })
        it('should send ERROR response when bad request', (done) => {
            chai.request(HOST)
                .post('/document/result/find')
                .send(errorData)
                .end((err, res) => {
                    if (res) {
                        expect(res.body.params.status).to.equal("Failed")
                        expect(res.body.responseCode).to.eql("ERROR")
                    }
                    done()
                })
        })
    })

    /** Update Document **/
    describe('/document/update/:id route', () => {
        let requestData = {
            "ver": "1.0",
            "params": {
                "msgid": ""
            },
            "request": {
                "documentId": documentId,
                "fileName": "angular_app_structure.JPG",
                "documentType": "invoice",
                "mimeType": "image/tiff",
                "uploadUrl": "/import/1_Doc_12.TIF",
                "size": 46070,
                "status": "NEW",
                "submittedBy": "system"
            }
        };
        let serviceStub = sinon.stub(documentService, 'updateDocument')
        serviceStub.returns(new Promise((resolve, reject) => {
            resolve(requestData)
        }))

        it('should send SUCCESS response when valid request', (done) => {
            chai.request(HOST)
                .post('/document/update/' + documentId)
                .send(requestData)
                .end((err, res) => {
                    if (res) {
                        expect(res.body.params.status).to.eql("Success")
                        expect(res.body.responseCode).to.eql("OK")
                    }
                    done()
                })
        })
        it('should send FAILED response when valid request', (done) => {
            //sending wrong documentId
            let wrongDocumentId = null;
            let failedData = requestData;
            failedData.request.documentId = wrongDocumentId;
            chai.request(HOST)
                .post('/document/update/' + wrongDocumentId)
                .send(requestData)
                .end((err, res) => {
                    if (res) {
                        expect(res.body.params.status).to.eql("Failed")
                        expect(res.body.responseCode).to.eql("ERROR")
                    }
                    done()
                })
        })

    });

    /** Update Document Result **/

    describe('/document/result/update/:id route', () => {
        let requestData = {
            "ver": "1.0", "params": { "msgid": "" },
            "request": { "documentId": documentId, "processingEngine": "ABBYY", "resultFile": "export/doc_1575568758431_aa899a8abbb.xml", "documentInfo": [{ "label": "PO Number", "id": "poNumber", "boundingBox": "", "correctedBy": "system", "correctedOn": 1575710791, "correctedValue": "rrrrrrr", "fieldId": "poNumber", "fieldValue": "", "pageNumber": "" }, { "label": "Invoice Number", "id": "invoiceNumber", "boundingBox": { "left": "2164", "right": "2358", "top": "466", "bottom": "495" }, "correctedBy": "system", "correctedOn": 1575710791, "correctedValue": "", "fieldId": "invoiceNumber", "fieldValue": "DGIN135024", "pageNumber": "1", "confidence": 80 }, { "label": "Invoice Date", "id": "invoiceDate", "boundingBox": { "left": "2168", "right": "2359", "top": "516", "bottom": "545" }, "correctedBy": "system", "correctedOn": 1575710791, "correctedValue": "", "fieldId": "invoiceDate", "fieldValue": "20 Dec 2017", "pageNumber": "1", "confidence": 100 }, { "label": "Vendor Name", "id": "vendorName", "boundingBox": { "left": "1688", "right": "2316", "top": "59", "bottom": "169" }, "correctedBy": "system", "correctedOn": 1575710791, "correctedValue": "", "fieldId": "vendorName", "fieldValue": "GUIDANT\nGROUP", "pageNumber": "1", "confidence": 100 }, { "label": "Vendor Address", "id": "vendorAddress", "boundingBox": { "left": "59", "right": "638", "top": "295", "bottom": "334" }, "correctedBy": "system", "correctedOn": 1575710791, "correctedValue": "", "fieldId": "vendorAddress", "fieldValue": "800 the Boulevard, Capability Green, Luton", "pageNumber": "1", "confidence": 100 }, { "label": "Vendor Pan", "id": "vendorPAN", "boundingBox": "", "correctedBy": "", "correctedOn": "", "correctedValue": "", "fieldId": "", "fieldValue": "", "pageNumber": "" }, { "label": "Vendor GSTIN", "id": "vendorGSTIN", "boundingBox": "", "correctedBy": "", "correctedOn": "", "correctedValue": "", "fieldId": "", "fieldValue": "", "pageNumber": "" }, { "label": "Vendor Email Address", "id": "vendorEmail", "boundingBox": "", "correctedBy": "", "correctedOn": "", "correctedValue": "", "fieldId": "", "fieldValue": "", "pageNumber": "" }, { "label": "Vendor Bank Name", "id": "vendorBankName", "boundingBox": "", "correctedBy": "", "correctedOn": "", "correctedValue": "", "fieldId": "", "fieldValue": "", "pageNumber": "" }, { "label": "Vendor bank SWIFT code", "id": "vendorBankSwiftCode", "boundingBox": "", "correctedBy": "", "correctedOn": "", "correctedValue": "", "fieldId": "", "fieldValue": "", "pageNumber": "" }, { "label": "Vendor bank ac No", "id": "vendorBankAccountNo", "boundingBox": "", "correctedBy": "", "correctedOn": "", "correctedValue": "", "fieldId": "", "fieldValue": "", "pageNumber": "" }, { "label": "Total Amount", "id": "totalAmount", "boundingBox": { "left": "2240", "right": "2359", "top": "1297", "bottom": "1328" }, "correctedBy": "system", "correctedOn": 1575710791, "correctedValue": "", "fieldId": "totalAmount", "fieldValue": "11253.60", "pageNumber": "1", "confidence": 87.5 }, { "label": "Bill to Address", "id": "billingAddress", "boundingBox": { "left": "59", "right": "398", "top": "418", "bottom": "696" }, "correctedBy": "system", "correctedOn": 1575710791, "correctedValue": "", "fieldId": "billingAddress", "fieldValue": "Diageo GB\nDiageo Great Britain Limited\nShared Service Centre\nPO Box 16498\nLondon\nNW10 7WP", "pageNumber": "1", "confidence": 95.5056179775281 }, { "label": "Ship To Address", "id": "shippingAddress", "boundingBox": "", "correctedBy": "", "correctedOn": "", "correctedValue": "", "fieldId": "", "fieldValue": "", "pageNumber": "" }, { "label": "Currency", "id": "currency", "boundingBox": "", "correctedBy": "", "correctedOn": "", "correctedValue": "", "fieldId": "", "fieldValue": "", "pageNumber": "" }, { "label": "Subtotal ", "id": "subTotal", "boundingBox": "", "correctedBy": "", "correctedOn": "", "correctedValue": "", "fieldId": "", "fieldValue": "", "pageNumber": "" }, { "label": "Fx Rate ", "id": "fxRate", "boundingBox": "", "correctedBy": "", "correctedOn": "", "correctedValue": "", "fieldId": "", "fieldValue": "", "pageNumber": "" }, { "label": "Item Quantity", "id": "itemQuantity", "boundingBox": "", "correctedBy": "", "correctedOn": "", "correctedValue": "", "fieldId": "", "fieldValue": "", "pageNumber": "" }, { "label": "Taxes (CGST,IGST,SGST)", "id": "taxes", "boundingBox": "", "correctedBy": "", "correctedOn": "", "correctedValue": "", "fieldId": "", "fieldValue": "", "pageNumber": "" }, { "label": "Tax Value", "id": "taxValue", "boundingBox": "", "correctedBy": "", "correctedOn": "", "correctedValue": "", "fieldId": "", "fieldValue": "", "pageNumber": "" }, { "label": "Freight Amount", "id": "freightAmount", "boundingBox": "", "correctedBy": "", "correctedOn": "", "correctedValue": "", "fieldId": "", "fieldValue": "", "pageNumber": "" }, { "label": "Discount Amount", "id": "discountAmount", "boundingBox": "", "correctedBy": "", "correctedOn": "", "correctedValue": "", "fieldId": "", "fieldValue": "", "pageNumber": "" }, { "label": "Invoice Type", "id": "invoiceType", "boundingBox": "", "correctedBy": "", "correctedOn": "", "correctedValue": "", "fieldId": "", "fieldValue": "", "pageNumber": "" }, { "label": "Invoice Language", "id": "invoiceLanguage", "boundingBox": "", "correctedBy": "", "correctedOn": "", "correctedValue": "", "fieldId": "", "fieldValue": "", "pageNumber": "" }, { "label": "Customer ID", "id": "customerId", "boundingBox": "", "correctedBy": "", "correctedOn": "", "correctedValue": "", "fieldId": "", "fieldValue": "", "pageNumber": "" }, { "label": "Customer Name", "id": "customerName", "boundingBox": "", "correctedBy": "", "correctedOn": "", "correctedValue": "", "fieldId": "", "fieldValue": "", "pageNumber": "" }, { "label": "Customer Address", "id": "customerAddress", "boundingBox": "", "correctedBy": "", "correctedOn": "", "correctedValue": "", "fieldId": "", "fieldValue": "", "pageNumber": "" }, { "label": "Sort Code", "id": "sortCode", "boundingBox": "", "correctedBy": "", "correctedOn": "", "correctedValue": "", "fieldId": "", "fieldValue": "", "pageNumber": "" }, { "label": "Constant Symbol", "id": "constantSymbol", "boundingBox": "", "correctedBy": "", "correctedOn": "", "correctedValue": "", "fieldId": "", "fieldValue": "", "pageNumber": "" }, { "label": "IBAN", "id": "IBAN", "boundingBox": "", "correctedBy": "", "correctedOn": "", "correctedValue": "", "fieldId": "", "fieldValue": "", "pageNumber": "" }, { "label": "Due Date", "id": "dueDate", "boundingBox": "", "correctedBy": "", "correctedOn": "", "correctedValue": "", "fieldId": "", "fieldValue": "", "pageNumber": "" }, { "label": "Payment Terms", "id": "paymentTerms", "boundingBox": "", "correctedBy": "", "correctedOn": "", "correctedValue": "", "fieldId": "", "fieldValue": "", "pageNumber": "" }, { "label": "Amount Rounding", "id": "amountRoundoff", "boundingBox": "", "correctedBy": "", "correctedOn": "", "correctedValue": "", "fieldId": "", "fieldValue": "", "pageNumber": "" }, { "label": "Amount Paid", "id": "amountPaid", "boundingBox": "", "correctedBy": "", "correctedOn": "", "correctedValue": "", "fieldId": "", "fieldValue": "", "pageNumber": "" }, { "label": "VAT Rate", "id": "VATRate", "boundingBox": "", "correctedBy": "", "correctedOn": "", "correctedValue": "", "fieldId": "", "fieldValue": "", "pageNumber": "" }, { "label": "VAT Base", "id": "VATBase", "boundingBox": "", "correctedBy": "", "correctedOn": "", "correctedValue": "", "fieldId": "", "fieldValue": "", "pageNumber": "" }, { "label": "VAT Amount", "id": "VATAmount", "boundingBox": "", "correctedBy": "", "correctedOn": "", "correctedValue": "", "fieldId": "", "fieldValue": "", "pageNumber": "" }, { "label": "VAT Total", "id": "VATTotal", "boundingBox": "", "correctedBy": "", "correctedOn": "", "correctedValue": "", "fieldId": "", "fieldValue": "", "pageNumber": "" }], "documentLineItems": [{ "pageNumber": "1", "rowNumber": 1, "fieldset": [{ "fieldId": "itemValue", "fieldValue": "3.126 00", "confidence": 100, "boundingBox": { "left": "1809", "right": "2022", "top": "927", "bottom": "999" }, "pageNumber": "1", "correctedBy": "system", "correctedOn": 1575620810 }, { "fieldId": "taxRate", "fieldValue": "625 20", "confidence": 100, "boundingBox": { "left": "2022", "right": "2208", "top": "927", "bottom": "999" }, "pageNumber": "1", "correctedBy": "system", "correctedOn": 1575620810 }, { "fieldId": "itemDescription", "fieldValue": "Basic", "confidence": 100, "boundingBox": { "left": "1311", "right": "1474", "top": "927", "bottom": "999" }, "pageNumber": "1", "correctedValue": "Basic info", "correctedBy": "system", "correctedOn": 1575620810 }, { "fieldId": "UOM", "fieldValue": "500", "confidence": 100, "boundingBox": { "left": "1474", "right": "1641", "top": "927", "bottom": "999" }, "pageNumber": "1", "correctedBy": "system", "correctedOn": 1575620810 }, { "fieldId": "unitPrice", "fieldValue": "62520", "confidence": 100, "boundingBox": { "left": "1641", "right": "1809", "top": "927", "bottom": "999" }, "pageNumber": "1", "correctedBy": "system", "correctedOn": 1575620810 }, { "fieldId": "totalBase", "fieldValue": "3751 20", "confidence": 100, "boundingBox": { "left": "2208", "right": "2359", "top": "927", "bottom": "999" }, "pageNumber": "1", "correctedBy": "system", "correctedOn": 1575620810 }] }, { "pageNumber": "1", "rowNumber": 2, "fieldset": [{ "fieldId": "itemValue", "fieldValue": "3.126 00", "confidence": 100, "boundingBox": { "left": "1809", "right": "2022", "top": "999", "bottom": "1072" }, "pageNumber": "1", "correctedBy": "system", "correctedOn": 1575568825 }, { "fieldId": "taxRate", "fieldValue": "625 20", "confidence": 100, "boundingBox": { "left": "2022", "right": "2208", "top": "999", "bottom": "1072" }, "pageNumber": "1", "correctedBy": "system", "correctedOn": 1575568825 }, { "fieldId": "itemDescription", "fieldValue": "Basic", "confidence": 100, "boundingBox": { "left": "1311", "right": "1474", "top": "999", "bottom": "1072" }, "pageNumber": "1", "correctedValue": "Special", "correctedBy": "system", "correctedOn": 1575568825 }, { "fieldId": "UOM", "fieldValue": "500", "confidence": 100, "boundingBox": { "left": "1474", "right": "1641", "top": "999", "bottom": "1072" }, "pageNumber": "1", "correctedBy": "system", "correctedOn": 1575568825 }, { "fieldId": "unitPrice", "fieldValue": "62520", "confidence": 100, "boundingBox": { "left": "1641", "right": "1809", "top": "999", "bottom": "1072" }, "pageNumber": "1", "correctedBy": "system", "correctedOn": 1575568825 }, { "fieldId": "totalBase", "fieldValue": "3751 20", "confidence": 100, "boundingBox": { "left": "2208", "right": "2359", "top": "999", "bottom": "1072" }, "pageNumber": "1", "correctedBy": "system", "correctedOn": 1575568825 }] }, { "pageNumber": "1", "rowNumber": 3, "fieldset": [{ "fieldId": "itemValue", "fieldValue": "3.126 00", "confidence": 100, "boundingBox": { "left": "1809", "right": "2022", "top": "1072", "bottom": "1139" }, "pageNumber": "1", "correctedBy": "system", "correctedOn": 1575568825 }, { "fieldId": "taxRate", "fieldValue": "625 20", "confidence": 100, "boundingBox": { "left": "2022", "right": "2208", "top": "1072", "bottom": "1139" }, "pageNumber": "1", "correctedBy": "system", "correctedOn": 1575568825 }, { "fieldId": "itemDescription", "fieldValue": "Basic", "confidence": 100, "boundingBox": { "left": "1311", "right": "1474", "top": "1072", "bottom": "1139" }, "pageNumber": "1", "correctedBy": "system", "correctedOn": 1575568825 }, { "fieldId": "UOM", "fieldValue": "500", "confidence": 100, "boundingBox": { "left": "1474", "right": "1641", "top": "1072", "bottom": "1139" }, "pageNumber": "1", "correctedBy": "system", "correctedOn": 1575568825 }, { "fieldId": "unitPrice", "fieldValue": "62520", "confidence": 100, "boundingBox": { "left": "1641", "right": "1809", "top": "1072", "bottom": "1139" }, "pageNumber": "1", "correctedBy": "system", "correctedOn": 1575568825 }, { "fieldId": "totalBase", "fieldValue": "3.751 20", "confidence": 100, "boundingBox": { "left": "2208", "right": "2359", "top": "1072", "bottom": "1139" }, "pageNumber": "1", "correctedBy": "system", "correctedOn": 1575568825 }] }, { "pageNumber": "1", "rowNumber": 4, "fieldset": [{ "fieldId": "itemValue", "boundingBox": { "left": "1809", "right": "2022", "top": "1139", "bottom": "1174" }, "pageNumber": "1" }, { "fieldId": "taxRate", "boundingBox": { "left": "2022", "right": "2208", "top": "1139", "bottom": "1174" }, "pageNumber": "1" }, { "fieldId": "itemDescription", "boundingBox": { "left": "1311", "right": "1474", "top": "1139", "bottom": "1174" }, "pageNumber": "1" }, { "fieldId": "UOM", "boundingBox": { "left": "1474", "right": "1641", "top": "1139", "bottom": "1174" }, "pageNumber": "1" }, { "fieldId": "unitPrice", "boundingBox": { "left": "1641", "right": "1809", "top": "1139", "bottom": "1174" }, "pageNumber": "1" }, { "fieldId": "totalBase", "boundingBox": { "left": "2208", "right": "2359", "top": "1139", "bottom": "1174" }, "pageNumber": "1" }] }] },
        };
        let serviceStub = sinon.stub(documentService, 'updateResult')
        serviceStub.returns(new Promise((resolve, reject) => {
            resolve(requestData)
        }))

        it('should send SUCCESS response when valid request', (done) => {
            chai.request(HOST)
                .post('/document/result/update/' + documentId)
                .send(requestData)
                .end((err, res) => {
                    if (res) {


                        expect(res.body.params.status).to.eql("Success")
                        expect(res.body.responseCode).to.eql("OK")
                    }
                    done()
                })
        })
        it('should send FAILED response when valid request', (done) => {
            let wrongDocumentId = null;
            let failedData = requestData;
            failedData.request.documentId = wrongDocumentId;
            chai.request(HOST)
                .post('/document/result/update/' + wrongDocumentId)
                .send(requestData)
                .end((err, res) => {
                    if (res) {
                        expect(res.body.params.status).to.eql("Failed")
                        expect(res.body.responseCode).to.eql("ERROR")
                    }
                    done()
                })
        })
    });

    /**Document Search **/
    describe('/document/search route', () => {

        it('should send SUCCESS response when valid request', (done) => {
            setTimeout(() => {
                let requestData = { "id": "api.document.search", "ver": "1.0", "params": { "msgid": "" }, "request": { "token": token, "filter": { "searchKey": documentId }, "offset": 0, "limit": 10, "page": 1 } }
                chai.request(HOST)
                    .post('/document/search')
                    .send(requestData)
                    .end((err, res) => {
                        if (res) {
                            expect(res.body.params.status).to.equal("Success")
                            expect(res.body.responseCode).to.eql("OK")
                        }
                        done()
                    })
            }, 100)
        })
        it('should send ERROR response when bad request', (done) => {
            setTimeout(() => {
                let errorData = {
                    "id": "api.document.search",
                    "ver": "1.0",
                    "params": {
                        "msgid": ""
                    },
                    "request": {
                        "token": wrongToken,
                        "filter": {
                            "searchKey": documentId
                        },
                        "offset": 0,
                        "limit": 3,
                        "page": 1
                    }
                }
                chai.request(HOST)
                    .post('/document/search')
                    .send(errorData)
                    .end((err, res) => {
                        if (res) {
                            expect(res.body.params.status).to.equal("Failed")
                            expect(res.body.responseCode).to.eql("ERROR")
                        }
                        done()
                    })
            }, 100)
        })
    })

    /** Delete Document **/
    describe('/document/delete route', () => {
        let requestData = { "ver": "1.0", "ts": 1574697717, "params": { "msgid": "" }, "request": { "documentId": documentId } };
        let serviceStub = sinon.stub(documentService, 'deleteDocument')
        serviceStub.returns(new Promise((resolve, reject) => {
            resolve(requestData)
        }))

        it('should send SUCCESS response when valid request', (done) => {
            chai.request(HOST)
                .post('/document/delete')
                .send(requestData)
                .end((err, res) => {
                    if (res) {
                        expect(res.body.params.status).to.eql("Success")
                        expect(res.body.responseCode).to.eql("OK")

                    }
                    done()
                })
        })

        it('should send FAILED response when valid request', (done) => {
            let failedData = requestData;
            failedData.request.documentId = null;
            chai.request(HOST)
                .post('/document/delete')
                .send(failedData)
                .end((err, res) => {
                    if (res) {
                        expect(res.body.params.status).to.eql("Failed")
                        expect(res.body.responseCode).to.eql("ERROR")
                    }
                    done()
                })
        })
    });

    /* Document Stats */
    describe('document/stats/read', () => {
        let serviceStub = sinon.stub(documentService, 'getDocumentStats')
        serviceStub.returns(new Promise((resolve, reject) => {
            resolve()
        }))

        it('should send SUCCESS response when valid request', (done) => {
            chai.request(HOST)
                .get('/document/stats/read')
                .end((err, res) => {
                    if (res) {

                        expect(res.body.params.status).to.eql("Success")
                        expect(res.body.responseCode).to.eql("OK")
                    }
                    done()
                })
        });

    });

    /** User Logout**/
    describe('/user/logout route', () => {
        it('should send SUCCESS response when valid request', (done) => {
            setTimeout(() => {
                let requestData = {
                    "ver": "1.0",
                    "params": { "msgid": "" },
                    "request": { "emailId": adminEmailId, "token": token }
                };

                chai.request(HOST)
                    .post('/user/logout')
                    .send(requestData)
                    .end((err, res) => {
                        if (res) {
                            expect(res.body.params.status).to.equal("Success")
                            expect(res.body.responseCode).to.eql("OK")
                        }
                        done()
                    })
            }, 100)
        })
        it('should send ERROR response when bad request', (done) => {
            setTimeout(() => {
                let errorData = { "ver": "1.0", "params": { "msgid": "" }, "request": { "emailId": adminEmailId, "token": wrongToken } };
                chai.request(HOST)
                    .post('/user/logout')
                    .send(errorData)
                    .end((err, res) => {
                        if (res) {
                            expect(res.body.params.status).to.equal("Failed")
                            expect(res.body.responseCode).to.eql("ERROR")
                        }
                        done()
                    })
            }, 100)
        })
    })
})
