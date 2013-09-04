exports.tag = function(req, res) {
  if (!req.body.tag) {
    res.send(400, { status: 'error', error: 'missing required parameter' });
    return;
  }

  getOpts = {}
  if (req.body.user && req.session.user && req.body.user == req.session.user) {
  }

  db.bookmarks.get(req.body.id, getOpts, function(err, doc) {
  });


};
