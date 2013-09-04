$(document).ready(function() {
  var path = window.location.pathname.match(/\/user\/([^?]+)/);
  var user = path[1];
  $.get('/api/v1/user/'+user+'.html', function(data) {
    for (post in data) {
        $("#content").html(data);
    }
  });
});

