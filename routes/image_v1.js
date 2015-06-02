exports.get = function(req, res) {
  if (!req.query.id) {
    res.sendStatus(400, { status: 'error', error: 'missing required parameter' });
    return;
  }
  global.db.bookmarks.get(req.query.id, {attachments: false}, function(err, doc) {
    if (!doc || !doc._attachments || !doc._attachments.image) {
      //res.writeHead(302, { 'Location': '/img/noimage.jpg' });
      //res.end();
      res.sendStatus(404);
      return;
    }
    if (doc.private == true && (!req.session.user || req.session.user != doc.user)) {
      res.sendStatus(403);
      return;
    }
    if (req.headers['if-none-match'] && req.headers['if-none-match'] == doc._rev) {
      res.sendStatus(304);
      return;
    }
    var image = global.db.bookmarks.getAttachment(req.query.id, 'image', function(err) {
      if (err) {
        res.sendStatus(500);
        return;
      }
    });
    res.writeHead(200, {
      'Content-Type': doc._attachments.image.content_type,
      //'Transfer-Encoding': 'none',
      'ETag': doc._rev,
      //'Content-Length': doc._attachments.image.length,
      'Connection': 'close',
    });
    image.pipe(res);
    res.end()
  });
}

exports.info = function(req, res) {
  if (!req.query.id) {
    res.send(400, { status: 'error', error: 'missing required parameter' });
    return;
  }
  global.db.bookmarks.get(req.query.id, function(err, doc) {
    if (!doc || !doc._attachments || !doc._attachments.image) {
      res.send(404);
      return;
    }
    if (doc.private == true && (!req.session.user || req.session.user != doc.user)) {
      res.send(403);
      return;
    }
    delete(doc._attachments.image.stub);
    delete(doc._attachments.image.revpos);
    res.send(doc._attachments.image);
  });
}

exports.update = function(req, res) {
}

exports.delete = function(req, res) {
}

