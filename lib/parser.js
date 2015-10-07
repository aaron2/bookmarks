var http = require('http');
var xml = require('node-xml');
var URI = require('URIjs');

exports.parse = function fetch(url, callback) {
    var request = require('request')
    var req = request.get({
      url: url,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36'
      }
    });
    req.on('error', function(e) {
      console.log('problem with request: ' + e.message);
      callback('http error: '+e.message, e);
    });
    var bodydata = '';
    var timeout = 500;
    var timer;
    req.on('response', function(response) {
        response.setEncoding('binary');
        if (response.statusCode != 200) {
          console.log(response.statusCode);
          console.log(response.headers);
          callback('bad response', response);
          return;
        }
//    timer = setTimeout(function() { callback('timeout') }, timeout);
        response.on('data', function(chunk) {
          bodydata += chunk;
          clearTimeout(timer);
          timer = setTimeout(function() { callback(undefined, parse(url, response, bodydata)) }, timeout);
        });
        response.on('end', function() {
          clearTimeout(timer);
          callback(undefined, parse(url, response, bodydata));
        });
    });
    try {
        req.end();
    }
    catch(err) {
        console.log(err);
    }
}

function parse(url, response, content) {
    var type = 'unknown';
    if (response.headers['content-type']) {
      if (response.headers['content-type'].match(/^(application|text)/i)) {
        type = response.headers['content-type'].replace(/^[^\/]*\//, '').replace(/( |\;).*/, '');
      } else {
        type = response.headers['content-type'].replace(/\/.*/, '');
      }
    }
    if (type == 'plain') type == 'text';
    var res = {
        title: '',
        images: [],
        text: '',
        type: type,
        encoding: 'binary',
        'content-type': response.headers['content-type'],
        content: content,
    }
    if (type == 'html') {
      var title = /<title>([\s\S]*?)</i;
      var description = /<meta[^>]*itemprop=[\'\"]?description[^>]*content=[\'\"]?(.*?)[\"\'>]/i;
      var img = /<img.*?src=[\'\"]?(.*?)[\'\">]/gmi;

      var m = content.match(title);
      res.title = (m) ? m[1].trim() : url;

      m = content.match(description);
      if (m) res.description = m[1];

      var tmp = {}
      while ((m = img.exec(content)) != null) {
          tmp[m[1]] = 1;
      }
      res.images = Object.keys(tmp);

      var s = content.replace(/\n/gm, ' ');
      s = s.replace(/<title.*?<\/title>/g, '');
      s = s.replace(/<script.*?<\/script>/g, '');
      s = s.replace(/<!--.*?-->/g, '');
      s = s.replace(/<style.*?style>/g, '');
      s = s.replace(/<.*?>/g, ' ');
      s = s.replace(/[\\\'\"!\.:*%$#@~&(){}\[\]+;?,|]/g, ' ');
      s = s.replace(/\s+/g, ' ');
      res.text = s;
    } else if (type == 'image') {
      res.images = [ url ];
      res.title = url.replace(/^.*\//, '');
    } else {
      res.title = url.replace(/^.*\//, '');
    }

    return res;
}
