
var port = "3000";

// ------------
//  PRODUCTION
// ------------
// Gets necessary info to pass to getDB function.
function load_orders(){
  //var URL = host + "/load"; // Note: endpoint = /track
  var URL = "/load";
  getDB(URL);
}

// Gets necessary info to pass to the updateDB function.
function add_tracking_number(){
//  var URL = host + "/track"; // Note: endpoint = /track
  var URL = "/track";
  var tracking_num = document.getElementById("tracking_num").value;
  var item_name = document.getElementById("item_name").value;
  updateDB(URL, tracking_num, item_name);
}
// Gets necessary info to pass to the updateDB function.
function addUser(){
//  var URL = host + "/createAccount"; // Note: endpoint = /createAccount
  var URL = "/createAccount";
  var userID = document.getElementById("userID").value;
  var name = document.getElementById("name").value;
  var wordPass = document.getElementById("password").value;
  var wordPassConf = document.getElementById("confPassword").value;
  if (wordPass == wordPassConf){
    updateAccountsDB(URL, userID, name, wordPass);
  }else{
    alert("Password and Confirm Password are different!");
  }
}

function login(){
  var URL = "/login";
  var userID = document.getElementById("username").value;
  var password = document.getElementById("passwordA").value;
  attemptLogin(URL, userID, password);
}

/* --- Performs an Ajax call to the server. ---
   -- @param URL - a string containing a URL with a valid endpoint.
   -- @param userID - a string containing a username.
   -- @param password - a string containing a password.
   -- Pre-Conditions: URL should have endpoint /login
*/
function attemptLogin(URL, userID, password){
  $.ajax({
    type: "POST",
    url: URL,
    data: {'userID' : userID, 'password' : password}, // data passed through POST
    dataType: "text",
    success: function(msg){ // Successful connection.
      console.log("Login Successful!");
      console.log(msg);
      window.location = "./track.html";
    },
    error: function(xhr, ajaxOptions, thrownError){ // Unsuccessful connection.
      document.getElementById("users").innerHTML="<h1 style='color:red'>Server Error. Please refresh and try again.</h1>"; // Display an error.
    }
  });
}

// ----------
//   LOCAL
// ----------
// Gets necessary info to pass to getDB function.
/*
function load_orders(){
  var host = "http://localhost:"; // Change to actual URL for final product.
  var URL = host + port + "/load"; // Note: endpoint = /load
  getDB(URL);
}

// Gets necessary info to pass to the updateDB function.
function add_tracking_number(){
  var host = "http://localhost:"; // Change to actual URL for final product.
  var URL = host + port + "/track"; // Note: endpoint = /track
  var tracking_num = document.getElementById("tracking_num").value;
  updateDB(URL, tracking_num);
}

// Gets necessary info to pass to the updateDB function.
function addUser(){
  var host = "http://localhost:"; // Change to actual URL for final product.
  var URL = host + port + "/createAccount"; // Note: endpoint = /createAccount
  var userID = document.getElementById("userID").value;
  var name = document.getElementById("name").value;
  var wordPass = document.getElementById("password").value;
  var wordPassConf = document.getElementById("confPassword").value;
  if (wordPass == wordPassConf){
    updateAccountsDB(URL, userID, name, wordPass);
  }else{
    alert("Password and Confirm Password are different!");
  }
}*/


/* --- Performs an Ajax call to the server. ---
   -- @param URL - a string containing a URL with a valid endpoint.
   -- Pre-Conditions: URL should have endpoint /load
   -- Post-Conditions: Will append to the orders div all previous orders on that account.
*/
function getDB(URL){
  $.ajax({
    type: "POST",
    url: URL,
    data: {}, // data passed through POST
    dataType: "text",
    success: function(msg){ // Successful connection.
        json = JSON.parse(msg);
        // Display all orders.
        // --------------------------
        // --- Requires USPS API. ---
        // --------------------------

        for (var key in json){
          var tracking_num = JSON.stringify(json[key].tracking_num).replace(/['"]/g,''); // Replace all double quotes with empty strings.
          var item_name = JSON.stringify(json[key].item_name).replace(/['"]/g,''); // Replace all double quotes with empty strings.
          track(tracking_num, item_name); // USPS API
        }
    },
    error: function(xhr, ajaxOptions, thrownError){ // Unsuccessful connection.
      if (xhr.status == 400){
        window.location = "./login.html?isRedirectingInvalidUser=true";
      }else{
        document.getElementById("orders").innerHTML="<h1 style='color:red'>Server Error. Please refresh and try again.</h1>"; // Display an error.
      }
    }
  });
}


/* --- Performs an Ajax call to the server. ---
   -- @param URL - a string containing a URL with a valid endpoint.
   -- @param tracking_num - a string containing a tracking number (will have to check for validity).
   -- Pre-Conditions: URL should have endpoint /track
   -- Post-Conditions: Will append to the orders div the corresponding order. Also adds order to MySQL database.
*/
function updateDB(URL, tracking_num, item_name){
  $.ajax({
    type: "POST",
    url: URL,
    data: {'trackingID' : tracking_num, 'item_name' : item_name}, // data passed through POST
    dataType: "text",
    success: function(msg){ // Successful connection.
        // Display order. (Use variable tracking_num)
        // --------------------------
        // --- Requires USPS API. ---
        // --------------------------
        var x = JSON.stringify(msg);
        if (x == "\"ERROR\""){
          document.getElementById("errors").innerHTML="<h3 style='color:red'>Invalid Tracking Number or Item Name.</h3>";
          return;
        }else{
          document.getElementById("errors").innerHTML="";
        }
        track(tracking_num, item_name); //USPS API
    },
    error: function(xhr, ajaxOptions, thrownError){ // Unsuccessful connection.
      document.getElementById("orders").innerHTML="<h1 style='color:red'>Server Error. Please refresh and try again.</h1>"; // Display an error.
    }
  });
}

function updateAccountsDB(URL, userID, name, wordPass){
  $.ajax({
    type: "POST",
    url: URL,
    data: {'userid' : userID, 'name' : name, 'wordPass' : wordPass}, // data passed through POST
    dataType: "text",
    success: function(msg){ // Successful connection.
        // Display order. (Use variable tracking_num)
        // --------------------------
        // --- Requires USPS API. ---
        // --------------------------
        // Placeholder:
        document.getElementById("users").innerHTML = "<h1>User added to MySQL database!</h1>";
        window.location = "./track.html";
    },
    error: function(xhr, ajaxOptions, thrownError){ // Unsuccessful connection.
      document.getElementById("users").innerHTML="<h1 style='color:red'>Server Error. Please refresh and try again.</h1>"; // Display an error.
    }
  });
}

// USPS API.
// Appends order info to 'orders' div.
function track(tracking_num, item_name){
  var TN = tracking_num;
  // SET API KEY
  var api_key = "123key"
  var URL ="http://production.shippingapis.com/ShippingAPI.dll?API=TrackV2&XML=<TrackFieldRequest USERID=\"" + api_key + "\"><Revision>1</Revision><ClientIp>127.0.0.1</ClientIp><SourceId>19104</SourceId><TrackID ID=\"" + TN + "\"></TrackID></TrackFieldRequest>";
     $(document).ready(function(){
     $.ajax({
     type: "GET",
     url: URL,
     dataType: "text",
     success: function(xml) {
         var xmlDoc = $.parseXML(xml),
         $xml = $(xmlDoc);
         $title = $xml.find( "StatusSummary" );
         $("#someElement").append($title.text());

         var str="";
         str+=$title.text();
         if ($title.text()){
          document.getElementById("orders").innerHTML += "<b>" + item_name + "</b>: " + str + "<br>";
        }
       },
     error: function (xhr, ajaxOptions, thrownError) {
       document.getElementById("orders").innerHTML = "Error fetching " + URL;
     },
     async: true
     });
});
}

function on_login_load(){
  var parameterPresent = gup("isRedirectingInvalidUser");
  if(parameterPresent && parameterPresent != "false"){
    $("#loginWarn").show();
  }

  $.ajax({
    type: "GET",
    url: "/isLoggedIn",
    data: {}, // data passed through POST
    dataType: "text",
    success: function(msg){ // Successful connection.
      $("#login_content").hide();
      $("#already_loggedin").text("You are already logged in, " + msg + "!");
      $("#btn_logout").show();
    },
    error: function(xhr, ajaxOptions, thrownError){ // Unsuccessful connection.
      document.getElementById("users").innerHTML="<h1 style='color:red'>Server Error. Please refresh and try again.</h1>"; // Display an error.
    }
  });

}

function logout(){
  $.ajax({
    type: "GET",
    url: "/logout",
    data: {}, // data passed through POST
    dataType: "text",
    success: function(msg){ // Successful connection.
      console.log("Logged out.");
      window.location = "./login.html";
    },
    error: function(xhr, ajaxOptions, thrownError){ // Unsuccessful connection.
      console.log("Logout error.");
    }
  });
}

function gup(name){
    var url = location.href;
    name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
    var regexS = "[\\?&]"+name+"=([^&#]*)";
    var regex = new RegExp( regexS );
    var results = regex.exec( url );
    return results == null ? null : results[1];
}
