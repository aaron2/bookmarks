exports.index = function(req, res){
  res.render('index', { title: 'Express' });
};

exports.search = function(req, res) {
  var tagCount = {};
  var m = [];
  search(req, function(results, err) {
    if (err) {
      if (err == 'timeout') res.send(502);
      res.send(500);
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
      res.send(500, { status: 'error', error: err });
    }
    res.send(200, results);
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
    hostname: '192.168.1.101',
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

exports.save = function(req, res) {
  res.render("save.jade", {
      user: req.session.user,
      authenticated: (req.session.user),
      carousel: true,
      edit_url: true,
      next: req.originalUrl,
  });
}
