exports.list = function(req, res){
  //console.log(req);
  if (req.params.user == null) {
    if (req.session.user != null) {
      res.redirect('/user/'+req.session.user);
    }
    else {
      res.redirect('/');
    }
    return;
  }

  var viewOpts = {
    descending: true,
  }
  if (req.params.tag) {
    var view = (req.session.user && req.params.user == req.session.user) ? 'user/tag_all' : 'user/tag_public';
    viewOpts.startkey = [ req.params.user, req.params.tag, {} ];
    viewOpts.endkey = [ req.params.user, req.params.tag ];
  } else {
    var view = (req.session.user && req.params.user == req.session.user) ? 'user/all' : 'user/public';
    viewOpts.startkey =  [ req.params.user, {} ];
    viewOpts.endkey = [ req.params.user ];
  }
  layout = (req.session.settings && req.session.settings.view) || 'compact';
  global.db.bookmarks.view(view, viewOpts, function (err, rows) {

    tagCount = {}
    for (x in rows) {
      for (t in rows[x].value.tags) {
        if (!tagCount[rows[x].value.tags[t]]) {
          tagCount[rows[x].value.tags[t]] = 1;
        } else {
          tagCount[rows[x].value.tags[t]]++;
        }
      }
    }
    var tags = [];
    for (x in tagCount)
      tags.push([ x, tagCount[x] ]);
    tags = tags.sort(function(a, b) {return b[1] - a[1]});
    //if (req.params.tag && tags[0] && tags[0][0] == req.params.tag) tags = tags.slice(1);

    res.render('list_'+layout+'.jade', {
      title: 'Bookmarks for '+req.params.user,
      links: rows,
      tags: tags.slice(0, 30),
      user: req.params.user,
      tag: req.params.tag,
      authenticated: req.session.user,
      func: global.common,
    });
  });
};

