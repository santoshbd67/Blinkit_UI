let chai = require('chai');
let chaiHttp = require('chai-http');
let templateService = require('../services/templateService');
let sinon = require('sinon')
const expect = chai.expect
chai.use(chaiHttp)

// const HOST = 'http://106.51.226.169:9090'
const HOST = 'http://localhost:9090'

const templateId = "6";
const wrongTemplateId = null;
describe('Template Routing Service', () => {
    /** GET Template **/
    describe('/template/get/:id route', () => {
        let requestData = { "ver": "1.0", "params": { "msgid": "" }, "responseCode": "OK", "request": { "templateId": templateId } }
        let serviceStub = sinon.stub(templateService, 'getTemplate')
        serviceStub.returns(new Promise((resolve, reject) => {
            resolve(requestData)
        }));

        it('should send SUCCESS response when valid request', (done) => {
            chai.request(HOST)
                .get('/template/get/' + templateId)
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
                .get('/template/get/' + wrongTemplateId)
                .end((err, res) => {
                    if (res) {
                        expect(res.body.params.status).to.eql("Failed")
                        expect(res.body.responseCode).to.eql("ERROR")
                    }
                    done()
                })
        })
    })
})