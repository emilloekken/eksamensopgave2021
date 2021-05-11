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
  if (!isOK && req.method !== 'POST') {
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
        await deleteUser(context, req);
        break;
      default:
        context.res = {
          body: "Method not accepted",
        };
        break;
    }
  }

 
  // async function for updating a user
  async function put(context, req) {
    try {
      let id = req.query.id;
      let user = req.body;
      let updatedUser = await db.update(id, user);
      context.res = {
        body: updatedUser,
      };
    } catch (error) {
      context.res = {
        status: 400,
        body: `No way - ${error.message}`,
      };
    }
  }

  // async function for selecting a specific user
  async function get(context, req) {
    try {
      const id = req.query.id;
      console.log('id', id);
      let _user = await db.select(id);
      console.log(_user);
      context.res = {
        body: _user,
      };
    } catch (error) {
      context.res = {
        status: 400,
        body: `No way - ${error.message}`,
      };
    }
  }

  // async function for inserting a new user into the database
  async function post(context, req) {
    try {
      let payload = req.body;
      await db.insert(payload);
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

  // async function for deleting a user from the database
  async function deleteUser(context, req) {
    console.log('req.query.id', req.query.id)
    try {
      let payload = req.query.id;
      const user = await db.deleteUser(payload);
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