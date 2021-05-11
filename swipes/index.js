const db = require("../shared/db");
const isValid = require('../jwt/index').isValid;

module.exports = async function (context, req) {
    context.log("JavaScript HTTP trigger function processed a request.");

    // connect to the database
    try {
        await db.startDB(); 
    } catch (error) {
        console.log("fejl ved forbindelse til DB", error.message);
    }

    // check if a JWT token has been set
    const isOK = await isValid(context, req)
    console.log('isOK', isOK);
    if (!isOK) {
        context.res = {
            body: { status: 401, message: "Unauthorize.!" },
        };
    } else {
        switch (req.method) {
            case "GET":
                await get(context, req);
                break;
            case "POST":
                await post(context, req);
                break;
            case "PUT":
                await put(context, req);
                break;
            case "DELETE":
                await deleteSwipes(context, req);
                break;
            default:
                context.res = {
                    body: "Method not accepted",
                };
                break;
        }
    }

    // async function for creating a new swipe
    async function post(context, req) {
        try {
            let payload = req.body;
            await db.createSwipes(payload);
            context.res = {
                body: { status: "Success" },
            };
        } catch (error) {
            context.res = {
                status: 400,
                body: error.message,
            };
        }
    }

    // async function for updating a swipe in the database
    async function put(context, req) {
        try {
            let id = req.query.id;
            let swipes = req.body;
            let result = await db.updateSwipes(id, swipes);
            context.res = {
                body: result,
            };
        } catch (error) {
            context.res = {
                status: 400,
                body: `No way - ${error.message}`,
            };
        }
    }

    // async function for searching for a specefic swipe in the database
    async function get(context, req) {
        try {
            let id = req.query.id;
            let result = await db.searchSwipes(id);
            console.log(result);
            context.res = {
                body: result,
            };
        } catch (error) {
            context.res = {
                status: 400,
                body: `No way - ${error.message}`,
            };
        }
    }

    // async function for deleting a swipe from the database
    async function deleteSwipes(context, req) {
        console.log('req.query.id', req.query.id)
        try {
            let payload = req.query.id;
            const data = await db.deleteSwipes(payload);
            context.res = {
                body: { status: "successfully deleted.!" },
            };
        } catch (error) {
            context.res = {
                status: 400,
                body: error.message,
            };
        }
    }
};