/*
	PhoneGap v2.7.0
    http://www.apache.org/licenses/LICENSE-2.0
*/

var LOCAL = false;
var KURSKOFFER_URL = "http://cloud.c3lab.tk.jku.at/kurskoffer/";

if(LOCAL) {
	// adjust some settings if we are running in local mode
	KURSKOFFER_URL = "http://10.0.2.2/kurskoffer/"
}

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
    document.addEventListener("deviceready", onDeviceReady, false);
}

/**
 * Progress Model
 * 
 * it stores the progress for each topic
 */
function ProgressModel(user) {
	this.username = user;
	
	/** my read topic count */
	this.readTopics = null;
	
	/** overall topic count */
	this.overallTopics = null;
	
	/** how many have a better score */
	this.countHigher = null;
	
	/** how many have lower score */
	this.countLower = null;
	
	/** how many have the same score */
	this.countSame = null;
	
	/** call this whenever a topic is touched */
	this.trackAccess = function(chapter) {
		var model = this;
		$.post(KURSKOFFER_URL + "postProgress.php", { username:this.username, chapter:chapter }, function(data) {
			model.getProgress();
		});
	};
	
	/** Private method that retrieves progress from backend */
	this._retrieveProgress = function(model) {
		jQuery.post(KURSKOFFER_URL + 'getProgress.php', {
			username:this.username
		}, function(data) {
			data = jQuery.trim(data);
			if(data != '') {
				var result = JSON.parse(data);
				// the database query retrieves this as string
				model.readTopics = parseFloat(result.readTopics);
				model.overallTopics = result.topicCount;
				model.countHigher = result.countHigher;
				model.countLower = result.countLower;
				model.countSame = result.countSame;
				console.log('readTopics ' + model.readTopics + ' overallTopics ' + model.overallTopics);
				model._renderProgress();
			}else{
				console.log('did not retrieve a progress');
			}
		});
	};
	
	/** render Progress to progress bar */
	this._renderProgress = function() {
		console.log('rendering progress to ui ' + this.readTopics);
		$('#progressReadTopics').html('You have read ' + this.readTopics + ' topics out of ' + this.overallTopics + ' available topics');
		$('#progressOverallTopics').html('You are doing better than ' + this.countLower + ' other users. You are on the same score with ' + this.countSame + ' other users and ' + this.countHigher + ' users have a better score than you');
	};
	
	/** Get Progress from service backend */
	this.getProgress = function() {
		console.log('requesting progress from backend');
		this._retrieveProgress(this);
	};
	
	/** Render the highcarts diagrams */
	this.updateCharts = function() {
		var model = this;
		// clean chart
		$('#progressChartReading').html('');
		$('#progressChartReading').highcharts({
            chart: {
                plotBackgroundColor: null,
                plotBorderWidth: null,
                plotShadow: false,
                credits: {enabled: false}
            },
            title: {
                text: 'Learning Progress'
            },
            tooltip: {
        	    pointFormat: '{series.name}: <b>{point.percentage}%</b>',
            	percentageDecimals: 1
            },
            plotOptions: {
                pie: {
                    allowPointSelect: true,
                    cursor: 'pointer',
                    dataLabels: {
                        enabled: true,
                        color: '#000000',
                        connectorColor: '#000000',
                        formatter: function() {
                            return '<b>'+ this.point.name +'</b>';
                            // : '+ this.percentage +' %'
                        }
                    }
                }
            },
            series: [{
                type: 'pie',
                name: 'Learning Progress',
                data: [
                    ['Read',   model.readTopics],
                    ['Unread', model.overallTopics - model.readTopics]
                ]
            }]
        });
	};
}

/**
 * Datamodel of Kurskoffer
 * 
 * it is able to store and load some data from and to local storage
 * 
 * @param u
 * @param p
 * @param t
 * @returns
 */
function KofferModel(u, p, t, course) {
	
	/** Just a static name for the model */
	this.kofferName = 'Kurskoffer';
	
	/** User Information */
	this.username = jQuery.trim(u);
	this.password = jQuery.trim(p);
	this.token = jQuery.trim(t);
	this.course = course;
	
	/** JSON based data model */
	this.jsonModel = null;
	
	/** parsed model -> we did this way too often in the code */
	this.parsedModel = null;
	
	/** If not null we call this function when we got new json data */
	this.renderingListener = null;
	
	/** Create a progress model */
	this.progressModel = new ProgressModel(this.username);
	
	/** Print basic information about this model to console */
	this.logInfo = function() {
		console.log('kofferName: ' + this.kofferName);
	};
	
	/** Store login data to local storage */
	this.store = function() {
		console.log('store to local storage');
		localStorage.setItem('username', this.username);
		localStorage.setItem('password', this.password);
		localStorage.setItem('token', this.token);
		localStorage.setItem('course', this.course);
	};
	
	/** Check wether we are handling a string 'null' */
	this._checkNullString = function(value) {
		if(value == 'null') {
			return null;
		}
		return value;
	};
	
	/**
	 * Read login data from local storage
	 * Does not read token, since this needs to be retrieved from moodle again
	 *  */
	this.load = function() {
		console.log('read from local storage');
		this.username = this._checkNullString(localStorage.getItem('username'));
		this.password = this._checkNullString(localStorage.getItem('password'));
		this.course = this._checkNullString(localStorage.getItem('course'));
	};
	
	/**
	 * Reset the model to logout user
	 */
	this.logout = function() {
		// reseting data
		this.username = null;
		this.password = null;
		this.token = null;
		this.course = null;
		// store null values to localstorage
		this.store();
	};
	
	/**
	 * Return users name
	 */
	this.getUserName = function() {
		return this.username;
	};
	
	/**
	 * Return password
	 */
	this.getPassword = function() {
		return this.password;
	};
	
	/**
	 * Return authentication token
	 */
	this.getToken = function() {
		return this.token;
	};
	
	/**
	 * Return the selected course
	 */
	this.getCourse = function() {
		return this.course;
	};
	
	/**
	 * Check if credentials are set (were loaded form local storage)
	 */
	this.hasCredentials = function() {
		return this.username != null;
	};
	
	/**
	 * Private Method that performs a file system request
	 * writing may be true or false to indicate if the model is written or read
	 * we need to pass the model (object/this) that gets loaded or stored
	 */
	this._requestFileSystem = function(writing, model) {
		console.log('requesting access to local filesystem');
		window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function(filesystem) {
			console.log('file system access was granted');
			model._requestFile(filesystem, 'course.oerk', writing, model);
		}, function(err) {
			console.log('file system access was denied with error ' + err.code);
			navigator.notification.alert('Your system does not support file system access we cannot operate in offline mode!', function() {});
		});
	};
	
	/**
	 * Private Method that performs the details of file handling
	 */
	this._requestFile = function(filesystem, filename, writing, model) {
		console.log('requesting access to ' + filename + ' for ' + (writing ? 'writing' : 'reading'));
		filesystem.root.getFile(filename, {create:true, exclusive:false}, function(file) {
			console.log('access to ' + filename + ' was granted');
			if(!writing) {
				file.file(function(file) {
					var reader = new FileReader();
					reader.onloadend = function(evt) {
						model.setJsonModel(evt.target.result);
						console.log('file was read and set as model.jsonModel');
					};
					reader.readAsText(file);
				}, function() {
					console.log('error on reading file - perhaps not existent or empty');
					// it is only null on a freshly constructed object
					if(model.jsonModel == null) {
						model.loadJsonModelFromService();
					}
				});
			}else{
				file.createWriter(function(writer) {
					writer.write(model.jsonModel);
				}, function() {
					console.log('error on writing file - we do not report this to the user');
				});
			}
		}, function() {
			console.log('access to ' + filename + ' was denied');
			navigator.notification.alert('Your system does not support file system access we cannot operate in offline mode!', function() {});
		});
	};

	/** Check whether a model was correctly loaded from local storage or from the webservice */
	this.isModelLoaded = function() {
		return this.jsonModel != null;
	};
	
	/** Loads the Json from local file */
	this.loadJsonModel = function() {
		this._requestFileSystem(false, this);
	};
	
	/** Stores the model to the filesystem */
	this.storeJsonModel = function() {
		this._requestFileSystem(true, this);
	};
	
	/** Private Method worker for: Load the Json Model from remote service */
	this._loadJsonModelFromService = function(model) {
		if(this.token != '') {
			$.post(KURSKOFFER_URL + "transform.php", { token:this.token }, function(data) {
				if(data!='') {
					// set to model for application
					// TODO should we check here if we got correct JSON code?
					model.setJsonModel(data);
					// if listener is not null call it to render
					if(model.renderingListener != null) {
						model.renderingListener(model.getModel());
						model.renderingListener = null;
					}
					// write to local file
					model.storeJsonModel();
				} else {
					navigator.notification.alert("Error: server response is emty", function() {});
				}
			}, "json");
		}else{
			console.log('Error no token was set');
			navigator.notification.alert("Error: Cannot access Moodle no user token was set", function() {});
		}
	};
	
	/** Allows to set a rendering listener */
	this.setRenderingListener = function(listener) {
		this.renderingListener = listener;
	};
	
	/** Load the Json Model from remote service */
	this.loadJsonModelFromService = function() {
		this._loadJsonModelFromService(this);
	};
	
	/** Return the currently loaded JSON model */
	this.getJsonModel = function() {
		return this.jsonModel;
	};
	
	/** Set a new json model retrieved from local Storage or from the moodle service */
	this.setJsonModel = function(json) {
		this.jsonModel = json;
		this.parsedModel = null;
	};
	
	/** Get the parsed model for rendering or access, parsing is peformed on demand if neccessary */
	this.getModel = function() {
		if(!this.isModelLoaded()) {
			return undefined;
		}else{
			if(this.parsedModel == null) {
				this.parsedModel = JSON.parse(this.getJsonModel());
			}
			return this.parsedModel;
		}
	};
	
	/** Returns the initialized progress model */
	this.getProgress = function() {
		return this.progressModel;
	};
}

var kofferModel = null;

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
	kofferModel = new KofferModel(null, null, null, null);
	kofferModel.load();
	if(kofferModel.hasCredentials()) {
		// if credentials were loaded from local storage put the to form
		var form = $('#paramedicLogin');
        $('#username', form).val(kofferModel.getUserName());
        $('#password', form).val(kofferModel.getPassword());
        if(kofferModel.getCourse() != null) {
        	// if a course is saved in local storage just move to the correct login page
        	form = $('#courseForm');
        	$('#coursetype, form').val(kofferModel.getCourse());
        	moveToCourse();
        }
	}else{
		var form = $('#paramedicLogin');
		$('#username', form).val('');
		$('#password', form).val('');
	}
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
		$.mobile.changePage("index.html#armeniahistoryPage", {transition: "flow"});
	}
}

function handleLoginSuccess(user, password, token) {
	var form = $('#courseForm');
	var course = $('#coursetype', form).val();
	kofferModel = new KofferModel(user, password, token, course);
	kofferModel.logInfo();
	kofferModel.store();
	kofferModel.loadJsonModel();
	kofferModel.getProgress().getProgress();
	//store user data (uname, passwd and token)
	console.log('login for ' + user + ' ok .. updating gui');
	$.mobile.changePage("index.html#homePage1", {transition: "slide"});
	//display user's name in welcome page
	$('.userName').html(kofferModel.getUserName());
}

/* Checking the user-entered parameters */
function handleLogin() {
	console.log("Performing login to middleware service");
	var form = $("#paramedicLogin");
	//disable the button so we can't resubmit while we wait
	$("#submit1Btn", form).attr("disabled", "disabled");
	var u = $("#username", form).val();
	var p = $("#password", form).val();
	if(u!= '' && p!= '') {
		console.log("Posting login data to service");
		var result = $.ajax({
			type: "POST",
            url: KURSKOFFER_URL + "checklogin.php",
            data: {username:u, password:p},
//            dataType: 'application/json',
            success: function(data) {
            	console.log("returned from post " + data);
    			if(data!='') {
    				handleLoginSuccess(u, p, data);
    			} else {
    				console.log("No data was returned from service");
    				navigator.notification.alert("Anmeldung fehlgeschlagen! Bitte probieren Sie noch einmal", function() {});
    				$("#submit1Btn").removeAttr("disabled");
    			}
            },
            error: function(xhr, textStatus, errorThrown) {
                console.log(xhr);
                console.log(xhr.responseText);
                console.log(textStatus);
                console.log(errorThrown);
            }
        });
//		console.log(result);
//		console.log(result.responseText);
//		if(result && json && result.responseText != undefined) {
//			var json = jQuery.parseJSON(result.responseText);
//			console.log('returned result');
//			handleLoginSuccess(u, p, json);
//		}
	} else {
		navigator.notification.alert("Geben Sie Ihren Benutzername und Passwort ein", function() {});
		$("#submit1Btn").removeAttr("disabled");
	}
	return false;
}

/* PRE_Authentication check for Username and Password */
// TODO never called?
function checkPreAuth() {
	console.log('checkPreAuth');
    var form = $('#paramedicLogin');
    if(localStorage.getItem('username') != undefined && localStorage.getItem('password') != undefined) {
        $('#username', form).val(localStorage.getItem('username'));
        $('#password', form).val(localStorage.getItem('password'));
        handleLogin();
    }
}

/* Schedules Sync device calendar with moodle (import of iCal) */
function doSync() {
	var usertkn = localStorage.getItem("token");
	if(usertkn != '') {
		$.post(KURSKOFFER_URL + "kalender.php", {token:usertkn}, function(data) {
			if(data!='') {
				//import the calendar data (saving)
				// bla bla bla
			} else {
				navigator.notification.alert("Sync ist fehlgeschlagen! Bitte probieren Sie noch einmal", function() {});
			}
		}, "json");
	} else {
		navigator.notification.alert("Error: can not find user token", function() {});
	}
}

/**
 * Renders a data object to the course list panel
 */
function renderCourseList(myData) {
	// TODO remove? caused an error which basically halted further JS execution
//	var dContent = function(event) {
//	    $c_content.html($(this).data('content'));
//	}
	
	var courseList = $('#courseList');
	var html = '';
	var chapterList = [];
	
	// TODO remove? see above
//	courseList.on('click', 'div', dContent);
	
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
	courseList.html(html);
}

/* Course: MenuButton procedure */
var action = '', jsonString = '';
function courseList() {
	if(kofferModel.isModelLoaded()) {
		console.log('found locally cached moodle data .. trying to parse');
		var myData = kofferModel.getModel();
		console.log('found locally cached moodle data .. successfully parsed');
		// show the loaded data
		renderCourseList(myData);
	}else{
		// data is not ready, just register the render method and request an update
		// it is not very likely that this case occurs?
		$('#cList').html('<div align="center">Daten werden abgerufen</div>');
		kofferModel.setRenderingListener(renderCourseList);
		kofferModel.loadJsonModelFromService();
	}
}

/* Display 'content' JSON element related to the clicked 'title' */
var keyword = '';
function sTopic(chapter, title) {
	//'read action' from file
	// TODO reading not necessary since the model is actually stored in kofferModel
//	action = 'r'; readWriteFile();
	//filled 'myData' variable with contents
//	var myData2 = JSON.parse(jsonString);
	var myData2 = kofferModel.getModel();
	
	for (var i = 0; i < myData2.length; i++) {
	    if (myData2[i].chapter == chapter && myData2[i].title == title) {
	    	$('.tTitle').html(myData2[i].title);
	    	$('#cContent').html(myData2[i].content);
	    }
	}
	
	kofferModel.getProgress().trackAccess(title);
	
	//gettig keyword of the clicked topic
	keyword = document.getElementById('kword').value;
	console.log('sTopic(): Got a keyword - ' +keyword);
}

/* Get CourseList from the Moodle */
// TODO defined but never called
var jsonData = '';
function getCourseList() {
	var usertkn = localStorage.getItem("token");
	usertkn = jQuery.trim(usertkn);
	if(usertkn != '') {
		$.post(KURSKOFFER_URL + "transform.php", {token:usertkn}, function(data) {
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
	//REcall `courseList()` to display refreshed course-data from Moodle
	courseList();
}
function onFSError(err) {
	console.log(err.code);
}

function wikiGenerate() {
	var wtopic = keyword;
	console.log('wikiGenerate(): Got a Keyword - ' +wtopic);
	$.getJSON('http://de.wikipedia.org/w/api.php?action=parse&page='+wtopic+'&prop=text&format=json&callback=?', function(data) {
		// display generated content in 'id=cContent'
        $('#cContent').html(data.parse.text['*']);
        $('#cContent').find("a:not(.references a)").attr("href", function(){ return "http://de.m.wikipedia.org" + $(this).attr("href"); });
        $('#cContent').find("a").attr("target", "_blank");
    });
    return false;
}

/* FirstAid: MenuButton procedure */
function firstAid() {
	window.open('https://play.google.com/store/apps/details?id=at.fh.firstaid');
/*
	window.plugins.webintent.startActivity({
		action: WebIntent.ACTION_VIEW,
		url: 'at.fh.firstaid://MobSanMain'},
	    function() {};
	    function() {alert('Failed to open eErsteHilfe App')};
	});
*/
}

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
	console.log("Settings data are saved!");
	//alert('Settings are saved ' +setS+ ' & '+setV, '', 'Info', 'Ok');
}

/* Loading the SETTINGS data */
var getSound = localStorage.getItem("sound");
var getVibra = localStorage.getItem("vibra");
function loadSettings() {
	var form = $("#settingsForm");
	if(getSound != undefined && getVibra != undefined) {
		console.log("Settings data are loaded!");
		//alert("sound: "+getSound+ " vibra: "+getVibra);		
		if(getSound == "1") {
			document.getElementById('sound').options[1].selected = true;
		}
		if(getVibra == "1") {
			document.getElementById('vibration').options[1].selected = true;
		}
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
	kofferModel.logout();
	history.go(-(history.length - 1));
	window.location.replace("index.html");
}
