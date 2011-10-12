#!/usr/bin/env node

// require libraries that we depend on 
const
express = require('express'),
sessions = require('connect-cookie-session'),
path = require('path'),
querystring = require('querystring'),
db = require('./db.js'),
url = require('url'),
hashlib = require('hashlib'),
https = require('https');

// the key with which session cookies are encrypted
const COOKIE_SECRET = process.env.SEKRET || 'you love, i love, we all love beer!';

// The IP Address to listen on.
const IP_ADDRESS = process.env.IP_ADDRESS || '127.0.0.1';

// The port to listen to.
const PORT = process.env.PORT || 0;

// localHostname is the address to which we bind.  It will be used
// as our external address ('audience' to which assertions will be set)
// if no 'Host' header is present on incoming login requests.
var localHostname = undefined;

// create a webserver using the express framework
var app = express.createServer();

// a global flag indicating whether we have persistence or not.
var havePersistence;

// do some logging
app.use(express.logger({ format: 'dev' }));

// parse cookies
app.use(express.cookieParser());

// parse post bodies
app.use(express.bodyParser());

// session support using encrypted cookies
var cookieSession = sessions({
  secret: COOKIE_SECRET,
  key: 'myfavoritebeer_session',
  cookie: {
    path: '/api',
    httpOnly: true,
    // when you're logged in, you're logged in for an hour
    maxAge: (1 * 60 * 60 * 1000),
    secure: false
  }
});

const domain_whitelist = [
  "mozilla.org",
  "mozilla.com"
];

app.use(function (req, res, next) {
  if (/^\/api/.test(req.url)) return cookieSession(req, res, next);
  return next();
});

function identityResponse(email) {
  return {
    success: true,
    email: email,
    img: 'http://www.gravatar.com/avatar/' + hashlib.md5(email.trim().toLowerCase()) + "?s=32"
  };
}

// /api/whoami is an API that returns the authentication status of the current session.
// it returns a JSON encoded string containing the currently authenticated user's email
// if someone is logged in, otherwise it returns null.
app.get("/api/whoami", function (req, res) {
  if (req.session && typeof req.session.email === 'string') return res.json(identityResponse(req.session.email));
  return res.json(null);
});


// /api/login is an API which authenticates the current session.  The client includes 
// an assertion in the post body (returned by browserid's navigator.id.getVerifiedEmail()).
// if the assertion is valid an (encrypted) cookie is set to start the user's session.
// returns a json encoded email if the session is successfully authenticated, otherwise
// null.
app.post("/api/login", function (req, res) {
  // To verify the assertion we initiate a POST request to the browserid verifier service.
  // If we didn't want to rely on this service, it's possible to implement verification
  // in a library and to do it ourselves.  
  var vreq = https.request({
    host: 'browserid.org',
    path: "/verify",
    method: 'POST'
  }, function(vres) {
    var body = "";
    vres.on('data', function(chunk) { body+=chunk; } )
        .on('end', function() {
          try {
            var verifierResp = JSON.parse(body);
            var valid = verifierResp && verifierResp.status === "okay";
            var email = valid ? verifierResp.email : null;
            var reason;
            if (valid) {
              console.log("assertion verified successfully for email:", email);
            } else {
              console.log("failed to verify assertion:", verifierResp.reason);
            }
            if (!valid) throw "verifier can't validate!";

            var whitelisted = false;
            domain_whitelist.forEach(function(domain) {
              console.log("testing", email, "against", domain);
              if (email.substr(-domain.length) === domain) {
                whitelisted = true;
              }
            });
            if (!whitelisted) {
              valid = false;
              reason = "you must use an email address in one of the following domains: " +
                domain_whitelist.join(", ");;
            }

            if (valid) {
              // set up the session!
              req.session.email = email;
              res.json(identityResponse(email));
            } else {
              res.json({
                success: false,
                reason: reason
              });
            }
          } catch(e) {
            console.log("non-JSON response from verifier");
            // bogus response from verifier!  return null
            res.json({
              success: false,
              reason: "internal error verifying your identity"
            });
          }
        });
  });
  vreq.setHeader('Content-Type', 'application/x-www-form-urlencoded');

  // An "audience" argument is embedded in the assertion and must match our hostname.
  // Because this one server runs on multiple different domain names we just use
  // the host parameter out of the request.
  var audience = req.headers['host'] ? req.headers['host'] : localHostname;   
  var data = querystring.stringify({
    assertion: req.body.assertion,
    audience: audience
  });
  vreq.setHeader('Content-Length', data.length);
  vreq.write(data);
  vreq.end();
  console.log("verifying assertion!");
});

// /api/logout clears the session cookie, effectively terminating the current session.
app.post("/api/logout", function (req, res) {
  req.session.email = null;
  res.json(true);
});

function checkAuth(req, res, next) {
  var email;

  if (req.session && typeof req.session.email === 'string') email = req.session.email;

  if (!email) {
    res.writeHead(400, {"Content-Type": "text/plain"});
    return res.json({
      sucess: false,
      reason: "You must be authenticated to call this API"
    });
  }

  next();
}

function checkDB(req, res, next) {
  if (!havePersistence) {
    console.log("WARNING: get is a no-op!  we have no database configured");
    return res.json({
      sucess: false,
      reason: "No database is configured"
    });
  }
  next();
}


// /api/get requires an authenticated session, and accesses the current user's favorite
// beer out of the database.
app.post("/api/save", checkAuth, checkDB, function (req, res) {
  res.json({
    success: false,
    reason: "not implemented"
  });
});

// /api/set requires an authenticated session, and sets the current user's favorite
// beer in the database.
app.post("/api/set", function (req, res) {
  var email = req.session.email;

  if (!email) {
    resp.writeHead(400, {"Content-Type": "text/plain"});
    resp.write("Bad Request: you must be authenticated to get your beer");
    resp.end();
    return;
  }

  var beer = req.body.beer;

  if (!beer) {
    resp.writeHead(400, {"Content-Type": "text/plain"});
    resp.write("Bad Request: a 'beer' parameter is required to set your favorite beer");
    resp.end();
    return;
  }

  if (!havePersistence) {
    console.log("WARNING: set is a no-op!  we have no database configured");
    return res.json(true);
  }

  db.set(determineEnvironment(req), email, beer, function(err) {
    if (err) {
      console.log("setting beer for", email, "to", beer); 
      res.writeHead(500);
      res.end();
    } else {
      res.json(true);
    }
  });
});

// Tell express from where it should serve static resources
app.use(express.static(path.join(path.dirname(__dirname), "static")));

// connect up the database!
db.connect(function(err) {
  havePersistence = (err ? false : true);

  if (err) console.log("WARNING: running without a database means no persistence: ", err);

  // once connected to the database, start listening for connections
  app.listen(PORT, IP_ADDRESS, function () {
    var address = app.address();
    localHostname = address.address + ':' + address.port
    console.log("listening on " + localHostname);
  });
});
