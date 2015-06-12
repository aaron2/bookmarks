var urlParams;
(window.onpopstate = function () {
    var match,
        pl     = /\+/g,  // Regex for replacing addition symbol with a space
        search = /([^&=]+)=?([^&]*)/g,
        decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
        query  = window.location.search.substring(1);

    urlParams = {};
    while (match = search.exec(query))
       urlParams[decode(match[1])] = decode(match[2]);
})();

$(document).ready(function() {
  $('#formadd2').attr('action', '/bookmarks/api/v1/link/add').attr('delete', '');
  $('#formadd2').append('<input type=hidden name=parse value=true>');
  $('#formadd2id').remove();
  $('#formadd2').append('<input type=hidden name=url value='+urlParams.url+'>');
  $('#formadd2title').val((urlParams.title) ? urlParams.title : urlParams.url);
  $('#formadd2url').val(urlParams.url);
  $('#formadd2description').val(urlParams.description);
  $('#addModal2').modal();
  $('#addModal2').on('hidden', function() { window.parent.postMessage("destroy_bookmarklet","*") });
  $('#myCarousel').carousel({ interval: 0 });
  $('#myCarousel').carousel('next');

  $('#loginModal').modal();
  $('#loginModal').on('hidden', function() { window.parent.postMessage("destroy_bookmarklet","*") });
  $('#loginModal').on('shown', function() { $('#username').focus() });
  $('#loginModal').find('input').keypress(function(e) {
    if (e.keyCode == 13) $('#loginModal').find('form').submit();
  });


});
