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
  updateMyHacks();
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

function buildEditableRow(name, cname, desc, viz) {
  return $("<tr class='editable'/>")
    .append($("<td/>").append($("<input class='name'/>").val(name)))
    .append($("<td/>").append($("<input class='host'/>").val(cname)))
    .append($("<td/>").append($("<input class='desc'/>").val(desc)))
    .append("<td><input class='viz' type='checkbox'" +
            (viz ? " CHECKED" : "") + "></td>")
    .append("<td><div class='button rounded_box'>save</div></td>");
}


function buildRow(name, cname, desc, viz) {
  return $("<tr class='static'/>")
    .append("<td class='name'>" + name + "</td>")
    .append("<td class='host'>" + cname + "</td>")
    .append("<td class='desc'>" + desc + "</td>")
    .append("<td class='viz'>" + viz + "</td>")
    .append("<td><div class='button rounded_box'>edit</div><div class='button rounded_box'>delete</div></td></tr>");
}

function rebindButtons() {
  $("#control table div.button").unbind();
  $("#control table div.button").click(manipulateRecord);
}

function updateMyHacks() {
  $("#control table tr:not(:first-child)").remove();
    $.ajax({
      type: 'POST',
      url: '/api/mine',
      success: function(res, status, xhr) {
        if (!res.success) {
          alert("error listing your hacks: " + res.reason);
        } else {
          for (var i = 0; i < res.hacks.length; i++) {
            buildRow(
              res.hacks[i].name,
              res.hacks[i].cname,
              res.hacks[i].desc,
              res.hacks[i].viz).appendTo("#control table");
          }
          rebindButtons();
        }
      },
      error: function(res, status, xhr) {
        alert("error listing your hacks: " + res.reason);
      }

    });
}

function extractDataFromRow(row) {
  if (row.hasClass('editable')) {
    return {
      name: row.find(".name").val(),
      host: row.find(".host").val(),
      desc: row.find(".desc").val(),
      viz:  row.find(".viz").attr('checked') ? true : false
    };
  } else {
    return {
      name: row.find(".name").text(),
      host: row.find(".host").text(),
      desc: row.find(".desc").text(),
      viz:  JSON.parse(row.find(".viz").text())
    };
  }
}

function manipulateRecord() {
  if ($(this).text() === 'save') {
    // user is trying to save a record (new or existing)
    var row = $(this).parent().parent();

    $.ajax({
      type: 'POST',
      url: '/api/save',
      data: extractDataFromRow(row),
      success: function(res, status, xhr) {
        if (!res.success) {
          alert("couldn't save record: " + res.reason);
        } else {
          updateMyHacks();
        }
      },
      error: function(res, status, xhr) {
        alert("failed to save record: " + res.reason);
      }
    });
  } else if ($(this).text() === 'delete') {
    // user is trying to delete a record
  } else if ($(this).text() === 'edit') {
    // user is trying to edit a record
    var row = $(this).parent().parent();
    var data = extractDataFromRow(row);
    row.replaceWith(buildEditableRow(data.name, data.host,
                                     data.desc, data.viz));
    rebindButtons();
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
  $("#who_are_you a").click(function(event) {
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
    buildEditableRow("", "", "", true).appendTo("#control table");
    // re-bind all existing buttons
    rebindButtons();
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
