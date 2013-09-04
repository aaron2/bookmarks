#!/usr/local/bin/node

var http = require('http');
var URI = require('URIjs');
var base64 = require('urlsafe-base64');
var parser = require('../lib/parser.js');

var cradle = require('cradle').setup({
  host: '192.168.1.101',
  auth: {
    username: 'admin',
    password: 'admin',
  }
});
var bookmarks = new(cradle.Connection)().database('bookmarks');

var user = 'aaronf';
var offset = 86400 * 5;


function update(doc, status, content) {
  var now = parseInt(new Date().getTime() / 1000);
  doc.status = [ status, now ];
  doc = attach(doc, 'content');
  bookmarks.save(doc._id, doc, function(err, res) {
    if (err) console.log('ERROR saving bookmark '+doc._id+': '+err);
    callback();
  });
}

function attach(doc, name, contentType, encoding, data) {
  if (!doc._attachments) doc._attachments = {};
  doc._attachments[name] = {
    data: new Buffer(data, encoding).toString('base64'),
    'content_type': contentType
  }
  return doc;
}

function parse() {
var htmlparser = require('htmlparser');
var handler = new htmlparser.DefaultHandler(function (error, dom) { });
var parser = new htmlparser.Parser(handler);

html = html.replace(/\n/g, '</DT>\n');
html = html.replace(/<\/DT>\s*<DD>/g, '\n<DD>');
//console.log(html);
parser.parseComplete(html);
}

bookmarks.view('user/all', { startkey: [ user ], endkey: [ user, {} ] }, function (err, rows) {
  var x = -1;
  var now = parseInt(new Date().getTime() / 1000);

  function process_one() {
    x++;
console.log('process_one '+x);
    if (x >= rows.length) process.exit();
    var doc = rows[x];
    if (doc.value.status[1] >= now - offset) {
      process_one();
      return;
    }
    console.log(doc.value.url);
    parser.parse(doc.value.url, function(err, res) {
//console.log(err, res);
//      process_one();
    });
  }
  
  process_one();
});
