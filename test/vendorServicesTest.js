let chai = require('chai');
let chaiHttp = require('chai-http');
const cryptoJS = require('crypto-js');
let userService = require('../services/userService');
let vendorService = require('../services/vendorService');
let sinon = require('sinon')
const expect = chai.expect
chai.use(chaiHttp)

// const HOST = 'http://106.51.226.169:9090'
const HOST = 'http://localhost:9090'

const vendorId = "101";
const wrongVendorId = null;
const emailId = "admin@taoautomation.com";
const password = "admin";
let token;
let wrongToken = null;
describe('Vendor Routing Service', () => {

    /** USER login **/
    describe('/user/login route', function () {
        let requestData = {
            "ver": "1.0",
            "params": {
                "msgid": ""
            },
            "request": {
                "emailId": emailId,
                "password": cryptoJS.MD5(password).toString()
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
    /** Add Vendor **/
    describe('/vendor/add route', () => {
        let requestData = {
            "ver": "1.0",
            "params": {
                "msgid": ""
            },
            "request": {
                "vendorId": vendorId,
                "name": "TEST",
                "address": "2111 Lakeshrore Rd. W. Mississauga, ON L5J 1J9",
                "logo": "https://tapp2data.blob.core.windows.net/assets/john-grant-haulage.png",
                "currency": "USD",
                "firstInvoiceDate": "",
                "lastInvoiceDate": "",
                "lastInvoiceSubmittedOn": "",
                "lastInvoiceProcessedOn": "",
                "avgValuePerQuarter": "",
                "avgInvoicesPerQuarter": ""
            }
        };

        let serviceStub = sinon.stub(vendorService, 'addVendor')
        serviceStub.returns(new Promise((resolve, reject) => {
            resolve(requestData)
        }))

        it('should send SUCCESS response when valid request', (done) => {
            chai.request(HOST)
                .post('/vendor/add')
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
            failedData.request.vendorId = null;
            chai.request(HOST)
                .post('/vendor/add')
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

    /** GET Vendor LIST **/

    describe('/vendor/list route', () => {

        it('should send SUCCESS response when valid request', (done) => {
            let requestData = { "id": "api.vendor.list", "ver": "1.0", "params": { "msgid": "" }, "request": { "token": token, "filter": {}, "offset": 0, "limit": 10, "page": 1 } };
            chai.request(HOST)
                .post('/vendor/list')
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
            let errorData = { "ver": "1.0", "params": { "msgid": "" }, "request": { "filter": {}, "offset": 0, "limit": 10, "page": 1 } };
            chai.request(HOST)
                .post('/vendor/list')
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

    /**GET Vendor By Id**/

    describe('/vendor/get/:id route', () => {
        let requestData = { "ver": "1.0", "params": { "msgid": "" }, "request": { "vendorId": vendorId } }
        let serviceStub = sinon.stub(vendorService, 'getVendorById')
        serviceStub.returns(new Promise((resolve, reject) => {
            resolve(requestData)
        }));

        it('should send SUCCESS response when valid request', (done) => {
            chai.request(HOST)
                .get('/vendor/get/' + vendorId)
                .end((err, res) => {
                    if (res) {
                        expect(res.body.params.status).to.eql("Success")
                        expect(res.body.responseCode).to.eql("OK")
                    }
                    done()
                })
        })
        it('should send ERROR response when ID does not exist', (done) => {
            chai.request(HOST)
                .get('/vendor/get/' + wrongVendorId)
                .end((err, res) => {
                    if (res) {
                        expect(res.body.params.status).to.eql("Failed")
                        expect(res.body.responseCode).to.eql("ERROR")
                    }
                    done()
                })
        })
    })

    /** Update Vendor **/

    describe('/vendor/update/:id route', () => {
        let requestData = {
            "ver": "1.0",
            "params": {
                "msgid": ""
            },
            "request": {
                "vendorId": vendorId,
                "name": "TEST John Grant Haulage Ltd.",
                "address": "2111 Lakeshrore Rd. W. Mississauga, ON L5J 1J9",
                "logo": "https://tapp2data.blob.core.windows.net/assets/john-grant-haulage.png",
                "currency": "USD",
                "firstInvoiceDate": "",
                "lastInvoiceDate": "",
                "lastInvoiceSubmittedOn": "",
                "lastInvoiceProcessedOn": "",
                "avgValuePerQuarter": "",
                "avgInvoicesPerQuarter": ""
            }
        };
        let serviceStub = sinon.stub(vendorService, 'updateVendor')
        serviceStub.returns(new Promise((resolve, reject) => {
            resolve(requestData)
        }))

        it('should send SUCCESS response when valid request', (done) => {
            chai.request(HOST)
                .post('/vendor/update/' + vendorId)
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
            let wrongVendorId = null;
            let failedData = requestData;
            failedData.request.vendorId = wrongVendorId;
            chai.request(HOST)
                .post('/vendor/update/' + wrongVendorId)
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

    /** Delete Vendor **/

    describe('/vendor/delete route', () => {
        let requestData = { "ver": "1.0", "ts": 1571813791276, "params": { "msgid": "" }, "request": { "vendorId": vendorId } };
        let errorData = { "ver": "1.0", "ts": 1571813791276, "params": { "msgid": "" } }
        let serviceStub = sinon.stub(vendorService, 'deleteVendor')
        serviceStub.returns(new Promise((resolve, reject) => {
            resolve(requestData)
        }))

        it('should send SUCCESS response when valid request', (done) => {
            chai.request(HOST)
                .post('/vendor/delete')
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
            chai.request(HOST)
                .post('/vendor/delete')
                .send(errorData)
                .end((err, res) => {
                    if (res) {
                        expect(res.body.params.status).to.eql("Failed")
                        expect(res.body.responseCode).to.eql("ERROR")
                    }
                    done()
                })
        })

    });
    /** User Logout**/
    describe('/user/logout route', () => {
        it('should send SUCCESS response when valid request', (done) => {
            setTimeout(() => {
                let requestData = {
                    "ver": "1.0",
                    "params": { "msgid": "" },
                    "request": { "emailId": emailId, "token": token }
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
                let errorData = { "ver": "1.0", "params": { "msgid": "" }, "request": { "emailId": emailId, "token": wrongToken } };
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