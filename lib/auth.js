exports.hash = function(pwd, salt, fn) {
  var crypto = require('crypto');
  var len = 128;
  var iterations = 1000;

  if (3 == arguments.length) {
    crypto.pbkdf2(pwd, salt, iterations, len, fn);
  } else {
    fn = salt;
    crypto.randomBytes(len, function(err, salt){
      if (err) return fn(err);
      salt = salt.toString('base64');
      crypto.pbkdf2(pwd, salt, iterations, len, function(err, hash){
        if (err) return fn(err);
        fn(null, salt, hash.toString());
      });
    });
  }
};

exports.authenticate = function(name, pass, fn) {
  global.db.users.get(name, function(err, user) {
    //if (err) throw err;
    if (!user) return fn(new Error('cannot find user'));
    exports.hash(pass, user.password_salt, function(err, hash){
      if (err) return fn(err);
      if (hash == user.password_hash) return fn(null, user);
      fn(new Error('invalid password'));
    })
  });
}

exports.restrict = function(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    req.session.error = 'Access denied!';
    res.redirect('/bookmarks/login?next='+req.originalUrl);
  }
}

exports.deny = function(req, res, ok, fail) {
  if (req.session.user) {
    ok();
  } else {
    if (fail) {
      fail();
      return;
    }
    res.send(403);
  }
}

exports.owned = function(id, user) {
  var decoded = global.base64.decode(id).toString('ascii');
  return (user == decoded.substring(0, decoded.indexOf('+')));
}

exports.authorize = function(id, user) {
//return true;
  var decoded = global.base64.decode(id).toString('ascii');
  if (user == "" || user != decoded.substring(0, decoded.indexOf('+'))) {
    return false;
  }
  return true;
}
