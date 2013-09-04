var http = require('http');
var cradle = require('cradle');

cradle.setup({
  host: '192.168.1.101',
  auth: {
    username: 'admin',
    password: 'admin',
  },
});
var bookmarks = new(cradle.Connection)().database('bookmarks');

var fulltext = {
  search: {
    all: {
      index: function(doc) {
        var ret = new Document();
        ret.add(doc.title, { analyzer: "snowball:English", boost: 1.3 });
        ret.add(doc.description, { analyzer: "snowball:English" });
        ret.add(doc.text, { analyzer: "snowball:English", boost: 0.8 });

        if (doc.url_parsed) {
          ret.add(doc.url_parsed.subdomain+' '+doc.url_parsed.domain+' '+doc.url_parsed.path.join(' '), { analyzer: 'simple' });
          ret.add(doc.url_parsed.domain, { field: 'domain', analyzer: "keyword" });
          ret.add(doc.url_parsed.protocol, { field: 'protocol', analyzer: "keyword" });
        }
        if (doc.tags) {
          ret.add(doc.tags.join(' '), { boost: 1.5, analyzer: "simple" });
          for (t in doc.tags) { ret.add(doc.tags[t], { field: 'tag' }); }
        }
        ret.add(new Date(doc.saved*1000), { field: 'date', type: 'date' });
        ret.add(doc.user, { field: 'user', analyzer: "keyword" });
        ret.add(doc.type, { field: 'type', analyzer: "keyword" });
        if (doc.status) {
          ret.add(doc.status[0], { field: 'status', analyzer: "keyword" });
        }
        ret.add((doc._attachments && doc._attachments.image) ? 'true' : 'false' , { field: 'hasimage', analyzer: "keyword" });
        return ret;
      }
    },
    notext_all: {
      index: function(doc) {
        var ret = new Document();
        ret.add(doc.title, { analyzer: "snowball:English", boost: 1.3 });
        ret.add(doc.description, { analyzer: "snowball:English" });

        if (doc.url_parsed) {
          ret.add(doc.url_parsed.subdomain+' '+doc.url_parsed.domain+' '+doc.url_parsed.path.join(' '), { analyzer: 'simple' });
          ret.add(doc.url_parsed.domain, { field: 'domain', analyzer: "keyword" });
          ret.add(doc.url_parsed.protocol, { field: 'protocol', analyzer: "keyword" });
        }
        if (doc.tags) {
          ret.add(doc.tags.join(' '), { boost: 1.5, analyzer: "simple" });
          for (t in doc.tags) { ret.add(doc.tags[t], { field: 'tag' }); }
        }
        ret.add(new Date(doc.saved*1000), { field: 'date', type: 'date' });
        ret.add(doc.user, { field: 'user', analyzer: "keyword" });
        ret.add(doc.type, { field: 'type', analyzer: "keyword" });
        if (doc.status) {
          ret.add(doc.status[0], { field: 'status', analyzer: "keyword" });
        }
        ret.add((doc._attachments && doc._attachments.image) ? 'true' : 'false' , { field: 'hasimage', analyzer: "keyword" });
        return ret;
      }
    }
  }
};

for (x in fulltext) {
  var fuck = function(x) {
    var id = '_design/'+x;
    bookmarks.get(id, function(err, doc) {
      if (err && err.error == 'not_found') {
        bookmarks.save(id, { views: {}, language: "javascript", fulltext: fulltext[x] }, function(err, save) {
          console.log(id);
          console.log(fulltext[x]);
          console.log(err);
          console.log(save);
        });
      } else {
        bookmarks.save(id, doc._rev, { views: {}, language: "javascript", fulltext: fulltext[x] }, function(err, save) {
          console.log(id);
          console.log(fulltext[x]);
          console.log(err);
          console.log(save);
        });
      }
    });
  }(x);
}
  
