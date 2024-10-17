let chai = require('chai');
let chaiHttp = require('chai-http');
let rpaService = require('../services/rpaService');
let documentService = require('../services/documentService');
let sinon = require('sinon')
const expect = chai.expect
chai.use(chaiHttp)

// const HOST = 'http://106.51.226.169:9090'
const HOST = 'http://localhost:9090'
const documentId = "doc_test_id_08089789867";
describe('RPA Routing Service', () => {
    /** Update RPA Status **/
    describe('/document/rpa/status/update route', () => {
        let requestData = {
            "ver": "1.0",
            "params": {
                "msgid": ""
            },
            "request": {
                "documentId": documentId,
                "rpaStage": "RPA",
                "status": "SUCCESS",
                "statusMsg": "Successfully Completed RPA"
            }
        };
        let serviceStub = sinon.stub(rpaService, 'updateRPADocumentStatus')
        serviceStub.returns(new Promise((resolve, reject) => {
            resolve(requestData)
        }))

        it('should send SUCCESS response when valid request', (done) => {
            chai.request(HOST)
                .post('/document/rpa/status/update')
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
                .post('/document/rpa/status/update')
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
    /** GET RPA LIST **/

    describe('/document/rpa/list route', () => {
        let requestData = { "id": "api.document.rpa.list", "ver": "1.0", "params": { "msgid": "" }, "request": {} };
        let errorData = { "ver": "1.0", "params": { "msgid": "" } };
        let serviceStub = sinon.stub(rpaService, 'getRPADocumentList')
        serviceStub.returns(new Promise((resolve, reject) => {
            resolve(requestData)
        }))
        it('should send SUCCESS response when valid request', (done) => {
            chai.request(HOST)
                .post('/document/rpa/list')
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
                .post('/document/rpa/list')
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

    /** Delete RPA Document **/
    describe('/document/delete route', () => {
        let requestData = { "ver": "1.0", "ts": 1574697717, "params": { "msgid": "" }, "request": { "documentId": documentId } };
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
})

