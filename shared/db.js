const { Connection, Request, TYPES } = require("tedious");
const config = require("./config.json");
const bcrypt = require("bcrypt");
const user = require("../model/user");
const { raw } = require("body-parser");
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

var connection = new Connection(config);

// Function for database connection
function startDB() {
  return new Promise((resolve, reject) => {
    connection.on("connect", (err) => {
      if (err) {
        console.log("connection failed");
        reject(err);
        // request.addParameter("name", TYPES.VarChar, name);
        throw err;
      } else {
        console.log("Connected");
        resolve();
      }
    });
    connection.connect();
  });
}

module.exports.sqlConnection = connection;
module.exports.startDB = startDB;



// =================================================
// User
// =================================================

// Function for user to update the information on the profile
function update(id, payload) {
  return new Promise((resolve, reject) => {
    const sql = `UPDATE [user] SET name = @name, birthday = @birthday, email = @email, gender = @gender, country = @country WHERE id = @id`;
    const request = new Request(sql, (err, rowcount) => {
      console.log('rowcount', rowcount);
      if (err) {
        reject(err);
        console.log(err);
      } else if (rowcount == 0) {
        reject({ message: "User does not exist" });
      } else if (rowcount === 1) {
        resolve({ message: 'successfully updated.!' })
      }
    });

    request.addParameter("id", TYPES.Int, id);
    request.addParameter("name", TYPES.VarChar, payload.name);
    request.addParameter("birthday", TYPES.Date, payload.birthday);
    request.addParameter("email", TYPES.VarChar, payload.email);
    request.addParameter("gender", TYPES.VarChar, payload.gender);
    request.addParameter("country", TYPES.VarChar, payload.country);

    request.on("done", (row) => {
      console.log("User Updated", row);
      // resolve("user Updated", row);
    });

    request.on("doneProc", function (rowCount, more, returnStatus, rows) {
      console.log('Row Count' + rowCount);
      console.log('More? ' + more);
      console.log('Return Status: ' + returnStatus);
      console.log('Rows:' + rows);
    });

    connection.execSql(request);
  });
}

module.exports.update = update;

// Function for adding a new user to the database
function insert(payload) {
  console.log('payload', payload)
  return new Promise((resolve, reject) => {
    const sql = `INSERT INTO [user] (name, birthday, email, gender, country, hashed_password) VALUES (@name, @birthday, @email, @gender, @country, @hashed_password)`;
    const request = new Request(sql, (err) => {
      if (err) {
        reject(err);
        console.log(err);
      }
    });

    // now we set user password to hashed password
    if (payload.hashed_password) {
      bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(payload.hashed_password, salt, (err, hash) => {
          // Now we can store the password hash in db.
          payload.hashed_password = hash
          console.log("payload.hashed_password 1", payload.hashed_password);

          request.addParameter("name", TYPES.VarChar, payload.name);
          request.addParameter("birthday", TYPES.Date, payload.birthday);
          request.addParameter("email", TYPES.VarChar, payload.email);
          request.addParameter("gender", TYPES.VarChar, payload.gender);
          request.addParameter("country", TYPES.VarChar, payload.country);
          request.addParameter(
            "hashed_password",
            TYPES.VarChar,
            payload.hashed_password
          );

          console.log("payload.hashed_password 2", payload.hashed_password);

          request.on("requestCompleted", (row) => {
            console.log("User inserted", row);
            resolve("user inserted", row);
          });
          connection.execSql(request);
        });
      });
    }
  });
}

module.exports.insert = insert;

// Function for selecting a specific user from the database by id
function select(id) {
  return new Promise((resolve, reject) => {
    let sql = "SELECT * FROM [user]";
    if (id) {
      sql = sql + " WHERE id = @id"
    }
    console.log('sql', sql);
    const request = new Request(sql, (err, rowcount) => {
      if (err) {
        reject(err);
        console.log(err);
      } else if (rowcount == 0) {
        reject({ message: "User does not exist" });
      }
    });

    if (id) {
      request.addParameter("id", TYPES.Int, id);
    }

    _rows = [];

    request.on("row", (columns) => {
      const selectedUser = {};
      console.log('columns', columns.length);
      columns.map(({ value, metadata }) => {
        if (metadata.colName !== 'hashed_password') {
          selectedUser[metadata.colName] = value;
        }
      });
      _rows.push(selectedUser);
    });

    // We return the set of rows after the query is complete, instead of returing row by row
    request.on("doneInProc", (rowCount, more, rows) => {
      resolve(_rows);
    });

    connection.execSql(request);
  });
}
module.exports.select = select;

// Function for user login
function login(email, hashed_password) {
  return new Promise((resolve, reject) => {
    // now we set user password to hashed password
    if (hashed_password) {
      const sql =
        "SELECT * FROM [user] WHERE email = @email";
      const request = new Request(sql, (err, rowcount) => {
        if (err) {
          reject(err);
          console.log(err);
        } else if (rowcount == 0) {
          reject({ message: "User does not exist" });
        }
      });
      request.addParameter("email", TYPES.VarChar, email);
      // request.addParameter("hashed_password", TYPES.VarChar, hashed_password);

      request.on("row", (rows) => {
        console.log("login succes", rows);

        // const jsonArray = []
        let rowObject = {};
        rows.forEach(function (column) {
          rowObject[column.metadata.colName] = column.value;
        });
        console.log("rowObject", rowObject);
        const password = rowObject.hashed_password;
        console.log("password", password);
        console.log("hashed_password", hashed_password);
        // Load hash from the db, which was preivously stored 
        bcrypt.compare(hashed_password, password, function (err, res) {
          // if res == true, password matched
          // else wrong password
          if (res === true) {
            console.log('process.env.jwt_key', process.env.jwt_key);
            // create a jwt token that is valid for 7 days
            const token = jwt.sign({ sub: rowObject }, process.env.jwt_key, { expiresIn: '7d' });
            rowObject.token = token;
            delete rowObject.hashed_password;
            resolve(rowObject);
          } else {
            reject({ message: "Password not correct.!" });
          }
        });
      });

      connection.execSql(request);
    }
  });
}
module.exports.login = login;

// Function for deleting a user from the database
function deleteUser(userId) {
  return new Promise((resolve, reject) => {
    const sql =
      "DELETE FROM [user] WHERE id = @id";
    const request = new Request(sql, (err, rowcount, raws) => {
      console.log('rowcount', rowcount);
      console.log('raws', raws);
      if (err) {
        reject(err);
        console.log(err);
      } else if (rowcount == 0) {
        reject({ message: "User does not exist" });
      } else if (rowcount === 1) {
        resolve({ message: 'successfully deleted.!' })
      }
    });
    request.addParameter("id", TYPES.Int, userId);

    connection.execSql(request);
  });
}
module.exports.deleteUser = deleteUser;

// =================================================
// User end
// =================================================


// =================================================
// Swipes
// =================================================

// Function for create swipes when a user is liking or disliking another user
function createSwipes(payload) {
  console.log('payload', payload)
  return new Promise((resolve, reject) => {
    const sql = `INSERT INTO [swipes] (userId, ratedUserId, isLike) VALUES (@userId, @ratedUserId, @isLike)`;
    const request = new Request(sql, (err) => {
      if (err) {
        reject(err);
        console.log(err);
      }
    });

    request.addParameter("userId", TYPES.BigInt, payload.userId);
    request.addParameter("ratedUserId", TYPES.BigInt, payload.ratedUserId);
    request.addParameter("isLike", TYPES.TinyInt, payload.isLike);

    request.on("requestCompleted", (row) => {
      console.log("swipes inserted", row);
      resolve("swipes inserted", row);
    });
    connection.execSql(request);
  });
}
module.exports.createSwipes = createSwipes;


// Function for update swipe 
function updateSwipes(payload) {
  console.log('payload', payload)
  return new Promise((resolve, reject) => {
    const sql = `UPDATE [swipes] SET userId = @userId, ratedUserId = @ratedUserId, isLike = @isLike WHERE id = @id`;
    const request = new Request(sql, (err, rowcount) => {
      console.log('rowcount', rowcount);
      if (err) {
        reject(err);
        console.log(err);
      } else if (rowcount == 0) {
        reject({ message: "data not exist" });
      } else if (rowcount === 1) {
        resolve({ message: 'successfully updated.!' })
      }
    });

    request.addParameter("userId", TYPES.BigInt, payload.userId);
    request.addParameter("ratedUserId", TYPES.BigInt, payload.ratedUserId);
    request.addParameter("isLike", TYPES.TinyInt, payload.isLike);

    request.on("done", (row) => {
      console.log("data Updated", row);
      // resolve("data Updated", row);
    });

    request.on("doneProc", function (rowCount, more, returnStatus, rows) {
      console.log('Row Count' + rowCount);
      console.log('More? ' + more);
      console.log('Return Status: ' + returnStatus);
      console.log('Rows:' + rows);
    });

    connection.execSql(request);
  });
}
module.exports.updateSwipes = updateSwipes;


// Function for a specific swipe from a user
function searchSwipes(userId) {
  console.log('id', userId)
  return new Promise((resolve, reject) => {
    const sql = "SELECT * FROM [swipes] where userId = @userId";
    const request = new Request(sql, (err, rowcount) => {
      if (err) {
        reject(err);
        console.log(err);
      } else if (rowcount == 0) {
        reject({ message: "data not exist" });
      }
    });

    if (userId) {
      request.addParameter("userId", TYPES.Int, userId);
    }

    _rows = [];
    request.on("row", (columns) => {
      const selectedUser = {};
      console.log('columns', columns.length);
      columns.map(({ value, metadata }) => {
        selectedUser[metadata.colName] = value;
      });
      _rows.push(selectedUser);
    });

    // We return the set of rows after the query is complete, instead of returing row by row
    request.on("doneInProc", (rowCount, more, rows) => {
      resolve(_rows);
    });

    connection.execSql(request);
  });
}
module.exports.searchSwipes = searchSwipes;

// Function for deleting a swipe
function deleteSwipes(userId) {
  console.log('payload', payload)
  return new Promise((resolve, reject) => {
    const sql =
      "DELETE FROM [swipes] WHERE id = @id";
    const request = new Request(sql, (err, rowcount, raws) => {
      console.log('rowcount', rowcount);
      console.log('raws', raws);
      if (err) {
        reject(err);
        console.log(err);
      } else if (rowcount == 0) {
        reject({ message: "data not exist" });
      } else if (rowcount === 1) {
        resolve({ message: 'successfully deleted.!' })
      }
    });
    request.addParameter("id", TYPES.Int, userId);
    connection.execSql(request);
  });
}
module.exports.deleteSwipes = deleteSwipes;
// =================================================
// Swipes End
// =================================================


// =================================================
// Matches
// =================================================

// Function for create a new matche
function createMatches(payload) {
  console.log('payload', payload)
  return new Promise((resolve, reject) => {
    const sql = `INSERT INTO [matches] (user1Id, user2Id, created_at) VALUES (@user1Id, @user2Id, @created_at)`;
    const request = new Request(sql, (err) => {
      if (err) {
        reject(err);
        console.log(err);
      }
    });

    request.addParameter("user1Id", TYPES.BigInt, payload.user1Id);
    request.addParameter("user2Id", TYPES.BigInt, payload.user2Id);
    request.addParameter("created_at", TYPES.Binary, payload.created_at);

    request.on("requestCompleted", (row) => {
      console.log("swipes inserted", row);
      resolve("swipes inserted", row);
    });
    connection.execSql(request);
  });
}
module.exports.createMatches = createMatches;

// Function for updating a match
function updateMatches(payload) {
  console.log('payload', payload)
  return new Promise((resolve, reject) => {
    const sql = `UPDATE [matches] SET user1Id = @user1Id, user2Id = @user2Id, created_at = @created_at WHERE id = @id`;
    const request = new Request(sql, (err, rowcount) => {
      console.log('rowcount', rowcount);
      if (err) {
        reject(err);
        console.log(err);
      } else if (rowcount == 0) {
        reject({ message: "data not exist" });
      } else if (rowcount === 1) {
        resolve({ message: 'successfully updated.!' })
      }
    });

    request.addParameter("user1Id", TYPES.BigInt, payload.user1Id);
    request.addParameter("user2Id", TYPES.BigInt, payload.user2Id);
    request.addParameter("created_at", TYPES.Binary, payload.created_at);

    request.on("done", (row) => {
      console.log("data Updated", row);
      // resolve("data Updated", row);
    });

    request.on("doneProc", function (rowCount, more, returnStatus, rows) {
      console.log('Row Count' + rowCount);
      console.log('More? ' + more);
      console.log('Return Status: ' + returnStatus);
      console.log('Rows:' + rows);
    });

    connection.execSql(request);
  });
}
module.exports.updateMatches = updateMatches;

// Function for search a specific match in the database
function searchMatches(payload) {
  console.log('payload', payload)
  return new Promise((resolve, reject) => {
    const sql = "SELECT * FROM [matches]";
    const request = new Request(sql, (err, rowcount) => {
      if (err) {
        reject(err);
        console.log(err);
      } else if (rowcount == 0) {
        reject({ message: "data not exist" });
      }
    });

    request.on("done", (rowcount, more, rows) => {
      console.log(row);
    });

    const selected = {};
    request.on("row", (columns) => {
      columns.map(({ value, metadata }) => {
        selected[metadata.colName] = value;
      });
      resolve(selected);
    });
    connection.execSql(request);
  });
}
module.exports.searchMatches = searchMatches;


// Function for deleting a match 
function deleteMatches(userId) {
  return new Promise((resolve, reject) => {
    const sql =
      "DELETE FROM [matches] WHERE id = @id";
    const request = new Request(sql, (err, rowcount, raws) => {
      console.log('rowcount', rowcount);
      console.log('raws', raws);
      if (err) {
        reject(err);
        console.log(err);
      } else if (rowcount == 0) {
        reject({ message: "data not exist" });
      } else if (rowcount === 1) {
        resolve({ message: 'successfully deleted.!' })
      }
    });
    request.addParameter("id", TYPES.Int, userId);
    connection.execSql(request);
  });
}
module.exports.deleteMatches = deleteMatches;

// =================================================
// Matches End
// =================================================