function normalize(url, user) {
  var uri = new global.uri(url);
  if (!user) return uri.normalize().toString();
  return global.base64.encode(new Buffer(user+'+'+uri.normalize()));
}

exports.add = function(req, res) {
  if (!req.body.url) {
    res.send(400, { status: 'error', error: 'missing required parameter' });
    return;
  }
  req.body.url = req.body.url.trim();
  var uri = new global.uri(req.body.url);
  var id = global.base64.encode(new Buffer(req.session.user+'+'+uri.normalize()));
  var now = parseInt(new Date().getTime() / 1000);
  var link = {
    _id: id,
    user: req.session.user,
    saved: now,
    url: uri.normalize().toString(),
    type: (uri.suffix()) ? uri.suffix() : 'html',
    status: [ 'ok', now ],
    url_parsed: {
      protocol: uri.protocol(),
      domain: uri.domain(),
      subdomain: uri.subdomain(),
      path: uri.segment(),
      query: uri.query(),
      fragment: uri.fragment(),
    }
  }
  link.originalUrl = link.url;
  if (req.body.private) link.private = true;
  if (req.body.tags) link.tags = req.body.tags;
  global.db.bookmarks.get(id, function(err, doc) {
    if (doc) {
      console.log(id);
      res.send(409, { status: 'error', error: 'conflict' });
      return;
    }
    if (!req.body.parse) {
      if (!req.body.title) {
        res.send(400, { status: 'error', error: 'missing required parameter' });
        return;
      }
      link.title = req.body.title;
      link.description = req.body.description;
      link.text = req.body.text;
      if (req.body.html) link = attach(link, 'html', 'text/html', 'ascii', req.body.html);
      fetchImage(req.body.image, link, function(doc) {
        global.db.bookmarks.save(id, doc, function(err, save) {
          console.log(err);
          res.send(201, { status: 'ok', link: stub(doc) });
        });
      });
    } else {
      var parser = require('../lib/parser');
      parser.parse(link.url, function(err, parsed) {
        if (err) {
          console.log('parse error: '+err);
          res.send(400, { status: 'error', error: err });
          return;
        }
        link.title = parsed.title;
        link.type = parsed.type;
        link.description = parsed.description;
        link.text = parsed.text;
        if (parsed.content && parsed.type != 'image') link = attach(link, 'content', parsed['content-type'], parsed.encoding, parsed.content);
        global.db.bookmarks.save(id, link, function(err, save) {
          console.log(err);
          res.send(201, { status: 'ok', link: stub(link), images: parsed.images });
        });
      });
    }
  });
}

exports.replace = function(req, res) {
  if (!req.body.id || !req.body.link || !req.body.link.url) {
    res.send(400, { status: 'error', error: 'missing required parameter' });
    return;
  }
  if (!global.auth.authorize(req.body.id, req.session.user)) {
    res.send(403);
    return;
  }

  global.db.bookmarks.get(req.body.id, function(err, doc) {
    if (!doc) {
      res.send(404);
      return;
    }
    delete(req.body.link._rev);
    delete(req.body.link._id);
    var id = normalize(req.body.link.url, req.session.user);
    if (id != req.body.id) {
      global.db.bookmarks.save(id, req.body.link, function(err, save) {
        global.db.bookmarks.remove(req.body.id, doc._rev, function(err, del) {
          res.send(200, { status: 'ok', link: stub(req.body.link) });
        });
      });
    } else {
      global.db.bookmarks.save(id, doc._rev, req.body.link, function(err, save) {
        res.send(200, { status: 'ok', link: stub(req.body.link) });
      });
    }
  });
}

exports.edit = function(req, res) {
  if (!req.body.id) {
    res.send(400, { status: 'error', error: 'missing required parameter' });
    return;
  }
  if (!global.auth.authorize(req.body.id, req.session.user)) {
    res.send(403);
    return;
  }

  getOpts = {}
  if (req.body.url) getOpts.attachements = true;

  global.db.bookmarks.get(req.body.id, getOpts, function(err, doc) {
    if (!doc) {
      res.send(404);
      return;
    }
    for (var a = ['title', 'description', 'tags', 'private'], i = 0; i < a.length; i++) {
      if (typeof req.body[a[i]] !== 'undefined') {
        doc[a[i]] = req.body[a[i]];
      }
    }
    doc.modified = parseInt(new Date().getTime() / 1000);
    if (req.body.url && req.body.url != doc.url) {
      var newdoc = doc;
      delete newdoc._rev;
      delete newdoc._id;
      newdoc.url = normalize(req.body.url);
      var newid = normalize(newdoc.url, req.session.user);

      global.db.bookmarks.save(newid, newdoc, function(err, save) {
        global.db.bookmarks.remove(req.body.id, doc._rev, function(err, del) {
          res.send(200, { status: 'ok', link: stub(newdoc) });
        });
      });
    } else {
      fetchImage(req.body.image, doc, function(doc) {
        global.db.bookmarks.save(req.body.id, doc._rev, doc, function(err, save) {
          res.send(200, { status: 'ok', link: doc });
        });
      });
    }
  });
}

function stub(doc) {
  for (a in doc._attachments) {
    doc._attachments[a].stub = true;
    delete doc._attachments[a].data;
  }
  return doc;
}

function attach(doc, name, contentType, encoding, data) {
console.log('attach', doc, name);
  if (!doc._attachments) doc._attachments = {};
  doc._attachments[name] = {
    data: new Buffer(data, encoding).toString('base64'),
    'content_type': contentType
  }
  return doc;
}

function fetchImage(url, doc, callback) {
  if (!url) return callback(doc);

  var http = require('http');
  var req = http.request(url);
  req.on('error', function(e) {
    console.log('problem with request: ' + e.message);
    return callback(doc)
  });
  data = ''
  req.on('response', function (res) {
    res.setEncoding('binary');
    if (res.statusCode != 200) {
      return callback(doc);
    }
    res.on('data', function (chunk) {
      data += chunk;
    });
    res.on('end', function (chunk) {
      callback(attach(doc, 'image',  res.headers['content-type'], 'binary', data));
    });
    setTimeout(function() { callback(doc) }, 2000);
  });
  try {
    req.end();
  }
  catch(err) {
    console.log(err);
    return callback(doc);
  }
}

exports.delete = function(req, res){
  if (!req.body.id) {
    res.send(400, { status: 'error', error: 'missing required parameter' });
    return;
  }
  if (!global.auth.authorize(req.body.id, req.session.user)) {
    res.send(403);
    return;
  }

  global.db.bookmarks.get(req.body.id, function(err, doc) {
    if (!doc) {
      res.send(404);
      return;
    }
    global.db.bookmarks.remove(doc._id, doc._rev, function(err, del) {
      if (err) {
        rese.send(200, { status: 'error', error: err });
      } else {
        res.send(200, { status: 'ok', link: { _id: doc._id } });
      }
    });
  });
}

exports.get = function(req, res) {
  getOpts = {}
  if (req.query.attachments) getOpts.attachments = true;

  if (req.query.id) {
    global.db.bookmarks.get(req.query.id, getOpts, function(err, doc) {
      if (global.auth.authorize(req.query.id, req.session.user)) {
        if (doc) {
          res.send(200, { status: 'ok', link: doc });
        } else {
          res.send(404);
        }
        return;
      }
      if (!doc || (doc && doc.private == true)) {
        res.send(403);
        return;
      }
      res.send(200, { status: 'ok', link: doc });
    });
  }
  else if (req.query.user) {
    var view = 'user/public';
    getOpts.startkey = [ req.query.user ];
    getOpts.endkey = [ req.query.user, {} ];
    if (req.query.user == req.session.user) view = 'user/all';
    global.db.bookmarks.view(view, getOpts, function(err, docs) {
      res.send(200, { status: 'fuck', data: docs });
    });
  }
  else {
    res.send(400, { status: 'error', error: 'missing required parameter' });
  }
}

exports.getall = function(req, res) {
  
}
