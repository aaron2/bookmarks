function normalize(url, user) {
  var uri = new global.uri(url);
  if (!user) return uri.normalize().toString();
  return global.base64.encode(new Buffer(user+'+'+uri.normalize()));
}

function url_parsed(uri) {
  return {
    protocol: uri.protocol(),
    domain: uri.domain(),
    subdomain: uri.subdomain(),
    path: uri.segment(),
    query: uri.query(),
    fragment: uri.fragment(),
  }
}

function Link(user, url, data) {
  var uri = new global.uri(url.trim());
  var link = {};
  for (var x in data) {
    link[x] = data[x];
  }
  delete(link._rev);
  link._id = global.base64.encode(new Buffer(user+'+'+uri.normalize()));
  link.url = uri.normalize().toString();
  link.type = (uri.suffix()) ? uri.suffix() : 'html';
  link.url_parsed = url_parsed(uri);
  return link;
}

exports.add = function(req, res) {
  if (!req.body.url) {
    res.sendStatus(400, { status: 'error', error: 'missing required parameter' });
    return;
  }
  var now = parseInt(new Date().getTime() / 1000);
  var link = new Link(req.session.user, req.body.url, {
    user: req.session.user,
    saved: now,
    status: [ 'ok', now ],
  })
  if (req.body.private) link.private = true;
  if (req.body.tags) link.tags = req.body.tags;
  global.db.bookmarks.get(link._id, function(err, doc) {
    if (doc) {
      console.log('id:', link._id);
      res.sendStatus(409, { status: 'error', error: 'conflict' });
      return;
    }
    if (!req.body.parse) {
      if (!req.body.title) {
        res.sendStatus(400, { status: 'error', error: 'missing required parameter' });
        return;
      }
      link.title = req.body.title;
      link.description = req.body.description;
      if (req.body.content) link = attach(link, 'content', 'text/html', 'ascii', req.body.html);
      fetchImage(req.body.image, link, function(doc) {
        global.db.bookmarks.save(doc._id, doc, function(err, save) {
          console.log('err1', err);
          res.sendStatus(201, { status: 'ok', link: stub(link) });
        });
      });
    } else {
      var parser = require('../lib/parser');
      parser.parse(link.url, function(err, parsed) {
        if (err) {
          console.log('parse error: '+err);
          res.sendStatus(400, { status: 'error', error: err });
          return;
        }
        link.title = (req.body.title) ? req.body.title : parsed.title;
        link.description = (req.body.description) ? req.body.description : parsed.description;
        link.type = parsed.type;
        link = attach(link, 'text', 'text/plain', 'utf-8', parsed.text);
        if (parsed.content && parsed.type != 'image') link = attach(link, 'content', parsed['content-type'], parsed.encoding, parsed.content);
        fetchImage(req.body.image, link, function(doc) {
          global.db.bookmarks.save(link._id, link, function(err, save) {
            if (err) console.log(err);
            res.sendStatus(201, { status: 'ok', link: stub(link), images: parsed.images });
          });
        });
      });
    }
  });
}

exports.replace = function(req, res) {
  if (!req.body.id || !req.body.link || !req.body.link.url) {
    res.sendStatus(400, { status: 'error', error: 'missing required parameter' });
    return;
  }
  if (!global.auth.owned(req.body.id, req.session.user)) {
    res.sendStatus(403);
    return;
  }

  global.db.bookmarks.get(req.body.id, function(err, doc) {
    if (!doc) {
      res.sendStatus(404);
      return;
    }
    delete(req.body.link._rev);
    delete(req.body.link._id);
    var id = normalize(req.body.link.url, req.session.user);
    if (id != req.body.id) {
      global.db.bookmarks.save(id, req.body.link, function(err, save) {
        global.db.bookmarks.remove(req.body.id, doc._rev, function(err, del) {
          res.sendStatus(200, { status: 'ok', link: stub(req.body.link) });
        });
      });
    } else {
      global.db.bookmarks.save(id, doc._rev, req.body.link, function(err, save) {
        res.sendStatus(200, { status: 'ok', link: stub(req.body.link) });
      });
    }
  });
}

exports.edit = function(req, res) {
  if (!req.body.id) {
    res.sendStatus(400, { status: 'error', error: 'missing required parameter' });
    return;
  }
  if (!global.auth.owned(req.body.id, req.session.user)) {
    res.sendStatus(403);
    return;
  }

  getOpts = {}
  if (req.body.url) getOpts.attachements = true;

  global.db.bookmarks.get(req.body.id, getOpts, function(err, doc) {
    if (!doc) {
      res.sendStatus(404);
      return;
    }
    for (var a = ['title', 'description', 'tags', 'private'], i = 0; i < a.length; i++) {
      if (typeof req.body[a[i]] !== 'undefined') {
        doc[a[i]] = req.body[a[i]];
      }
    }
    var now = parseInt(new Date().getTime() / 1000);
    doc.modified = now;
    if (req.body.url && req.body.url != doc.url) {
      doc.status = [ 'ok', now ];
      if (!doc.originalUrl) doc.originalUrl = doc.url;
      var newdoc = new Link(req.session.user, req.body.url, doc);
      fetchImage(req.body.image, newdoc, function(newdoc) {
        global.db.bookmarks.save(newdoc._id, newdoc, function(err, save) {
          if (err) { res.send(500); return; }
          global.db.bookmarks.remove(req.body.id, doc._rev, function(err, del) {
            res.send(200, { status: 'ok', link: stub(newdoc) });
          });
        });
      });
    } else {
      fetchImage(req.body.image, doc, function(doc) {
        global.db.bookmarks.save(req.body.id, doc._rev, doc, function(err, save) {
if (res.headersSent) {
console.log('asshole');
return;
}
          res.sendStatus(200, { status: 'ok', link: stub(doc) });
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
//console.log('attach', doc, name);
  if (!doc._attachments) doc._attachments = {};
  doc._attachments[name] = {
    data: new Buffer(data, encoding).toString('base64'),
    'content_type': contentType
  }
  return doc;
}

function fetchImage(url, doc, callback) {
  if (!url) return callback(doc);

  var request = require('request');
  var req = request.get(url);
  req.on('error', function(e) {
    console.log('problem with request: ' + e.message);
    return callback(doc)
  });
  data = ''
  req.on('response', function (res) {
    var timer = setTimeout(function() { console.log('fuck'); callback(doc) }, 2000);
    res.setEncoding('binary');
    if (res.statusCode != 200) {
    /*
not needed with requests module?
      if (res.statusCode == '301' || res.statusCode == '302') {
        clearTimeout(timer);
        fetchImage(res.headers.location, doc, callback);
        return;
      }
      clearTimeout(timer);
*/
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
    console.log('err3', err);
    return callback(doc);
  }
}

exports.delete = function(req, res){
  if (!req.body.id) {
    res.sendStatus(400, { status: 'error', error: 'missing required parameter' });
    return;
  }
  if (!global.auth.owned(req.body.id, req.session.user)) {
    res.sendStatus(403);
    return;
  }

  global.db.bookmarks.get(req.body.id, function(err, doc) {
    if (!doc) {
      res.sendStatus(404);
      return;
    }
    global.db.bookmarks.remove(doc._id, doc._rev, function(err, del) {
      if (err) {
        rese.sendStatus(200, { status: 'error', error: err });
      } else {
        res.sendStatus(200, { status: 'ok', link: { _id: doc._id } });
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
          res.sendStatus(200, { status: 'ok', link: doc });
        } else {
          res.sendStatus(404);
        }
        return;
      }
      if (!doc || (doc && doc.private == true)) {
        res.sendStatus(403);
        return;
      }
      res.sendStatus(200, { status: 'ok', link: doc });
    });
  }
  else if (req.query.user) {
    var view = (req.query.user == req.session.user) ? 'user/all' : 'user/public';
    getOpts.startkey = [ req.query.user ];
    getOpts.endkey = [ req.query.user, {} ];
    global.db.bookmarks.view(view, getOpts, function(err, docs) {
      res.sendStatus(200, { status: 'ok', data: docs });
    });
  }
  else {
    res.sendStatus(400, { status: 'error', error: 'missing required parameter' });
  }
}

exports.getall = function(req, res) {
  
}
