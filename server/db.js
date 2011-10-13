// db.js is a tiny persistence layer for mozhacks that uses
// mongodb and the mongodb client library.

const
url = require('url'),
mongodb = require('mongodb'),
hashlib = require('hashlib');

var collection;

exports.connect = function(cb) {
  if (!process.env.MONGOLAB_URI) {
    cb("no MONGOLAB_URI env var!");
    return;
  }

  var bits = url.parse(process.env.MONGOLAB_URI);
  var server = new mongodb.Server(bits.hostname, bits.port, {});
  new mongodb.Db(bits.pathname.substr(1), server, {}).open(function (err, cli) {
    if (err) return cb(err);
    collection = new mongodb.Collection(cli, 'mozhacks');

    // now authenticate
    var auth = bits.auth.split(':');
    cli.authenticate(auth[0], auth[1], function(err) {
      cb(err);
    });
  });
};

exports.save = function(email, subdomain, url, desc, viz, cb) {
  // does it exist?
  collection.findOne({ email: email, name: subdomain }, function (err, rez) {
    if (err) return cb(err);
    if (rez) {
      if (email !== rez.email) return cb("'" + rez.name + "' is already taken by someone who is not you");
      collection.update({
        email: email,
        name: subdomain
      }, {
        '$set': {
          url: url,
          desc: desc,
          viz: viz
        }
      }, function (err, docs) {
        cb(err);
      });
    } else {
      // insert
      collection.insert({
        email: email,
        name: subdomain,
        url: url,
        desc: desc,
        viz: viz
      }, function (err, docs) {
        console.log(err, docs);
        cb(err);
      });
    }
  });
};

exports.nameToLink = function(name, cb) {
  collection.findOne({ name: name }, function (err, rez) {
    if (err || !rez || !rez.url) cb(undefined);
    else cb(rez.url);
  });
};

exports.hacksForEmail = function(email, cb) {
  collection.find({email:email}).toArray(cb);
};

exports.visibleHacks = function(cb) {
  collection.find({viz:true}).toArray(function (err, arr) {
    if (err) return cb(err);
    cb(undefined, arr.map(function(e) {
      delete e._id;
      delete e.viz;
      e.email = hashlib.md5(e.email.trim().toLowerCase());
      return e;
    }));
  });
};

exports.delete = function(email, name, cb) {
  collection.remove({email: email, name:name}, function (err, results) {
    cb(err);
  });
}
