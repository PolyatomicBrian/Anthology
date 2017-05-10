
/* NOTE:
    server.js requires that the following packages be installed:
      fs (should come with Node.js)
      express
      body-parser
      mysql
      password-hash-and-salt
      client-sessions

    Install them with the following:
      npm install express --save
      npm install body-parser --save
      npm install mysql --save
      npm install password-hash-and-salt --save
      npm install client-sessions --save

*/


var fs = require('fs'); // For file reading
var express = require('express');
var app = express();
var bodyParser = require('body-parser'); // For parsing POST data
var password = require('password-hash-and-salt'); // For ing and salting passwords
var port = process.env.PORT || 3000;
var html = fs.readFileSync('public/index.html');
var sessions = require('client-sessions'); // For sessions


// Setup Node.js server.
app.listen(port);
app.use('/', express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({extended:false})); // For POST data
app.use(bodyParser.json());
app.use(sessions({
  cookieName: 'anthology_session', // cookie name dictates the key name added to the request object
  secret: 'blahtestblah', // should be a large unguessable string
  duration: 24 * 60 * 60 * 1000, // how long the session will stay valid in ms
  activeDuration: 1000 * 60 * 5 // if expiresIn < activeDuration, the session will be extended by activeDuration milliseconds
}));

// Get MySQL database info.
//-------------------------------------------------------------------------------------------------------------
var host_loc = './host.txt';
var user_loc = './username.txt';
var pass_loc = './password.txt';
var database_loc = './database.txt';
var hostname = fs.readFileSync(host_loc, 'utf8'); // Get host from file.
var username = fs.readFileSync(user_loc, 'utf8'); // Get username from file.
var pass = fs.readFileSync(pass_loc, 'utf8'); // Get password from file.
var databaseName = fs.readFileSync(database_loc, 'utf8'); // Get database from file.
//-------------------------------------------------------------------------------------------------------------


// Initial connection to MySQL Database.
var mysql = require('mysql');
var con = mysql.createConnection({
  host: hostname,
  user: username,
  password: pass,
  database: databaseName
});
con.connect(function(err){
  if (err){
    console.log("Error connecting to database.");
  }else{
    console.log("Database successfully connected.");
  }
});

app.get('/logout', function(req, res){
  req.anthology_session.reset();
  return res.redirect('/login.html');
});


app.get("/isLoggedIn", function(req, res){

  console.log("Checking if logged in...");
  if (req.anthology_session.userID){
    console.log("Not logged in.");
    res.send(req.anthology_session.userID);
    return;
  }

});


// Ajax call made for /load:
app.post("/load", function(req, res){

  console.log("UID: " + req.anthology_session.userID);
  if (!req.anthology_session.userID){
    console.log("Not logged in.");
    res.status(400).send("bad-request");
    return;
  }

  var username = req.anthology_session.userID;

  // SQL Command for adding tracking number to TRACKING_INFO table:
  var sql_command = "SELECT tracking_num, item_name FROM TRACKING_INFO WHERE user_id=? ORDER BY tracking_id ASC;";
  con.query(sql_command, [username],
    function(err, rows, fields){
      if (err){
        console.log("Error during query processing."); // Unsuccessful. Do nothing.
      } else {
        console.log("Fetching Tracking Numbers for USER " + username); // Success.
        res.send(rows);
      }
    });
});


function isValidTracking(tracking_num){
  if (tracking_num){
    if (tracking_num.indexOf("'") == -1){
      if (tracking_num.indexOf("\"") == -1){
        if (tracking_num.indexOf(" ") != -1){
          tracking_num = tracking_num.replace(/ /g, "");
          if (tracking_num.indexOf("-") != -1){
            tracking_num = tracking_num.replace(/-/g, ""); // Remove all hyphens.
            return true;
          }
          return true;
        }
        return true;
      }
    }
  }
  return false;
}

app.post("/login", function(req, res){

  // Get POST data.
  var userID = req.body.userID;
  var wordPass = req.body.password;

  // Query SQL database
  var sql_command = "SELECT * FROM ACCOUNTS WHERE userID=?";
  con.query(sql_command, [userID],
    function(err, rows, fields){
      if (err){
        console.log("Error during query processing. (Login error)");
        res.send("ERROR");
      }else if(rows.length == 0){ // No user with this ID
        console.log("User does not exist!");
        res.send("ERROR");
      }else{
        console.log("Valid login info entered."); // Valid username, now let's check the password:
        password(wordPass).verifyAgainst(rows[0].password, function(error, verified) { // Compare database's password to inputted password.
          if(error){
             throw new Error('Something went wrong! (is_correct_hash)');
          }if(!verified) {
             console.log("Passwords mismatch!"); // Don't match, do nothing.
             // TODO Display some kind of error.
          } else {
             console.log("Passwords match!");
             req.anthology_session.userID = userID;
             console.log(req.anthology_session.userID);
             res.send("Logged In");
          }
        });
      }
    });
});


// Ajax call made for /track:
app.post("/track", function(req, res){
  if (!req.anthology_session.userID){
    console.log("Not logged in.");
    return;
  }
  var tracking_num = req.body.trackingID; // Get POST data (tracking num) from body.
  var item_name = req.body.item_name;
  if (!isValidTracking(tracking_num)){
    res.send("ERROR");
    return;
  }

  if (item_name.indexOf("'") != -1 || item_name.indexOf("\"") != -1){
        res.send("ERROR");
        return;
  }

  // -------------------------------------------------------
  console.log("Received POST request for tracking number " + tracking_num);

  //Prevent SQL Injection:
//  tracking_num = con.escape(tracking_num);

  var username = req.anthology_session.userID;
  // SQL Command for adding tracking number to TRACKING_INFO table:
  var sql_command = "INSERT INTO TRACKING_INFO ";
  sql_command += "(user_id, tracking_num, item_name) ";
  //sql_command += "VALUES ";
  //sql_command += "('" + username + "', '" + tracking_num + "', '" + item_name + "');";
  sql_command += "VALUES(?,?,?);";

  con.query(sql_command, [username, tracking_num, item_name],
    function(err, rows, fields){
      if (err){
        console.log(err);
        console.log("Error during query processing. (Perhaps duplicate tracking ID entered?)"); // Unsuccessful. Do nothing.
        res.send("ERROR");
      } else {
        console.log("Adding Tracking #" + tracking_num + " to TRACKING_INFO table for USER " + username); // Success.
        console.log("Adding Item " + item_name + " to TRACKING_INFO table for USER " + username); // Success.
        res.send(rows);
      }
    });
});


// Ajax call made for /createUser:
app.post("/createAccount", function(req, res){
  var userID = req.body.userid; // Get POST data from body.
  var name = req.body.name;
  var wordPass = req.body.wordPass;
  var hashed_pass = "xxx";
  var myuser = {username: userID};

  // Create hashed and salted password
  //NOTE: Requires password-hash-and-salt package. (npm install password-hash-and-salt --save)
  password(wordPass).hash(function(error, hash) {
      if(error){
          throw new Error('Something went wrong!');
      }else{
        myuser.hash = hash;
        var jsonUser = JSON.parse(JSON.stringify(myuser, null, 4));
        hashed_pass = jsonUser.hash;

        /* Example code for verifying a password:
          NOTE: This is nested inside the password(wordPass).hash(function... function.
          --------------------------------------------------------------------------------

	         // Verifying a hash
	          password('passwordToCompare').verifyAgainst(hashed_pass, function(error, verified) {
		          if(error)
			           throw new Error('Something went wrong!');
		          if(!verified) {
			           console.log("Don't try! We got you!");
		          } else {
			           console.log("The secret is...");
		          }
            });

        */



        // -------------------------------------------------------
        console.log("Received POST request to create account " + userID);

        // SQL Command for adding tracking number to ACCOUNTS table:
        var sql_command = "INSERT INTO ACCOUNTS ";
        sql_command += "(userID, name, password) ";
        //sql_command += "VALUES ";
        //sql_command += "('" + userID + "', '" + name + "', '" + hashed_pass + "');";
        sql_command += "VALUES(?,?,?);";
        con.query(sql_command, [userID, name, hashed_pass],
          function(err, rows, fields){
            if (err){
              console.log("Error during query processing."); // Unsuccessful. Do nothing.
            } else {
              console.log("Adding user to ACCOUNTS table for USER " + userID); // Success.
              req.anthology_session.userID = userID;
              res.send(rows);
            }
          });
    }
  });
});
