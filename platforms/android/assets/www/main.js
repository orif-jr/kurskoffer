/**
 * PhoneGap v2.7.0
 * http://www.apache.org/licenses/LICENSE-2.0
 * 
 * The KursKoffer App
 */

var beep = function() {
    navigator.notification.beep(1);
};

var vibrate = function() {
    navigator.notification.vibrate(0);
};

var LOCAL = false;
var KURSKOFFER_URL = "http://cloud.c3lab.tk.jku.at/kurskoffer/";

if(LOCAL) {
	// adjust some settings if we are running in local mode
	KURSKOFFER_URL = "http://10.0.2.2/kurskoffer/"
}

/** Initialize application */
function init() {
    console.log('Initializing handler');
    document.addEventListener("deviceready", onDeviceReady, false);
}

/** 
 * Progress Model
 * 
 * it stores the progress for each topic
 */
function ProgressModel(parentModel) {
	this.parentModel = parentModel;
	
	/** Signal that the progress for this course is loaded for the first time 
	 * We will not notify the user about new badges in the first run
	 */
	this.firstLoad = true;
	
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
	
	/** flags for enabled badges */
	this.badgeStarted = false;
	this.badgeBronze = false;
	this.badgeSilver = false;
	this.badgeGold = false;
	this.badgeFinished = false;
	
	/** call this whenever a topic is touched */
	this.trackAccess = function(chapter) {
		var model = this;
		$.post(KURSKOFFER_URL + "postProgress.php", {
			username:this.parentModel.getUserName(),
			courseId:this.parentModel.getCourse().getId(),
			chapter:chapter
		}, function(data) {
			model.getProgress();
		});
	};
	
	/** Private method that retrieves progress from backend */
	this._retrieveProgress = function(model) {
		jQuery.post(KURSKOFFER_URL + 'getProgress.php', {
			username:this.parentModel.getUserName(),
			courseId:this.parentModel.getCourse().getId()
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
				model._updateBadges();
				model._renderProgress();
				// disable first run behavior
				model.firstLoad = false;
			}else{
				console.log('did not retrieve a progress');
			}
		});
	};
	
	/** Updates the state of the badges according to the current course progress */
	this._updateBadges = function() {
		// blau: lesen gestartet
		// bronze: 20% gelesen
		// silber: 70% gelesen
		// gold: bester fortschritt
		// grŸn: kurs abgeschlossen
		if(this.readTopics > 0) {
			this.badgeStarted = true;
			if(this.readTopics / this.overallTopics > 0.2) {
				this.badgeBronze = true;
			}
			if(this.readTopics / this.overallTopics > 0.7) {
				this.badgeSilver = true;
			}
			if(this.badgeSilver && this.countHigher == 0) {
				this.badgeGold = true;
			}
			if(this.readTopics == this.overallTopics) {
				this.badgeFinished = true;
			}
		}
		this._postBadges();
	};
	
	/** Post the current badges back to the backend */
	this._postBadges = function() {
		var blue = this.badgeStarted ? 1 : 0;
		var bronze = this.badgeBronze ? 1 : 0;
		var silver = this.badgeSilver ? 1 : 0;
		var gold = this.badgeGold ? 1 : 0;
		var green = this.badgeFinished ? 1 : 0;
		
		jQuery.post(KURSKOFFER_URL + 'postBadges.php', {
			username:this.parentModel.getUserName(),
			courseId:this.parentModel.getCourse().getId(),
			blue:blue,
			bronze:bronze,
			silver:silver,
			gold:gold,
			green:green
		}, function(data) {
			// ignore result
		});
	};
	
	/** Render status of a single badge */
	this._renderBadgeStatus = function(badge, enabled) {
		var img = $('#' + badge);
		if(enabled) {
			var enabledSrc = img.attr('data-enabled-src');
			img.attr('src', enabledSrc);
		}else{
			img.attr('src', 'img/badge_placeholder.png');
		}
	};
	
	/** Render Progress to progress bar */
	this._renderProgress = function() {
		console.log('rendering progress to ui ' + this.readTopics);
		$('#progressReadTopics').html(_('textYouHaveRead') + this.readTopics + _('textTopicsOutOf') + this.overallTopics + _('textAvailableTopics'));
		$('#progressOverallTopics').html(_('textBetterThan') + this.countLower + _('textSameScore') + this.countSame + _('textScoreAnd') + this.countHigher + _('textWorseThan'));
		this._renderBadgeStatus('badgeStarted', this.badgeStarted);
		this._renderBadgeStatus('badgeBronze', this.badgeBronze);
		this._renderBadgeStatus('badgeSilver', this.badgeSilver);
		this._renderBadgeStatus('badgeGold', this.badgeGold);
		this._renderBadgeStatus('badgeFinished', this.badgeFinished);
	};
	
	/** Shows a notification to the user */
	this.showAlert = function(badge) {
		navigator.notification.alert(_(badge), function(){}, "Info");
	};
	
	/** Get Progress from service backend */
	this.getProgress = function() {
		console.log('requesting progress from backend');
		this._retrieveProgress(this);
	};
	
	/** Render the highcharts diagrams */
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
            credits: {
            	enabled: false
            },
            title: {
                text: _('textLearningProgress')
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
                name: _('textLearningProgress'),
                data: [
                    [_('textTopicsRead'),   model.readTopics],
                    [_('textTopicsUnread'), model.overallTopics - model.readTopics]
                ]
            }]
        });
	};
}

/**
 * Class that keeps the state of other people in the peer group
 * 
 * @param parentModel
 */
function SocialModel(parentModel) {
	this.parentModel = parentModel;
	
	/** Private method that retrieves social data from backend */
	this._retrieveSocial = function(model) {
		jQuery.post(KURSKOFFER_URL + 'getSocial.php', {
			username:this.parentModel.getUserName(),
			courseId:this.parentModel.getCourse().getId()
		}, function(data) {
			data = jQuery.trim(data);
			if(data != '') {
				var result = JSON.parse(data);
				model._updateModel(result);
			}else{
				console.log('did not retrieve social progress');
			}
		});
	};
	
	/** Get the highest color of a user */
	this._getHighColor = function(user) {
		if(user.green == "1") return "green";
		if(user.gold == "1") return "gold";
		if(user.silver == "1") return "silver";
		if(user.bronze == "1") return "bronze";
		if(user.blue == "1") return "blue";
		return "placeholder";
	};
	
	/** Get the highest color of a user, text interpretation */
	this._getHighColorText = function(user) {
		if(user.green == "1") return "Green";
		if(user.gold == "1") return "Gold";
		if(user.silver == "1") return "Silver";
		if(user.bronze == "1") return "Bronze";
		if(user.blue == "1") return "Blue";
		return "Placeholder";
	};
	
	/** Render retrieved JSON data */
	this._updateModel = function(json) {
		var html = '<table border="0">';
		for(i=0;i<json.length;i++) {
			html += '<tr><td>';
			html += '<img height="36" src="img/badge_' + this._getHighColor(json[i]) + '.png" />'
			html += '</td><td>';
			html += json[i].firstname;
			html += ' <span>';
			html += _('textSocial' + this._getHighColorText(json[i]));
			html += '</span>';
			html += '</td></tr>';
		}
		html += '</table>';
		jQuery('#socium').html(html);
	};
	
	/** Request social status and save it to this object */
	this.getSocial = function() {
		console.log('Getting social group badges');
		this._retrieveSocial(this);
	};
}

/**
 * Class that allows us to retrieve context based information from wikipedia
 * 
 * @param parentModel
 * @returns
 */
function WikipediaModel(parentModel) {
	this.parentModel = parentModel;
	
	this.topic = null;
	
	this.showing = false;
	
	/** retrieve context based content from wikipedia */
	this._retrieveContent = function(topic, model) {
		console.log('finding context on wikipedia ' + topic);
		$.getJSON('http://de.wikipedia.org/w/api.php?action=parse&page=' + topic + '&prop=text&format=json&callback=?', function(data) {
			console.log('found content on ' + topic);
			var wikiContent = $('#wikiContent');
	        wikiContent.html(data.parse.text['*']);
	        wikiContent.find("a:not(.references a)").attr("href", function(){
                return "http://de.m.wikipedia.org" + $(this).attr("href");
            });
            wikiContent.find("img").attr("src", function() {
                return "http:" + $(this).attr("src");
            });
	        wikiContent.find("a").attr("target", "_system");
            wikiContent.find("a").attr("onclick", function() {
                return "cordova.exec(null, null, 'InAppBrowser', 'open', ['" + $(this).attr("href") + "', '_system' ]); return false;";
            });
	        $('#wikiLink').show();
	    });
	};
	
	/** retrieve context */
	this.context = function(topic) {
		this._retrieveContent(topic, this);
	};
	
	/** set new topic */
	this.setTopic = function(topic) {
		console.log('setting new topic ' + topic);
		this.topic = topic;
	};
	
	/** check if there is info on wikipedia */
	this.checkTopic = function() {
		console.log('checking if we need to retrieve additional wikipedia info');
		if(this.topic != null && this.topic != undefined) {
			console.log('found a topic ' + this.topic);
			this.context(this.topic);
		}
	};
	
	/** hide the wiki elements */
	this._hideWikipediaElements = function() {
		$('#wikiContent').hide();
		this.showing = false;
        // change to show text
        // textWikiAvailable
        $('#wikiShowLink').html(_('textWikiAvailable'));
	};
	
	/** Hide wiki integration */
	this.hide = function() {
		this._hideWikipediaElements();
	};
	
	/** Hide also the link */
	this.hideAll = function() {
		this.hide();
		$('#wikiLink').hide();
	};
	
	/** show the wiki elements */
	this._showWikipediaElements = function() {
		$('#wikiLink').show();
		$('#wikiContent').show();
		this.showing = true;
        // change text to hide
        $('#wikiShowLink').html(_('textWikiHide'));
	};
	
	
	/** Show or hide the wikipedia content */
	this.toggleWikiInfo = function() {
		if(this.showing) {
			this._hideWikipediaElements();
		}else{
			this._showWikipediaElements();
		}
	};
	
}

/**
 * Model of a single course
 * 
 * @param title, language, img, css
 */
function Course(id, title, language, img, css) {
	this.id = id;
	this.title = title;
	this.language = language;
	this.img = img;
	this.css = css;
	
	/** do we need to hide some buttons? */
	this.hideCourses = false;
	this.hideSchedule = false;
	this.hideTasks = false;
	this.hideProgress = false;
	this.hideExternalApplication = false;
	this.hideSocialNetworking = false;
	
	this.imgCourses = null;
	this.imgSchedule = null;
	this.imgTasks = null;
	this.imgProgress = null;
	this.imgExternalApplication = null;
	this.imgSocialNetworking = null;
	
	/** get the id */
	this.getId = function () {
		return this.id;
	}
	
	/** sets a new icon set */
	this.setIconSet = function(c, s, t, p, e, n) {
		this.imgCourses = c;
		this.imgSchedule = s;
		this.imgTasks = t;
		this.imgProgress = p;
		this.imgExternalApplication = e;
		this.imgSocialNetworking = n;
	};
    
    /** Updates the URLs in index.html */
    this.setExternalUrl = function(url) {
        $('#externalLink').click(function() {
            cordova.exec(null, null, "InAppBrowser", "open", [url, "_system"]);
        });
    };
}

/**
 * Handles details of the course
 * 
 * @param courseId
 */
function CourseModel(courseId) {
	this.course = null;
	courseId = parseInt(courseId);
	switch (courseId) {
	case 1:
		// RettungssanitŠter
		this.course = new Course(1, "Rettungssanit&auml;ter", "de", "img/oerk_ooe.png", "b");
		this.course.setIconSet(
			'img/courses.png', 
			'img/schedules.png',
			'img/tasks.png',
			'img/progress.png',
			'img/firstaid.png',
			'img/social.png');
		break;
	case 6:
		// RettungssanitŠter - Pflichtschulung
		this.course = new Course(6, "Pflichtschulungen 2014", "de", "img/oerk_ooe.png", "b");
        //if(device.platform != 'Android') {
        //    this.course.hideExternalApplication = true;
        //}
		this.course.setIconSet(
				'img/courses.png', 
				'img/schedules.png',
				'img/tasks.png',
				'img/progress.png',
				'img/firstaid.png',
				'img/social.png');
        if(device.platform == 'Android') {
            this.course.setExternalUrl('https://play.google.com/store/apps/details?id=at.fh.firstaid');
        } else {
            this.course.setExternalUrl('https://itunes.apple.com/at/app/eerstehilfe/id488541482?l=en&mt=8');
        }
        $('#quizBtn').hide();
		break;
	case 3:
		// Armenian History
		this.course = new Course(3, "Armenian History", "en", "img/coin_tigranes.png", "d");
		this.course.hideExternalApplication = true;
		this.course.hideTasks = true;
		this.course.setIconSet(
			'img/courses3.png', 
			'img/schedules3.png',
			'img/tasks.png', // wrong but hidden anyway
			'img/progress3.png',
			'img/firstaid.png', // wrong but hidden anyway
			'img/social3.png');
		break;
	default:
		console.log('error we did not initalize the course properly');
		break;
	}
	
	/** Get course model */
	this.getModel = function() {
		return this.course;
	};
	
	/** Return the encapsulated models id */
	this.getId = function() {
		return this.getModel().getId();
	};
	
	/** Private method used to hide and show elements */
	this._hideShowHelper = function(element, hide) {
		if(hide) {
			element.hide();
		}else{
			element.show();
		}
	};
	
	/** Set a new image url */
	this._applyImageHelper = function(div, img) {
		if(img != null) {
			console.log('updating image icon ' + img);
			var element = div.find('img');
			element.attr('src', img);
		}
	};
	
	/** Applies layout at appropriate places */
	this.applyLayout = function() {
		var layoutModel = this;
		console.log('applying layout for ' + this.course.title);
		// set title
		$('#loginTitle').html(layoutModel.course.title);
		// set image
		$('#loginImg').attr('src', layoutModel.course.img);
		// set css
		jQuery.each($.find('[data-theme]'), function(index, value) {
			jQuery(value).attr('data-theme', layoutModel.course.css);
		});
		// show hide courses
		this._hideShowHelper($('#menuCourses'), layoutModel.course.hideCourses);
		this._hideShowHelper($('#menuSchedule'), layoutModel.course.hideSchedule);
		this._hideShowHelper($('#menuTasks'), layoutModel.course.hideTasks);
		this._hideShowHelper($('#menuProgress'), layoutModel.course.hideProgress);
		this._hideShowHelper($('#menuExternalApp'), layoutModel.course.hideExternalApplication);
		this._hideShowHelper($('#menuSocial'), layoutModel.course.hideSocialNetworking);
		// set correct images
		this._applyImageHelper($('#menuCourses'), layoutModel.course.imgCourses);
		this._applyImageHelper($('#menuSchedule'), layoutModel.course.imgSchedule);
		this._applyImageHelper($('#menuTasks'), layoutModel.course.imgTasks);
		this._applyImageHelper($('#menuProgress'), layoutModel.course.imgProgress);
		this._applyImageHelper($('#menuExternalApp'), layoutModel.course.imgExternalApplication);
		this._applyImageHelper($('#menuSocial'), layoutModel.course.imgSocialNetworking);
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
    console.log('New KofferModel');
	
	/** Just a static name for the model */
	this.kofferName = 'Kurskoffer';
	
	/** User Information */
	this.username = jQuery.trim(u);
	this.password = jQuery.trim(p);
	this.token = jQuery.trim(t);
	
	/** JSON based data model */
	this.jsonModel = null;
	
	/** parsed model -> we did this way too often in the code */
	this.parsedModel = null;
	
	/** If not null we call this function when we got new json data */
	this.renderingListener = null;
	
	/** Create a progress model */
	this.progressModel = new ProgressModel(this);
	
	/** Create a social model */
	this.socialModel = new SocialModel(this);
	
	/** Create wikipedia model */
	this.wikipediaModel = new WikipediaModel(this);
	
	/** Create a course model if appropriate */
	if(course != null) {
		this.courseModel = new CourseModel(course);
		switchLanguage(this.courseModel.course.language);
	}else{
		this.courseModel = null; 
	}
	
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
		if(this.courseModel != null && this.courseModel != undefined) {
			localStorage.setItem('course', this.courseModel.getId());
		}else{
			localStorage.setItem('course', null);
		}
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
	 * */
	this.load = function() {
		console.log('read from local storage');
		this.username = this._checkNullString(localStorage.getItem('username'));
		this.password = this._checkNullString(localStorage.getItem('password'));
		var course = this._checkNullString(localStorage.getItem('course'));
		if(course != null) {
			this.courseModel = new CourseModel(course);
			switchLanguage(this.courseModel.course.language);
		}
	};
	
	/** Reset the model to logout user */
	this.logout = function() {
		// reseting data
		this.username = null;
		this.password = null;
		this.token = null;
		this.courseModel = null;
		// store null values to localstorage
		this.store();
	};
	
	/** Return users name */
	this.getUserName = function() {
		return this.username;
	};
	
	/** Return password */
	this.getPassword = function() {
		return this.password;
	};
	
	/** Return authentication token */
	this.getToken = function() {
		return this.token;
	};
	
	/** Return the selected course */
	this.getCourse = function() {
		return this.courseModel;
	};
	
	/** Check if credentials are set (were loaded form local storage) */
	this.hasCredentials = function() {
		return this.username != null;
	};
	
	this._generateFileName = function() {
		// TODO what if course model is null? can this be the case? -> matthias thinks no
		return 'modelFile_' + this.courseModel.getId() + '.json';
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
			model._requestFile(filesystem, model._generateFileName(), writing, model);
		}, function(err) {
			console.log('file system access was denied with error ' + err.code);
			navigator.notification.alert('Your system does not support file system access we cannot operate in offline mode!', function() {});
		});
	};
	
	/** Private Method that performs the details of file handling */
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
		return this.jsonModel != null && this.jsonModel != undefined;
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
		console.log('getting moodle data from backend');
		if(this.token != '') {
			$.post(KURSKOFFER_URL + "transform3.php", {
				token:this.token,
				courseid:this.courseModel.getId()
			}, function(data) {
				console.log('processing data received from backend');
				if(data!='') {
					console.log('there was data received from the backend');
					// set to model for application
					try {
						// try to parse
						var json = JSON.parse(data);
						model.setJsonModel(data, json);
					}catch(e) {
						// if it fails jQuery parsed for us
						model.setJsonModel(JSON.stringify(data), data);
					}
					// write to local file
					model.storeJsonModel();
				} else {
					navigator.notification.alert("Error: server response is emty", function() {});
				}
			}); //"json" removed request type specification
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
	this.setJsonModel = function(json, parsedModel) {
        if(json.length > 0) {
            console.log('setting new model with length ' + json.length);
            this.jsonModel = json;
            if(parsedModel == undefined) {
                parsedModel = null;
            }
            this.parsedModel = parsedModel;
            // if listener is not null call it to render
            if(this.renderingListener != null) {
                console.log('calling rendering listener');
                this.renderingListener(this.getModel());
                this.renderingListener = null;
            }
        }else{
            console.log('resetting to null');
            this.jsonModel = null;
            this.parsedModel = null;
        }
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
	
	/** Returns the initialized social model */
	this.getSocial = function() {
		return this.socialModel;
	};
	
	/** Returns the initialized wikipedia model */
	this.getWikipedia = function() {
		return this.wikipediaModel;
	};
	
	/** update the course id */
	this.setCourse = function(id) {
		this.courseModel = new CourseModel(id);
	};
}

var kofferModel = null;

/**
 * KursKoffer Code Procedure
 * Below list of functions are main part of the app
 * Authentication, Calendar Sync, Moodle Course List, FirsAid, Settings etc.
 */
function onDeviceReady() {
	console.log("Cordova is ready! Cordova is ready!");
    // configure iOS 7 behavior
    if(window.device.platform === 'iOS') {
        StatusBar.overlaysWebView(false);
    }
    // create i18n translator
	getTranslator();
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
        	$('#coursetype, form').val(kofferModel.getCourse().getId());
        	moveToCourse();
        }
	}else{
		var form = $('#paramedicLogin');
		$('#username', form).val('');
		$('#password', form).val('');
	}
}

/**
 * User or setup code selected to move to a certain course
 * Moving to the appropriate course chosen by user
 * 
 * This method moves to the courseForm and makes sure that the layout is adapted to the course settings
 */
function moveToCourse() {
    console.log('move to course');
	var form = $('#courseForm');
	var course = $('#coursetype', form).val();
	kofferModel.setCourse(course);
	kofferModel.getCourse().applyLayout();
	$.mobile.changePage("index.html#loginPage", {transition: "flow"});
}

/**
 * The service signaled that login was ok -> setup course and application
 * 
 * @param user
 * @param password
 * @param token
 */
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

/** The user requested a login */
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
    			if(data != '' && data.indexOf('error') == -1) {
    				handleLoginSuccess(u, p, data);
    			} else {
    				console.log("No data was returned from service");
                    $("#submit1Btn").removeAttr("disabled");
    				navigator.notification.alert("Anmeldung fehlgeschlagen! Kontrollieren sie ihren Benutzernamen und ihr Passwort!", function() {
                        var form = $("#paramedicLogin");
                        $("#password", form).val('');
                    });
    			}
            },
            error: function(xhr, textStatus, errorThrown) {
                console.log(xhr);
                console.log(xhr.responseText);
                console.log(textStatus);
                console.log(errorThrown);
                alert(textSTatus);
                $("#submit1Btn").removeAttr("disabled");
            }
        });
	} else {
		navigator.notification.alert("Geben Sie Ihren Benutzername und Passwort ein", function() {});
		$("#submit1Btn").removeAttr("disabled");
	}
	return false;
}

/**
 *  Retrieves a schedule from the service and opens the scheudle list
 *  
 *  WARNING Inactive code kalender.php not existing on service side -> this does nothing right now
 */
function doSync() {
	var usertkn = localStorage.getItem("token");
	if(usertkn != '') {
		$.post(KURSKOFFER_URL + "kalender.php", {token:usertkn}, function(data) {
			if(data!='') {
				//import the calendar data (saving)
				console.log(data);
			} else {
				navigator.notification.alert("Sync ist fehlgeschlagen! Bitte probieren Sie noch einmal", function() {});
			}
		}, "json");
	} else {
		navigator.notification.alert("Error: can not find user token", function() {});
	}
}

/** Renders a data object to the Course List panel */
function renderCourseList(myData) {
    console.log('rendering course list');
	var courseList = $('#courseList');
	var html = '';
	var chapterList = [];
	var first = true;
	$.each(myData, function(index, item) {
		   console.log('rendering ' + item.title);
	    if ($.inArray(item.chapter, chapterList) === -1 && item.chapter != 'General') {
	        chapterList.push(item.chapter);
	        if(!first) { html += '</div>'; }
	        html += '<div data-role="collapsible"><h3>' + item.chapter + '</h3>';
	        first = false;
	    }
	    if(item.title != 'News forum' && item.title != 'Media') {
            html += '<p><a href="#singleContent" onclick="sTopicId(\'' + item.id + '\')">' + item.title + '</a>';
            if(item.description && item.description != undefined && item.description != null && item.description != '') {
                html += '<br/>';
                html += item.description;
            }
            html += '</p>';

		}
	});
	if(!first) { html += '</div>'; }
	courseList.html(html);
	try {
		// try to refresh the list
        console.log('refreshing collapsible set');
		courseList.collapsibleset('refresh');
	}catch(e) {
		// we completely ignore this exception
		// the exception occurs when cordova is so fast that it calls "refresh" during init phase
		// of the gui -> we call it anyway and see what happenens
        console.log(e);
	}
}

/**
 * Check if a course list is available in the model,
 * if not make the kofferModel retrieve one from the service
 */
function courseList() {
	if(kofferModel.isModelLoaded()) {
        console.log('A model is already loaded .. just render it');
		var myData = kofferModel.getModel();
		// show the loaded data
		renderCourseList(myData);
	}else{
		// data is not ready, just register the render method and request an update
        console.log('No data loaded or model empty');
		kofferModel.setRenderingListener(renderCourseList);
        console.log('load model from service');
		kofferModel.loadJsonModelFromService();
	}
}

/** Set a rendering listener and attempt to load data from backend */
function refreshCourses() {
	console.log('user requested data update');
	kofferModel.setRenderingListener(renderCourseList);
	console.log('quering service for new data');
	kofferModel.loadJsonModelFromService();
}

/** Render a single topic to the cContent div */
function sTopicId(id) {
	var myData2 = kofferModel.getModel();
	for (var i = 0; i < myData2.length; i++) {
	    if (myData2[i].id == id) {
	    	$('.tTitle').html(myData2[i].title);
	    	$('#cContent').html(myData2[i].content);
	    }
	}
	kofferModel.getProgress().trackAccess(id);
	
	var keyword = $('#cContent #kword');
	if(keyword) {
		console.log('there is a keyword we need wikipedia context ' + keyword.val());
		kofferModel.getWikipedia().setTopic(keyword.val());
		kofferModel.getWikipedia().checkTopic();
	}else{
		kofferModel.getWikipedia().hideAll();
	}
}

/** QuizCards: onClick event for 'Fragekarten' button */
function runQuiz() {
	//initialize the quiz
	quizMaster.execute("m1quizFile.json", ".quizdisplay", function(result) {
		console.log("SUCESS CB");
		console.dir(result);
	});
	console.log("Yay!");
	// Toast show
	shortToast("I am short Toast..");
}

/** Saving the changes in SETTINGS */
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

/** Loading the SETTINGS data */
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

/**
 * On backButton click Exit App
 */
function onBackKeyDown() {
	if($.mobile.activePage.is("#loginPage")) {
		navigator.app.exitApp(); // Exit app if current page is loginPage
	} else {
		navigator.app.backHistory(); // Go back in history in any other case
	}
}

/**
 * Cleanup the Koffer Model and logout
 */
function doLogout() {
	kofferModel.logout();
	history.go(-(history.length - 1));
	window.location.replace("index.html");
}
