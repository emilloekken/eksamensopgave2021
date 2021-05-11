const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

async function isValid(context, stop) {
    console.log('context', context.req.headers.access_token);

    // async function for setting JWT token 
    try {
        if (context.req.headers.access_token) {
            const token = context.req.headers.access_token;
            const auth = await jwt.verify(token, process.env.jwt_key);
            console.log('auth', auth);
            return auth;
        } else {
            return false;
        }
    } catch (error) {
        console.log('error', error);
        return false;
    }
};
module.exports.isValid = isValid