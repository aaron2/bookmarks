exports.list = function(req, res){
  function formatDate(t) {
    return (new Date(t)).toDateString();
  }

  var view = 'user/public';
  var authenticated = false;
  if (req.session.user && req.params.user == req.session.user) {
    view = 'user/all';
    authenticated = true;
  }
  var viewOpts = {}
  if (req.params.user != null) {
    viewOpts = {
      startkey: [ req.params.user ],
      endkey: [ req.params.user, {} ]
    }
  }
  global.db.bookmarks.view(view, viewOpts, function (err, rows) {
    //console.log(rows);
    res.render("taglist.jade", {
      links: rows,
      authenticated: authenticated,
      duration: global.common.format_duration,
    });
  });
};

