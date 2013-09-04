var cradle = require('cradle');
var auth = require('auth');
cradle.setup({
  host: '192.168.1.101'
});
users = new(cradle.Connection)().database('users');


db.users.get(process.argv[2], function(err, doc) {
  auth.hash(process.argv[3], function(err, salt, hash){
    if (err) throw err;
    doc.password_salt = salt;
    doc.password_hash = hash;
    db.users.save((process.argv[2], doc._rev, doc);
  });
});

