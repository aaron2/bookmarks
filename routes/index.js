exports.index = function(req, res){
  res.render('index', {
      title: 'Delish',
      tag: '',
      layout: '',
      user: req.session.user,
      authenticated: (req.session.user),
      carousel: true,
      edit_url: true,
      next: req.originalUrl,
      images: req.query.img,
  });
};

exports.searchautocomplete = function(req, res) {
  var viewOpts = { group: true };
  var view = undefined;
  if (req.session.user) {
    view = 'user/search_autocomplete_all';
    viewOpts.endkey =  [ req.session.user, {} ];
    viewOpts.startkey = [ req.session.user ];
  } else {
    view = 'user/search_autocomplete_all';
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

exports.search = function(req, res) {
  var tagCount = {};
  var m = [];
  search(req, function(results, err) {
    if (err) {
      if (err == 'timeout') {
        res.sendStatus(502);
      } else {
        res.sendStatus(500);
      }
      res.end()
      return;
    }
    for (x in results.rows) {
      if (req.body.user && req.body.user != results.rows[x]['doc']['user']) continue;
      if (req.body.image && !results.rows[x]['doc']['_attachments']['image']) continue;
      if (req.session.user && req.session.user == results.rows[x]['doc']['user']) {
        m.push(results.rows[x]);
      }
      else if (!results.rows[x]['doc']['private']) {
        m.push(results.rows[x]);
      }
      for (t in results.rows[x].doc.tags) {
        if (!tagCount[results.rows[x].doc.tags[t]]) tagCount[results.rows[x].doc.tags[t]] = 0;
        tagCount[results.rows[x].doc.tags[t]]++;
      }
  
      results.rows[x].value = results.rows[x].doc;
      delete(results.rows[x].doc);
  
    }
    results.rows = m;
    results.total_rows = m.length;
    var tags = [];
    for (x in tagCount)
       tags.push([ x, tagCount[x] ]);
    tags = tags.sort(function(a, b) {return b[1] - a[1]});
    layout = (req.session.settings && req.session.settings.view) || 'compact';
    res.render('list_'+layout+'.jade', {
      title: 'Search Results',
      links: results.rows,
      tags: tags.slice(0, 30),
      search: { query: results.query.q, results: results.total_rows },
      user: '',
      tag: '',
      authenticated: req.session.user,
      func: global.common,
    });
  });
}

exports.apiSearch = function(req, res) {
  search(req, function(results, err) {
    if (err) {
      res.status(500).send({ status: 'error', error: err });
    }
    res.status(200).send(results);
  });
}

function search(req, callback) {
  if (!req.body.q && !req.query.q) {
    callback({}, 'missing required parameter');
    return;
  }

  var http = require('http');
  var qs = require('querystring');

  var query = {
    include_docs: 'true',
//    limit: 100,
    q: req.body.q || req.query.q,
  };

  var index = (req.body.notext) ? 'notext' : 'all';
  var searchReq = http.request({
    hostname: 'localhost',
    port: 5984,
    auth: 'admin:admin',
    path: '/bookmarks/_fti/_design/search/'+index+'?'+qs.stringify(query)
  });
  searchReq.on('error', function(e) {
    console.log('problem with request: ' + e.message);
    callback({}, 'unknown error');
    return;
  });
  bodydata = '';
  setTimeout(function() { try { callback({}, 'timeout') } catch(err) {} }, 1500);
  searchReq.on('response', function(searchRes) {
    if (searchRes.statusCode != 200) {
      console.log(searchRes);
      callback({}, 'invalid response from server');
      return;
    }
    searchRes.on('data', function(chunk) {
      //console.log('BODY: ' + chunk);
      bodydata += chunk;
    });
    var tagCount = {};
    searchRes.on('end', function() {
      var results = JSON.parse(bodydata);
      results.query = query;
      //console.log(results);
      callback(results, null);
    });
  });
  try {
    searchReq.end();
  }
  catch(err) {
    console.log(err);
    callback({}, 'unknown error');
    return;
  }
};

function normalize(url, a) {
  var out = {};
  if (a === undefined) return [];
  for (var i = 0; i<a.length; i++) {
    var u = new global.uri(a[i]);
    try {
      out[u.absoluteTo(url).toString()] = 1;
    }
    catch(e) { }
  }
  return Object.keys(out);
}

exports.save = function(req, res) {
  var imgs = (typeof(req.query.img) == 'string') ? [ req.query.img ] : req.query.img;
  res.render("save.jade", {
      user: req.session.user,
      authenticated: (req.session.user),
      carousel: true,
      edit_url: true,
      next: req.originalUrl,
      images: normalize(req.query.url, imgs),
  });
}
