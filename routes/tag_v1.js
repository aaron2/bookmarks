exports.tag = function(req, res) {
  if (!req.body.tag) {
    res.status(400).send({ status: 'error', error: 'missing required parameter' });
    return;
  }

  getOpts = {}
  if (req.body.user && req.session.user && req.body.user == req.session.user) {
  }

  db.bookmarks.get(req.body.id, getOpts, function(err, doc) {
  });


};

exports.count = function(req, res) {
  var viewOpts = { group: true };
  var view = undefined;
  if (req.session.user) {
    view = 'taglist/user';
    viewOpts.endkey =  [ req.session.user, {} ];
    viewOpts.startkey = [ req.session.user ];
  } else {
    view = 'taglist/public';
  }
  global.db.bookmarks.view(view, viewOpts, function(err, rows) {
    if (typeof(rows[0].key) == 'string') {
      res.send(rows);
    } else {
      var out = [];
      for (r in rows) {
        out.push({ key: rows[r].key[1], value: rows[r].value });
      }
      res.send(out);
    }
  });
};
