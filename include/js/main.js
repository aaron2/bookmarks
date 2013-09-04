function addtag(to, tag) {
  tag = $.trim(tag);
  var tags = []
  $(to).children('.tag').each(function() {
    tags.push($(this).text())
  });
  if (tags.indexOf(tag) >= 0) return;
  $(to).append('<span class="tag badge"><i class=icon-tags></i>'+tag+'<i class=icon-remove></i></span>');
  $(to).find('i.icon-remove:last').click(function(e) {
    $(e.target).parent().remove();
  });
}

$(document).ready(function() {
  $('.tagsinput').keypress(function(e) {
    if (e.keyCode == 13) {
        addtag('#'+$(e.target).attr('tags-container'), $(e.target).val());
        $(e.target).val('');
    }
  });
  $('.dropdown-menu').find('form').click(function(e) {
    e.stopPropagation();
  });
  $('.navbar #logout').click(function(e) {
    $.post('/logout');
    document.location = '/';
  });
  $('form#login').find('input').keypress(function(e) {
    if (e.keyCode == 13) $('form#login').submit();
  });
  $('form#login').submit(function(e) {
    $('form#login').append('<input type=hidden name=next value='+document.location.pathname+'>');
  });
});


// add link modal dialogs
$(document).ready(function() {
  $('#addModal1').on('shown', function() {
    $('#formadd1url').focus()
  });
  $('#addModal1').on('hidden', function() {
    $('#formadd1url').val('')
  });
  $('#addModal1').find('form').submit(function() {
    $('#formadd1add').click();
    return false;
  });
  //$('#formadd1url').keypress(function(e) {
  //  $('#addModal1').find('.alert').hide('slide');
  //});
  $('#formadd1close').click(function(e) {
    $('#addModal1').find('.alert').hide();
  });
  $('#formadd1add').click(function(e) {
    var form = { parse: true, private: true, url: $('#formadd1url').val().trim() };
    if (form.url == '') return false;
    if (!form.url.match(/^[a-z]+:\/\//i)) form.url = 'http://'+form.url;
    $(e.target).button('loading');
    $('#addModal1').find('.alert').hide('slide');
    postJSON($('#formadd1').attr('action'), form, function(res) {
      $(e.target).button('reset');
      if (res.status != "ok") {
      } else {
        $('#addModal1').modal('hide');
        setInterval(200);
        $('#formadd2title').val(res.link.title);
        $('#formadd2description').val(res.link.description);
        $('#formadd2id').val(res.link._id);
        for (i in res.images) {
          $('#myCarousel > .carousel-inner').append('<div class=item><img src='+res.images[i]+'></div>');
        }
        if (res.images.length) {
          $('#myCarousel').carousel({ interval: 0 });
          $('#myCarousel').carousel('next');
        }
        if (res.link.type == 'image') {
          $('#formadd2noimg').prop('disabled', true);
          $('#addModal2').find('[data-slide]').hide();
        }
        $('#addModal2').modal('show');
      }
    }).fail(function(res) {
      console.log(res);
      var msg = 'Unknown error: '+res.statusText;
      if (res.status == 409) msg = 'That bookmark already exists';
      if (res.status == 400) msg = 'Could not fetch url - <a href=#>click here</a> to add anyway';
      $('#addModal1').find('.alert').html(msg).show('slide');
      $('#formadd1add').button('reset');
    });
  });

  $('#addModal2').on('shown', function() {
    $('#formadd2title').focus()
  });
  $('#addModal2').on('hidden', function() {
    $('#formadd2save').button('reset');
    $('#addModal2tags').empty();
    $('#myCarousel > ol').empty();
    $('#myCarousel > .carousel-inner').empty();
    $('#formadd2imgurl').removeClass('uneditable-input');
    $('#formadd2taginput').val('');
    $('formadd2noimg').removeAttr('checked');
    $('#addModal2').find('[data-slide]').show()
  });
  $('#formadd2cancel').click(function(e) {
    var f = $('#formadd2');
    $.post(f.attr('delete'), f.serialize());
  });
  $('#formadd2imgurl').keypress(function(e) {
    if (e.keyCode != 13) return;
    $('#myCarousel > .carousel-inner').append('<div class=item><img></div>');
    var i = $('#myCarousel > .carousel-inner').children(':last');
    $(i).attr('src', $('#formadd2imgurl').val());
    $('#formadd2imgurl').val('')
    $('#myCarousel').carousel($('#myCarousel > .carousel-inner').children().length - 1);
  });
  $('#formadd2noimg').change(function(e) {
    if ($('#formadd2noimg').is(':checked')) {
      $('#formadd2imgurl').val('').addClass('uneditable-input');
      $('#myCarousel').children().css('display', 'none');
    } else {
      $('#formadd2imgurl').removeClass('uneditable-input');
      $('#myCarousel').children().css('display', 'block');
    }
  });
  $('#formadd2save').click(function(e) {
if ($('#formadd2title').val() == '') return;
    $('#formadd2save').button('loading');
    var form = form2obj('#addModal2');
    form.tags = [];
    $('#addModal2tags').children('.tag').each(function(i) {
      form.tags.push($(this).text());
    });
    if ($('#formadd2taginput').val() !== undefined) form.tags.push($('#formadd2taginput').val());
    if (!$('#formadd2noimg').is(':checked')) {
      form.image = $('#myCarousel').find('.active > img').attr('src');
    }
    postJSON($('#formadd2').attr('action'), form, function(data) {
      $('#addModal2').modal('hide');
      addLink(data.link);
    });
  });
});


function addLink(data) {
  var c = $("div[class~=link]").get(0);
  $(c).clone().prependTo($(c).parent());
  var n = $("div[class~=link]").get(0);
  if ($('body').attr('auth') !== undefined && $('body').attr('auth') == $('body').attr('user')) {
    if ($('body').attr('tag') !== undefined) {
      if (data.tags.indexOf($('body').attr('tag')) >= 0) {
        fuck(n, data);
      }
      return;
    }
    fuck(n, data);
    return
  }
  // popup
}

function fuck(div, data) {
  $(div).attr('id', data._id);
  $(div).find('[class="main"]').attr('href', data.url).text(data.title);
  $(div).find('[class="domain"]').text(data.url_parsed.domain);
  $(div).find('[class="savedate"]').text(data.saved);
  $(div).find('[class="description"]').text(data.description);
  $(div).find('img').attr('src', (data._attachments && data._attachments.image) ? '/api/v1/image/get?id='+data._id : '/img/noimage.jpg');
  var t = $(div).find('[class="tags"]');
  $(t).empty();
  for (x in data.tags) {
    $(t).append('<span class="badge tag"><a href="/user/'+data.user+'/'+data.tags[x]+'"><i class=icon-tags></i>'+data.tags[x]+'</a></span>');
  }
}

// edit dialog
$(document).ready(function() {
  $('.link .edit').click(function(e) {
    var id = $(e.target).parents('.link').attr('id');
    $('#formeditid').val(id);
    $.get('/api/v1/link/get', { id: id }, function(data) {
      $('#formedittitle').val(data.link.title);
      for (t in data.link.tags) {
        addtag('#editModaltags', data.link.tags[t]);
      }
      if (data.link._attachments && data.link._attachments.image) {
        $('#formeditimage').attr('src', '/api/v1/image/get?id='+id);
      } else {
        $('#formeditimage').attr('src', '/img/noimage.jpg');
        $('#formeditnoimg').prop('disabled', true);
      }
      $('#formediturl').val(data.link.url);
      $('#formeditdescription').val(data.link.description);
      if (data.link.private) $('#formeditprivate').prop('checked', true);
      $('#editModal').modal('show');
    });
  });
  $('#formeditimgurl').keypress(function(e) {
    if (e.keyCode != 13) return;
    $('#formeditimage').attr('src', $('#formeditimgurl').val());
    $('#formeditimgurl').val('')
    $('#formeditnoimg').prop('disabled', false);
  });
  $('#formeditnoimg').change(function(e) {
    if ($('#formeditnoimg').is(':checked')) {
      $('#formeditimgurl').val('').addClass('uneditable-input');
      $('#formeditimage').data('original_image', $('#formeditimage').attr('src'));
      $('#formeditimage').attr('src', '/img/noimage.jpg');
    } else {
      $('#formeditimgurl').removeClass('uneditable-input');
      $('#formeditimage').attr('src', $('#formeditimage').data('original_image'));
    }
  });
  $('#formeditsave').click(function(e) {
    $('#formeditsave').button('loading');
    var form = form2obj('#editModal');
    form.tags = [];
    $('#editModaltags').children('.tag').each(function(i) {
      form.tags.push($(this).text());
    });
    if ($('#formedittaginput').val() != '') form.tags.push($('#formedittaginput').val());
    if (!$('#formeditnoimg').is(':checked') && $('#formeditimage').attr('src') != '/img/noimage.jpg') {
      form.image = $('#formeditimage').attr('src');
    }
    postJSON($('#formedit').attr('action'), form, function(data) {
      fuck($('#'+data.link._id), data.link);
      $('#editModal').modal('hide');
    });
  });
  $('#editModal').on('hidden', function() {
    $('#formeditsave').button('reset');
    $('#editModaltags').empty();
    $('#formeditprivate').prop('checked', false);
    $('#formeditnoimg').prop('checked', false);
    $('#formeditimgurl').removeClass('uneditable-input');
    $('#formedittaginput').val('');
  });
  $('#formeditdelete').click(function(e) {
    $('#formeditsave').button('loading');
    $.post($(e.currentTarget).attr('href'), { id: $('#formeditid').val() }, function(data) {
      $('#editModal').modal('hide');
      $('#'+$('#formeditid').val()).remove();
    })
    return false;
  });
});

function form2obj(form) {
  obj = {};
  $(form).find('[name]').each(function(i) {
    obj[$(this).attr('name')] = $(this).val();
  });
  $(form).find(':checkbox[name]').each(function(i) {
    obj[$(this).attr('name')] = $(this).is(':checked');
  });
  return obj;
}

function postJSON(url, obj, callback) {
  return $.ajax(url, { type: 'POST', headers: { 'Content-Type': 'application/json' }, data: JSON.stringify(obj), success: callback });
}

$(document).ready(function() {
  $('.settings-view i').click(function(e) {
    postJSON('/api/v1/account/edit', { settings: { view:  $(e.currentTarget).attr('name') } }, function(data) {
      location.reload();
    });
  });
//  $('body').on('mouseenter', 'div.img-polaroid', function() {
//    $(this).siblings('.title').hide('slideUp');
//  }).on('mouseleave', 'div.img-polaroid', function() {
//    $(this).siblings('.title').show('slideDown');
//  });
});

