/*
	PhoneGap v2.7.0
    http://www.apache.org/licenses/LICENSE-2.0
*/

var deviceInfo = function() {
    document.getElementById("platform").innerHTML = device.platform;
    document.getElementById("version").innerHTML = device.version;
    document.getElementById("uuid").innerHTML = device.uuid;
    document.getElementById("name").innerHTML = device.name;
    document.getElementById("width").innerHTML = screen.width;
    document.getElementById("height").innerHTML = screen.height;
    document.getElementById("colorDepth").innerHTML = screen.colorDepth;
};

var getLocation = function() {
    var suc = function(p) {
        alert(p.coords.latitude + " " + p.coords.longitude);
    };
    var locFail = function() {
    };
    navigator.geolocation.getCurrentPosition(suc, locFail);
};

var beep = function() {
    navigator.notification.beep(2);
};

var vibrate = function() {
    navigator.notification.vibrate(0);
};

function roundNumber(num) {
    var dec = 3;
    var result = Math.round(num * Math.pow(10, dec)) / Math.pow(10, dec);
    return result;
}

var accelerationWatch = null;

function updateAcceleration(a) {
    document.getElementById('x').innerHTML = roundNumber(a.x);
    document.getElementById('y').innerHTML = roundNumber(a.y);
    document.getElementById('z').innerHTML = roundNumber(a.z);
}

var toggleAccel = function() {
    if (accelerationWatch !== null) {
        navigator.accelerometer.clearWatch(accelerationWatch);
        updateAcceleration({
            x : "",
            y : "",
            z : ""
        });
        accelerationWatch = null;
    } else {
        var options = {};
        options.frequency = 1000;
        accelerationWatch = navigator.accelerometer.watchAcceleration(
                updateAcceleration, function(ex) {
                    alert("accel fail (" + ex.name + ": " + ex.message + ")");
                }, options);
    }
};

var preventBehavior = function(e) {
    e.preventDefault();
};

function dump_pic(data) {
    var viewport = document.getElementById('viewport');
    console.log(data);
    viewport.style.display = "";
    viewport.style.position = "absolute";
    viewport.style.top = "10px";
    viewport.style.left = "10px";
    document.getElementById("test_img").src = data;
}

function fail(msg) {
    alert(msg);
}

function show_pic() {
    navigator.camera.getPicture(dump_pic, fail, {
        quality : 50
    });
}

function close() {
    var viewport = document.getElementById('viewport');
    viewport.style.position = "relative";
    viewport.style.display = "none";
}

function contacts_success(contacts) {
    alert(contacts.length
            + ' contacts returned.'
            + (contacts[2] && contacts[2].name ? (' Third contact is ' + contacts[2].name.formatted)
                    : ''));
}

function get_contacts() {
    var obj = new ContactFindOptions();
    obj.filter = "";
    obj.multiple = true;
    navigator.contacts.find(
            [ "displayName", "name" ], contacts_success,
            fail, obj);
}

function check_network() {
    var networkState = navigator.network.connection.type;

    var states = {};
    states[Connection.UNKNOWN]  = 'Unknown connection';
    states[Connection.ETHERNET] = 'Ethernet connection';
    states[Connection.WIFI]     = 'WiFi connection';
    states[Connection.CELL_2G]  = 'Cell 2G connection';
    states[Connection.CELL_3G]  = 'Cell 3G connection';
    states[Connection.CELL_4G]  = 'Cell 4G connection';
    states[Connection.NONE]     = 'No network connection';

    confirm('Connection type:\n ' + states[networkState]);
}

var watchID = null;

function updateHeading(h) {
    document.getElementById('h').innerHTML = h.magneticHeading;
}

function toggleCompass() {
    if (watchID !== null) {
        navigator.compass.clearWatch(watchID);
        watchID = null;
        updateHeading({ magneticHeading : "Off"});
    } else {        
        var options = { frequency: 1000 };
        watchID = navigator.compass.watchHeading(updateHeading, function(e) {
            alert('Compass Error: ' + e.code);
        }, options);
    }
}

function init() {
    // the next line makes it impossible to see Contacts on the HTC Evo since it
    // doesn't have a scroll button
    // document.addEventListener("touchmove", preventBehavior, false);
//    document.addEventListener("deviceready", deviceInfo, true);
    document.addEventListener("deviceready", onDeviceReady, false);
}


/*
 * KursKoffer Code Procedure
 * Below list of functions are main part of the app
 * Authentication, Calendar Sync, Moodle Course List, FirsAid, Settings etc.
 */
function onDeviceReady() {
	console.log("Cordova is ready! Cordova is ready!");
	navigator.splashscreen.hide();
    // register the event listener
	document.addEventListener("backbutton", onBackKeyDown, false);
}

/* Moving to the appropriate course chosen by user */
function moveToCourse() {
	var form = $('#courseForm');
	var course = $('#coursetype', form).val();
	if (course == '1') {
		$.mobile.changePage("index.html#paramedicPage", {transition: "flow"});
	} else if (course == '2') {
		$.mobile.changePage("index.html#samariterbundPage", {transition: "flow"});
	} else if (course == '3') {
		alert('This course is not implemented yet');
	}
}

/* Checking the user-entered parameters */
function handleLogin() {
	console.log("Step 1 Orif Orif");
	var form = $("#paramedicLogin");
	//disable the button so we can't resubmit while we wait
	$("#submitButton", form).attr("disabled", "disabled");
	var u = $("#username", form).val();
	var p = $("#password", form).val();
	if(u!= '' && p!= '') {
		console.log("Step 2 Orif Orif");
		$.post("http://10.0.2.2/kurskoffer/checklogin.php", {username:u, password:p}, function(data, textStatus) {
			console.log("returned from post " + textStatus);
			if(data!='') {
				console.log("Step 3 Orif Orif");
				//store user data (uname, passwd and token)
				localStorage.setItem("username", "" +u+ "");
				localStorage.setItem("password", "" +p+ "");
				localStorage.setItem("token", ""+data.token+"");
				
				$.mobile.changePage("index.html#homePage1", {transition: "slide"});
			} else {
				console.log("Step 4 Orif Orif");
				navigator.notification.alert("Anmeldung fehlgeschlagen! Bitte probieren Sie noch einmal", function() {});
				$("#submitButton").removeAttr("disabled");
			}
		}, "json");
	} else {
		navigator.notification.alert("Geben Sie Irhen Benutzername und Passwort", function() {});
		$("#submitButton").removeAttr("disabled");
	}
	return false;
}

/* Schedules Sync device calendar with moodle (import of iCal) */
function doSync() {
	var usertkn = localStorage.getItem("token");
	if(usertkn != '') {
		$.post("http://localhost/kurskoffer/kalender.php", {token:usertkn}, function(data) {
			if(data!='') {
				//store calendar data to the device
				// bla bla bla
			} else {
				navigator.notification.alert("Sync ist fehlgeschlagen! Bitte probieren Sie noch einmal", function() {});
			}
		}, "json");
	} else {
		navigator.notification.alert("Error: can not find user token", function() {});
	}
}

/* Course: MenuButton procedure */
var action = '', jsonString = '';
function courseList() {
	//'read action' from file
	action = 'r'; readWriteFile();
	//filled 'myData' variable with contents
	var myData = JSON.parse(jsonString);
	
	if (myData != '' || myData != undefined) {
		var dContent = function(event) {
		    $c_content.html($(this).data('content'));
		}
		
		var $c_list = $('#courseList');
		var html = '';
		var chapterList = [];
		
		$c_list.on('click', 'div', dContent);
		
		var first = true;
		$.each(myData, function(index, item) {
		    if ($.inArray(item.chapter, chapterList) === -1) {
		        chapterList.push(item.chapter);
		        if(!first) { html += '</div>'; }
		        html += '<div data-role="collapsible"><h3>' + item.chapter + '</h3>';
		        first = false;
		    }
		    html += '<p><a href="#singleContent" onclick="sTopic(\'' + item.chapter + '\', \'' + item.title + '\')">' + item.title + '</a></p>';
		});
		if(!first) { html += '</div>'; }
		$c_list.html(html);
	} else {
		$('#cList').html('<div align="center">Der Kurs ist leer, bitte aktualisieren</div>');
	}
}

/* Display 'content' JSON element related to the clicked 'title' */
function sTopic(chapter, title) {
	//'read action' from file
	action = 'r'; readWriteFile();
	//filled 'myData' variable with contents
	var myData2 = JSON.parse(jsonString);
	
	for (var i = 0; i < myData2.length; i++) {
	    if (myData2[i].chapter == chapter && myData2[i].title == title) {
	    	$('.tTitle').html(myData2[i].title);
	    	$('#cContent').html(myData2[i].content);
	    }
	}
}

/* Get CourseList from the Moodle */
var jsonData = '';
function getCourseList() {
	var usertkn = localStorage.getItem("token");
	if(usertkn != '') {
		$.post("http://10.0.2.2/kurskoffer/transform.php", {token:usertkn}, function(data) {
			if(data!='') {
				//call to 'saveCourseToFile()' function
				jsonData = data;
				action = 'w'; readWriteFile();
			} else {
				navigator.notification.alert("Error: server response is emty", function() {});
			}
		}, "json");
	} else {
		navigator.notification.alert("Error: can not find user token", function() {});
	}
	return false;
	courseList();
}

/* Cordova: File API - read & save data into storeage (json) */
function readWriteFile() {
	window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, onFSSuccess, onFSError);
}
function onFSSuccess(fileSystem) {
    console.log("The root of file system: " +fileSystem.root.name);
    fileSystem.root.getFile("course.oerk", {create:true, exclusive:false}, gotFileEntry, onFSError);
}
//FileReader/FileWriter (Cordova API's)
function gotFileEntry(fileEntry) {
	console.log("checkpoint: got file - Read or Write");
	if (action == 'r') fileEntry.file(gotFile, onFSError);
	if (action == 'w') fileEntry.createWriter(gotFileWriter, onFSError); 
}
//FileReader/ ReadAsText
function gotFile(file) {
	readAsText(file);
}
function readAsText(file) {
	var reader = new FileReader();
	reader.onloadend = function(evt) {
		console.log("Read as text");
		console.log(evt.target.result);
		jsonString = evt.target.result;
	};
	reader.readAsText(file);
}
//FileWriter
function gotFileWriter(writer) {
	writer.onwrite = function(evt) {
		console.log("checkpoint: write success!");
	};
	writer.write(jsonData);
}
function onFSError(err) {
	console.log(err.code);
}

function wikiGenerate() {
	var wtopic = 'Haut';
	$.getJSON('http://de.wikipedia.org/w/api.php?action=parse&page='+wtopic+'&prop=text&format=json&callback=?', function(data) {
		// display generated content in 'id=cContent'
        $('#cContent').html(data.parse.text['*']);
        $('#cContent').find("a:not(.references a)").attr("href", function(){ return "http://de.m.wikipedia.org" + $(this).attr("href"); });
        $('#cContent').find("a").attr("target", "_blank");
    });
    return false;
}

/* FirstAid: MenuButton procedure */
//function firstAid() {
//	window.open('https://play.google.com/store/apps/details?id=at.fh.firstaid');
//	window.plugins.webintent.startActivity({
//		action: WebIntent.ACTION_VIEW,
//		url: 'at.fh.firstaid'},
//	    function() {},
//	    function() {window.open('https://play.google.com/store/apps/details?id=at.fh.firstaid')};
//	    function() {alert('Failed to open URL via Android Intent')};
//	});
//}

/* Saving the changes in SETTINGS */
function saveSettings() {
	var form = $("#settingsForm");
	var setS = $("#sound", form).val();
	var setV = $("#vibration", form).val();
	// delete previous 'sound' & 'vibra'
	localStorage.removeItem("sound");
	localStorage.removeItem("vibra");
	// set new 'sound' & 'vibra' values
	localStorage.setItem("sound", ""+setS+"");
	localStorage.setItem("vibra", ""+setV+"");
	
	alert('Settings are saved ' +setS+ ' & '+setV, '', 'Info', 'Ok');
}

/* Loading the SETTINGS data */
var getSound = localStorage.getItem("sound");
var getVibra = localStorage.getItem("vibra");
function loadSettings() {
	var form = $("#settingsForm");
	if(getSound != undefined && getVibra != undefined) {
		console.log("Load settings data HURRAY");
		alert("sound "+getSound+ " vibra"+getVibra);		
		if(getSound == "1") {
			document.getElementById('sound').options[1].selected = true;
		}
		if(getVibra == "1") {
			document.getElementById('vibration').options[1].selected = true;
		}
	} else {
		alert("Settings are 'default'");
	}
}

/* On backButton click Exit App */
function onBackKeyDown() {
	if($.mobile.activePage.is("#loginPage")) {
		navigator.app.exitApp(); // Exit app if current page is loginPage
	} else {
		navigator.app.backHistory(); // Go back in history in any other case
	}
}
function doLogout() {
	history.go(-(history.length - 1));
	window.location.replace("index.html");
}
