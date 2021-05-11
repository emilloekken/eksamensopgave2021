const chai = require('chai')
// const index = require('../createUser/index')
// const insert = require('../shared/db')
const chaihttp = require('chai-http')
const should = chai.should()

chai.use(chaihttp)
let url = ("http://localhost:7071/api")

describe ('/POST user', () => {
    it('insert a new user into our database', (done) => {

        let user = {
            name: 'John',
            birthday: "12-12-1999",
            email: 'Jonh@john',
            gender: "Male",
            country: "den",
            hashed_password: "password"
        }

        chai
        .request(url)
        .post("/createUser")
        .send(user)
        .end((err, res) => {
            res.should.have.status(200);
            res.body.should.be.a("object");
            should.not.exist(err)
            done()
        })

    })
})