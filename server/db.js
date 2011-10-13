// db.js is a tiny persistence layer for mozhacks that uses
// mongodb and the mongodb client library.

const
url = require('url'),
mongodb = require('mongodb');

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

exports.save = function(email, host, cname, desc, viz, cb) {
  // does it exist?
  collection.findOne({ email: email, host: host }, function (err, rez) {
    if (err) return cb(err);
    if (rez) {
      if (email !== rez.email) return cb("'" + rez.name + "' is already taken by someone who is not you");
      collection.update({
        email: email,
        host: host
      }, {
        '$set': {
          cname: cname,
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
        host: host,
        cname: cname,
        desc: desc,
        viz: viz
      }, function (err, docs) {
        console.log(err, docs);
        cb(err);
      });
    }
  });
};
