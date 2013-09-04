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

var views = {
  user: {
    all: {
      map: function(doc) { emit([ doc.user, doc.saved ], doc); }
    },
    public: {
      map: function(doc) { if (doc.private != true) emit([ doc.user, doc.saved ], doc); }
    },
    tag_all: {
      map: function(doc) { for (t in doc.tags) { emit([doc.user, doc.tags[t], doc.saved], doc); } }
    },
    tag_public: {
      map: function(doc) { if (doc.private != true) for (t in doc.tags) { emit([doc.user, doc.tags[t], doc.saved], doc); } }
    }
  },
  links: {
    tag: {
      map: function(doc) { for (t in doc.tags) { emit(doc.user, doc.tags[t]); } }
    }
  },
  taglist: {
    user: {
      map: function(doc) { for (t in doc.tags) { emit([doc.user, doc.tags[t]], 1); } },
      reduce: function(keys, values) { return sum(values); }
    },
    public: {
      map: function(doc) {
        if (doc.private) {
          return;
        }
        for (t in doc.tags) {
          emit(doc.tags[t], 1);
        }
      },
      reduce: function(keys, values) {
        return sum(values);
      }
    }
  },
  url: {
    count: {
      map: function(doc) { emit(doc.url, 1); },
      reduce: function(key, values, rereduce) { return sum(values); }
    }
  }
};

for (x in views) {
  var fuck = function(x) {
    var id = '_design/'+x;
    bookmarks.get(id, function(err, doc) {
console.log(err);
      if (err && err.error == 'not_found') {
        bookmarks.save(id, views[x], function(err, save) {
          console.log(id);
          console.log(views[x]);
          console.log(err);
          console.log(save);
        });
      } else {
        bookmarks.save(id, doc._rev, views[x], function(err, save) {
          console.log(id);
          console.log(views[x]);
          console.log(err);
          console.log(save);
        });
      }
    });
  }(x);
}
  
