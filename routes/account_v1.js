exports.show = function(req, res){
  global.db.users.get(req.session.user, function(err, doc) {
    res.render('account', {
      user: doc
    });
  });
}

exports.add = function(req, res){
}

exports.get = function(req, res){
  global.db.users.get(req.session.user, function(err, doc) {
    res.send(200, clean(doc));
  })
}

function clean(doc) {
  delete(doc.password_hash);
  delete(doc.password_salt);
  delete(doc._id);
  delete(doc._rev);
  return doc;
}
 
exports.edit = function(req, res) {
  if (req.body.settings) {
    if (!req.session.settings) req.session.settings = {};
    for (x in req.body.settings) {
      req.session.settings[x] = req.body.settings[x];
    }
  }
  req.session.save(function(err) {
    global.auth.deny(req, res, function() {
      updateUser(req, function(doc) {
        res.send(200, clean(doc));
      });
    }, function() {
      res.send(200, { settings: req.session.settings });
    });
  });
}

function updateUser(req, callback) {
  global.db.users.get(req.session.user, function(err, doc) {
    for (x in req.body.settings) {
      doc.settings[x] = req.body.settings[x];
    }
    if (req.body.email) doc.email = req.body.email;
    if (req.body.name) doc.name = req.body.name;
    if (req.body.password) {
      global.auth.hash(req.body.password, function(err, salt, hash) {
        doc.password_salt = salt;
        doc.password_hash = hash;
        global.db.users.save(req.session.user, doc._rev, doc, function(err, r) {
          if (err !== null) {
            res.send(500);
            return;
          }
          callback(doc);
        });
      });
    } else {
      global.db.users.save(req.session.user, doc._rev, doc, function(err, r) {
        if (err !== null) {
          res.send(500);
          return;
        }
        callback(doc);
      });
    }
  });
}

exports.delete = function(req, res){
}
