let chai = require('chai');
let chaiHttp = require('chai-http');
const cryptoJS = require('crypto-js');
let userService = require('../services/userService');
let sinon = require('sinon')
const expect = chai.expect
chai.use(chaiHttp)

// const HOST = 'http://106.51.226.169:9090'
const HOST = 'http://localhost:9090'

const adminEmailId = "admin@taoautomation.com";
const adminPassword = "admin";
let token;
let userId;
let emailId;
let wronguserId = null;
let wrongToken = null;
let vendorMappingUserId = 4;
describe('User Routing Service', () => {

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

        let serviceStub = sinon.stub(userService, 'userLogin')
        serviceStub.returns(new Promise((resolve, reject) => {
            resolve(requestData)
        }))

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

    /** Validate Token **/
    describe('/user/verifyToken route', function () {

        it('should send SUCCESS response when valid request', (done) => {
            setTimeout(() => {
                let requestData = {
                    "ver": "1.0",
                    "params": {
                        "msgid": ""
                    },
                    "request": {
                        "token": token
                    }
                };
                chai.request(HOST)
                    .post('/user/verifyToken')
                    .send(requestData)
                    .end((err, res) => {
                        if (res) {
                            expect(res.body.responseCode).to.eql("OK")
                            expect(res.body.params.status).to.eql("Success")
                        }
                        done()
                    });
            }, 100)
        });
        it('should send FAILED response when valid request', (done) => {
            setTimeout(() => {
                let requestData = {
                    "ver": "1.0",
                    "params": {
                        "msgid": ""
                    },
                    "request": {
                        "token": token
                    }
                };
                let failedData = requestData;
                failedData.request.token = null;
                chai.request(HOST)
                    .post('/user/verifyToken')
                    .send(failedData)
                    .end((err, res) => {
                        if (res) {
                            expect(res.body.params.status).to.eql("Failed")
                            expect(res.body.responseCode).to.eql("ERROR")
                        }
                        done()
                    });
            }, 100);
        })
    });

    /** Add User **/
    describe('/user/add route', () => {
        it('should send SUCCESS response when valid request', (done) => {
            setTimeout(() => {
                let requestData = {
                    "ver": "1.0",
                    "params": {
                        "msgid": ""
                    },
                    "request": {
                        "token": token,
                        "user": {
                            "role": "viewer",
                            "userName": "user101",
                            "emailId": "user101@abc.com",
                            "password": "user"
                        }
                    }
                };
                chai.request(HOST)
                    .post('/user/add')
                    .send(requestData)
                    .end((err, res) => {
                        if (res) {
                            userId = res.body.result.userId;
                            expect(res.body.params.status).to.eql("Success")
                            expect(res.body.responseCode).to.eql("OK")
                        }
                        done()
                    });
            }, 100)
        });
        it('should send FAILED response when valid request', (done) => {
            setTimeout(() => {
                let requestData = {
                    "ver": "1.0",
                    "params": {
                        "msgid": ""
                    },
                    "request": {
                        "token": token,
                        "user": {
                            "role": "viewer",
                            "userName": "user101",
                            "emailId": "user101@abc.com",
                            "password": "user"
                        }
                    }
                };
                let failedData = requestData;
                failedData.request.token = null;
                chai.request(HOST)
                    .post('/user/add')
                    .send(failedData)
                    .end((err, res) => {
                        if (res) {

                            expect(res.body.params.status).to.eql("Failed")
                            expect(res.body.responseCode).to.eql("ERROR")
                        }
                        done()
                    });
            }, 100);
        });
    });

    /** Update User Details **/
    describe('/user/update route', () => {
        it('should send SUCCESS response when valid request', (done) => {
            setTimeout(() => {
                let requestData = {
                    "ver": "1.0",
                    "params": {
                        "msgid": ""
                    },
                    "request": {
                        "token": token,
                        "user": {
                            "userId": userId,
                            "role": "viewer",
                            "userName": "user",
                            "emailId": "user101@abc.com",
                            "password": cryptoJS.MD5("user").toString()
                        }
                    }
                }
                chai.request(HOST)
                    .post('/user/update')
                    .send(requestData)
                    .end((err, res) => {
                        if (res) {

                            expect(res.body.params.status).to.eql("Success")
                            expect(res.body.responseCode).to.eql("OK")
                        }
                        done()
                    });
            }, 100)
        });
        it('should send FAILED response when valid request', (done) => {
            setTimeout(() => {

                let requestData = {
                    "ver": "1.0",
                    "params": {
                        "msgid": ""
                    },
                    "request": {
                        "token": token,
                        "user": {
                            "userId": userId,
                            "role": "viewer",
                            "userName": "user",
                            "emailId": "user101@abc.com",
                            "password": cryptoJS.MD5("user").toString()
                        }
                    }
                }
                let failedData = requestData;
                failedData.request.token = null;
                chai.request(HOST)
                    .post('/user/update')
                    .send(failedData)
                    .end((err, res) => {
                        if (res) {
                            expect(res.body.params.status).to.eql("Failed")
                            expect(res.body.responseCode).to.eql("ERROR")
                        }
                        done()
                    });
            }, 100);
        })
    });

    /** GET User Details **/

    describe('/user/get route', () => {
        let requestData = { "ver": "1.0", "params": { "msgid": "" }, "request": { "userId": userId } }
        let serviceStub = sinon.stub(userService, 'getUserDetails')
        serviceStub.returns(new Promise((resolve, reject) => {
            resolve(requestData)
        }));

        it('should send SUCCESS response when valid request', (done) => {
            chai.request(HOST)
                .get('/user/get?userId=' + userId)
                .end((err, res) => {
                    if (res) {

                        emailId = res.body.result.emailId;
                        expect(res.body.params.status).to.eql("Success")
                        expect(res.body.responseCode).to.eql("OK")
                    }
                    done()
                })
        })
        it('should send ERROR response when ID does not exist', (done) => {
            chai.request(HOST)
                .get('/user/get?userId=' + wronguserId)
                .end((err, res) => {
                    if (res) {
                        expect(res.body.params.status).to.eql("Failed")
                        expect(res.body.responseCode).to.eql("ERROR")
                    }
                    done()
                })
        })
    })

    /** GET USER LIST **/
    describe('/get/user/list route', () => {
        it('should send SUCCESS response when valid request', (done) => {
            setTimeout(() => {
                let requestData = { "ver": "1.0", "params": { "msgid": "" }, "request": { "token": token, "filter": {} } };
                chai.request(HOST)
                    .post('/get/user/list')
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
                let errorData = { "ver": "1.0", "params": { "msgid": "" }, "request": {} };
                chai.request(HOST)
                    .post('/get/user/list')
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

    /** Change Password **/
    describe('/user/changePassword route', () => {
        it('should send SUCCESS response when valid request', (done) => {
            setTimeout(() => {
                let requestData = {
                    "ver": "1.0",
                    "params": {
                        "msgid": ""
                    },
                    "request": {
                        "token": token,
                        "user": {
                            "emailId": emailId,
                            "password": cryptoJS.MD5("alexa").toString()
                        }
                    }
                };
                chai.request(HOST)
                    .post('/user/changePassword')
                    .send(requestData)
                    .end((err, res) => {
                        if (res) {
                            expect(res.body.params.status).to.eql("Success")
                            expect(res.body.responseCode).to.eql("OK")
                        }
                        done()
                    });
            }, 100)
        });
        it('should send FAILED response when valid request', () => {
            setTimeout(() => {

                let requestData = {
                    "ver": "1.0",
                    "params": {
                        "msgid": ""
                    },
                    "request": {
                        "token": token,
                        "user": {
                            "emailId": emailId,
                            "password": cryptoJS.MD5("alexa").toString()
                        }
                    }
                };
                let failedData = requestData;
                failedData.request.token = null;
                chai.request(HOST)
                    .post('/user/changePassword')
                    .send(failedData)
                    .end((err, res) => {
                        if (res) {
                            expect(res.body.params.status).to.eql("Failed")
                            expect(res.body.responseCode).to.eql("ERROR")
                        }
                    });
            }, 100);
        })
    });

    /** GET Vendor Mapping **/

    describe('/user/vendorMapping/get route', () => {
        it('should send SUCCESS response when valid request', (done) => {
            chai.request(HOST)
                .get('/user/vendorMapping/get?userId=' + vendorMappingUserId)
                .end((err, res) => {
                    if (res) {

                        expect(res.body.params.status).to.eql("Success")
                        expect(res.body.responseCode).to.eql("OK")
                    }
                    done()
                })
        });
        it('should send FAILED response when valid request', (done) => {
            chai.request(HOST)
                .get('/user/vendorMapping/get')
                .end((err, res) => {
                    if (res) {
                        expect(res.body.params.status).to.eql("Failed")
                        expect(res.body.responseCode).to.eql("ERROR")
                    }
                    done()
                })
        })
    });

    /** UPDATE Vendor Mapping  **/
    describe('/user/vendorMapping/update route', () => {
        it('should send SUCCESS response when valid request', (done) => {
            setTimeout(() => {
                let requestData = {
                    "id": "api.user.map",
                    "ver": "1.0",
                    "params": {
                        "msgid": ""
                    },
                    "request": {
                        "token": token,
                        "map": {
                            "vendors": ["2", "6"],
                            "userId": vendorMappingUserId,
                            "lastUpdatedBy": "1"
                        }
                    }
                }
                chai.request(HOST)
                    .post('/user/vendorMapping/update')
                    .send(requestData)
                    .end((err, res) => {
                        if (res) {

                            expect(res.body.params.status).to.eql("Success")
                            expect(res.body.responseCode).to.eql("OK")
                        }
                        done()
                    });
            }, 100)
        });
        it('should send FAILED response when valid request', (done) => {
            setTimeout(() => {
                let requestData = {
                    "id": "api.user.map",
                    "ver": "1.0",
                    "params": {
                        "msgid": ""
                    },
                    "request": {
                        "token": token,
                        "map": {
                            "vendors": ["2", "6"],
                            "userId": vendorMappingUserId,
                            "lastUpdatedBy": "1"
                        }
                    }
                }
                let failedData = requestData;
                failedData.request.token = null;
                chai.request(HOST)
                    .post('/user/vendorMapping/update')
                    .send(failedData)
                    .end((err, res) => {
                        if (res) {

                            expect(res.body.params.status).to.eql("Failed")
                            expect(res.body.responseCode).to.eql("ERROR")
                        }
                        done()
                    });
            }, 100);
        })
    });

    /** DELETE User **/
    describe('/user/delete route', () => {
        it('should send SUCCESS response when valid request', (done) => {
            setTimeout(() => {
                let requestData = {
                    "ver": "1.0",
                    "params": { "msgid": "" },
                    "request": {
                        "token": token,
                        "user": {
                            "userId": userId,
                            "emailId": emailId
                        }
                    }
                };
                chai.request(HOST)
                    .post('/user/delete')
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
                let errorData = { "ver": "1.0", "params": { "msgid": "" }, "request": { "token": wrongToken, "user": { "userId": userId, "emailId": emailId } } };
                chai.request(HOST)
                    .post('/user/delete')
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
                let errorData = { "ver": "1.0", "params": { "msgid": "" }, "request": { "token": wrongToken } };
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
