var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , tag = require('./routes/tag')
  , http = require('http')
  , path = require('path')
  , account_v1 = require('./routes/account_v1')
  , link_v1 = require('./routes/link_v1')
  , tag_v1 = require('./routes/tag_v1')
  , image_v1 = require('./routes/image_v1');

ConnectCouchDB = require('connect-couchdb')(require('connect'));

var cradle = require('cradle').setup({
  host: '192.168.1.101',
  auth: {
    username: 'admin',
    password: 'admin',
  }
});
global = {
  db: {
    bookmarks: new(cradle.Connection)().database('bookmarks'),
    users: new(cradle.Connection)().database('users'),
  },
  base64: require('urlsafe-base64'),
  uri: require('URIjs'),
  common: require('./lib/common'),
  auth: require('./lib/auth'),
}

var app = express();

app.configure(function(){
  app.set('port', process.env.PORT || 8124);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  //app.set('view options', { layout: false });
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser('your secret here'));
  app.use(express.session({
    store: new ConnectCouchDB({
      host: '192.168.1.101',
      name: 'sessions',
      username: 'admin',
      password: 'admin',
    })
  }));
  //app.use(require('less-middleware')({ src: __dirname + '/public' }));
  app.use(express.static(path.join(__dirname, '/include')));
  app.use(app.router);
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.post('/login', function(req, res){
  global.auth.authenticate(req.body.username, req.body.password, function(err, user){
    if (user) {
      // Regenerate session when signing in to prevent fixation 
      req.session.regenerate(function(){
        req.session.user = user._id;
        req.session.settings = user.settings;
        user.last_login = parseInt(new Date().getTime() / 1000);
        global.db.users.save(user._id, user._rev, user);
        req.session.cookie.maxAge = 7 * 86400 * 1000;
        if (req.body.next) {
          res.redirect(req.body.next);
        } else {
          res.redirect('/');
        }
      });
    } else {
      req.session.error = 'Authentication failed, please check your username and password.';
      res.redirect('/login');
    }
  });
});
app.post('/logout', function(req, res){
  req.session.destroy();
  if (req.body.next) {
    res.redirect(req.body.next);
  } else {
    res.redirect('/');
  }
});

app.get('/', routes.index);
app.get('/login', function(req, res){
  res.render('login', { next: req.query.next });
});
app.post('/search', routes.search);
app.get('/search', routes.search);
app.get('/api/v1/search', routes.apiSearch);

app.get('/user', user.list);
app.get('/user/:user', user.list);
app.get('/user/:user/:tag', user.list);

app.get('/tag/:tag', tag.list);

app.get('/save', routes.save); // bookmarklet endpoint

app.get('/account', global.auth.restrict, account_v1.show);
app.post('/api/v1/account/edit', account_v1.edit);
app.get('/api/v1/account/get', global.auth.deny, account_v1.get);

app.get('/api/v1/link/get', link_v1.get);
app.post('/api/v1/link/add', global.auth.deny, link_v1.add);
app.post('/api/v1/link/edit', global.auth.deny, link_v1.edit);
app.post('/api/v1/link/delete', global.auth.deny, link_v1.delete);

app.get('/api/v1/image/info', image_v1.info);
app.get('/api/v1/image/get', image_v1.get);
app.post('/api/v1/image/update', image_v1.update);
app.post('/api/v1/image/delete', image_v1.delete);

//app.post('/api/v1/tag/count', tag_v1.count);


http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});

