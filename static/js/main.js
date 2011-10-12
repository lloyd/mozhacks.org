function displayManage() {
  $.get('/api/whoami', function (res) {
    if (res === null) {
      window.location.hash = "#auth";
      $("body > div").hide();
      $("#auth").fadeIn(400);
    } else {
      $("#who_are_you > img").attr('src', res.img);
      showControl(res.email);
    }
  }, 'json');
}

function showControl(email) {
  $("body > div").hide();
  $("#control").fadeIn(400);
  $("#control .name").text(email.substr(0, email.indexOf('@')));
  window.location.hash = "#manage";
}

// a handler that is passed an assertion after the user logs in via the
// browserid dialog
function gotVerifiedEmail(assertion) {
  // got an assertion, now send it up to the server for verification
  if (assertion !== null) {
    $.ajax({
      type: 'POST',
      url: '/api/login',
      data: { assertion: assertion },
      success: function(res, status, xhr) {
        if (!res.success) {
          alert("error logging you in: " + res.reason);
        } else {
          $("#who_are_you > img").attr('src', res.img);
          showControl(res.email);
        }
      },
      error: function(res, status, xhr) {
        alert("login failure: " + res.reason);
      }
    });
  }
}

// at startup let's check to see whether we're authenticated to
// myfavoritebeer (have existing cookie), and update the UI accordingly
$(document).ready(function() {

  // when the user clicks on 'add a hack'...
  $("#add_a_hack").click(function() {
    $("#manage > *").hide();
    $("#overview").fadeOut(200, function() {
      $("#manage").fadeIn(200);
    });

    // hit the api to see which div to display
    displayManage();
  });

  // when the user clicks sign in from the manage page...
  $("#sign_in").click(function() {
    navigator.id.getVerifiedEmail(gotVerifiedEmail);
  });

  // when the user clicks logout...
  $("#who_are_you a").click(function() {
    event.preventDefault();
    $.ajax({
      type: 'POST',
      url: '/api/logout',
      success: function() {
        // and then redraw the UI.
        document.location = '/';
      }
    });
  });

  // when the user clicks 'create hack'...
  $("#create_hack").click(function() {
    $("<tr><td><input class='hostname'/></td><td><input class='desc'></input></td><td><input type='checkbox'></td><td><div class='button rounded_box'>create</div></td></tr>")
      .appendTo("#control table");
  });

  // basic routing
  if (window.location.hash === '#manage' ||
      window.location.hash === '#auth')
  {
    displayManage();
  } else {
    $("#overview").fadeIn(400);
  }
});
