function displayManage() {
  $.get('/api/whoami', function (res) {
    if (res === null) {
      $("#auth").show();
    } else {
      showControl();
    }
  }, 'json');
}

function showControl() {
  alert("now you get the control pane!");
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
        showControl();
      },
      error: function(res, status, xhr) {
        alert("login failure" + res);
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

});
