const db = require("../shared/db");

module.exports = async function (context, req) {
  context.log("JavaScript HTTP trigger function processed a request.");

  // connect to the database
  try {
    await db.startDB(); 
  } catch (error) {
    console.log("fejl ved forbindelse til DB", error.message);
  }
  switch (req.method) {
    case "GET":
      await get(context, req);
      break;
    case "POST":
      await post(context, req);
      break;
    default:
      context.res = {
        body: "please get or post",
      };
      break;
  }
};

// async function for get a login
async function get(context, req) {
  try {
    let email = req.query.email;
    let hashed_password = req.query.hashed_password;
    let user = await db.login(email, hashed_password);
    context.res = {
      body: user,
    };
  } catch (error) {
    context.res = {
      status: 400,
      body: `No way Jose - ${error.message}`,
    };
  }
}

// async function for post a login
async function post(context, req) {
  try {
    let email = req.query.email;
    let hashed_password = req.query.hashed_password;
    let user = await db.login(email, hashed_password);
    context.res = {
      body: user,
    };
  } catch (error) {
    context.res = {
      status: 400,
      body: error.message,
    };
  }
}