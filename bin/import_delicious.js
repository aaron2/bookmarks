#!/usr/local/bin/node

var fs = require('fs');
var http = require('http');
var URI = require('URIjs');
var base64 = require('urlsafe-base64');

hashCode = function(s){
  return s.split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0);              
}

var server = '192.168.1.101';
var port = 5984;
var db = 'bookmarks';
var user = 'aaronf';

try {
    var fh = fs.openSync(process.argv[2], 'r');
}
catch(err) {
    process.stderr.write(err+'\n');
    process.exit(1);
}

function myput(link, callback) {
    //console.log(link.url);
    var id = base64.encode(new Buffer(user+'+'+link.url));
    link.user = user;
    console.log(id);
    console.log("%j", link);
    var req = http.request({
        hostname: server,
        port: port,
        method: 'PUT',
        path: '/'+db+'/'+id,
        headers: {
            Connection: 'close',
            Authorization: 'Basic YWRtaW46YWRtaW4=',
        }
    });
    req.write(JSON.stringify(link));
    req.on('error', function(e) {
        console.log('problem with request: ' + e.message);
        callback();
    });
    req.on('response', function (response) {
        response.on('data', function (chunk) {
        //    console.log('BODY: ' + chunk);
        });
        response.on('end', function (chunk) {
        });
    });
    try {
        req.end();
        setTimeout(callback, 100);
    }
    catch(err) {
        console.log(err);
        callback();
    }
}

function parseURI(url) {
  var uri = new URI(url);
  return {
    url: uri.normalize().toString(),
    type: (uri.suffix()) ? uri.suffix() : 'html',
    url_parsed: {
      protocol: uri.protocol(),
      domain: uri.domain(),
      subdomain: uri.subdomain(),
      path: uri.segment(),
      query: uri.query(),
      fragment: uri.fragment(),
    }
  }
}

var htmlparser = require('htmlparser');
var handler = new htmlparser.DefaultHandler(function (error, dom) { });
var parser = new htmlparser.Parser(handler);

var html = fs.readFileSync(process.argv[2], { encoding: 'ascii' });
html = html.replace(/\n/g, '</DT>\n');
html = html.replace(/<\/DT>\s*<DD>/g, '\n<DD>');
//console.log(html);
parser.parseComplete(html);

var list = handler.dom[handler.dom.length-2].children[0].children;
var x = 0;
var now = parseInt(new Date().getTime() / 1000);

function process_one() {
  x++;
  if (x >= list.length) process.exit();

  if (list[x].type == 'tag' && list[x].data == 'DT') {
    //console.log(list[x]);
    var link = parseURI(list[x].children[0].attribs.HREF);
    link.title = list[x].children[0].children[0].data;
    link.status = [ 'imported', now ];
    link.originalUrl = link.url;
    if (list[x].children[0].attribs.PRIVATE === '1')
      link.private = true;
    link.saved = parseInt(list[x].children[0].attribs.ADD_DATE, 10);
    if (list[x].children[0].attribs.TAGS)
      link.tags = []
    var tags = list[x].children[0].attribs.TAGS.toLowerCase().split(/[,]/);
    for (t in tags) {
      if (tags[t] != "")
        link.tags.push(tags[t]);
    }
    if (list[x].children[2]) {
      link.description = list[x].children[2].children[0].data;
    }
    //console.log(link);
    myput(link, process_one);
  }
  else {
   process_one();
  }
}

process_one(list, 0);
