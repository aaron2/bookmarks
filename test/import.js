#!/usr/local/bin/node

var fs = require('fs');
var http = require('http');
var xml = require('node-xml');
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

function myput(link) {
    console.log(link.url);
    console.log("%j", link);
    var id = base64.encode(new Buffer(user+'+'+link.url));
    link.user = user;
    console.log(id);
    var req = http.request({
        hostname: server,
        port: port,
        method: 'PUT',
        path: '/'+db+'/'+id,
        headers: {
            Connection: 'close',
        }
    });
    req.write(JSON.stringify(link));
    req.on('error', function(e) {
      console.log('problem with request: ' + e.message);
    });
    req.on('response', function (response) {
        setTimeout(function () {
            response.on('data', function (chunk) {
                //console.log('BODY: ' + chunk);
            });
        }, 10);
    });
    try {
        req.end();
    }
    catch(err) {
        console.log(err);
    }
    setTimeout(function() {}, 1000);

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

var parser = new xml.SaxParser(function(cb) {
    var link = {};
    var state = '';
    cb.onStartElementNS(function(elem, attrs, prefix, uri, namespaces) {
        if (elem == 'A') {
            if (link.url != null)
            myput(link);
            link = {};
            for (a in attrs) {
                if (attrs[a][0] == 'ADD_DATE') {
                    link.saved = attrs[a][1];
                }
                if (attrs[a][0] == 'HREF') {
                    var uri = new URI(attrs[a][1]);
                    link.url = uri.normalize().toString();
                    link.type = (uri.suffix()) ? uri.suffix() : 'html',
                    link.status = 'imported',
                    link.url_parsed = {
                      protocol: uri.protocol(),
                      domain: uri.domain(),
                      subdomain: uri.subdomain(),
                      path: uri.segment(),
                      query: uri.query(),
                      fragment: uri.fragment(),
                    }
                }
                if (attrs[a][0] == 'PRIVATE') {
                    if (attrs[a][1] == '1') {
                        link.private = true;
                    }
                }
                if (attrs[a][0] == 'TAGS' && attrs[a][1] != '') {
                    link.tags = attrs[a][1].toLowerCase().split('[ ,]');
                }
            }
            state = 'a';
        }
        if (elem == 'DD') {
            state = 'dd';
        }
    });
    cb.onEndElementNS(function(elem, prefix, uri) {
        //state = '';
    });
    cb.onCharacters(function(chars) {
        //console.log(chars);
        if (state == 'dd') {
            link.description = chars;
        }
        if (state == 'a' && chars != '\n') {
            link.title = chars;
        }
    });
    cb.onError(function(msg) {
      util.log('<ERROR>'+JSON.stringify(msg)+"</ERROR>");
    });
});

//parser.parseFile(process.argv[2]);

var htmlparser = require('htmlparser');
var handler = new htmlparser.DefaultHandler(function (error, dom) {
});
var parser = new htmlparser.Parser(handler);

var html = fs.readFileSync(process.argv[2], { encoding: 'ascii' });
html = html.replace(/\n/g, '</DT>\n');
html = html.replace(/<\/DT>\s*<DD>/g, '\n<DD>');
//console.log(html);
parser.parseComplete(html);

var list = handler.dom[handler.dom.length-2].children[0].children;
for (x in list) {
  if (list[x].type == 'tag' && list[x].data == 'DT') {
    //console.log(list[x]);
    var link = parseURI(list[x].children[0].attribs.HREF);
    link.title = list[x].children[0].children[0].data;
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
    myput(link);
  }
}
