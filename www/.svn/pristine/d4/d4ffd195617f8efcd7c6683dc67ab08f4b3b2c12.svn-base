/** Internationalisation for Cordova / PhoneGap web apps */

/** Default Language in case no language object was created by app */
var DEFAULT_SYSTEM_LANGAUGE = 'de';

/** Prepend to URL path */
var URL_PREFIX_ANDROID = 'file:///android_asset/www/i18n/';
var URL_PREFIX_IPHONE = 'i18n/';

/** Append to URL path */
var URL_POSTFIX = '.js';

/** Class that allows to translate html pages and can be queried for strings */
function LanguageTranslator(language) {
	/** language to use */
	this.language = language;
	
	/** used to translate */
	this.translation = null;
	
	/** load file from url */
	this.loadTranslation = function() {
        var prefix = null;
        if(device.platform == 'Android') {
            prefix = URL_PREFIX_ANDROID;
        }else{
            prefix = URL_PREFIX_IPHONE;
        }
		var url = prefix + this.language + URL_POSTFIX;
		var translationModel = this;
		console.log('loading translation file from ' + url);
		jQuery.ajax({
			type: 'GET',
			url: url,
			success: function(data) {
				console.log('result of loading translation file');
				translationModel._parseJsonTranslation(data);
			},
			error: function(xhr, textStatus, errorThrown) {
                console.log(xhr);
                console.log(xhr.responseText);
                console.log(textStatus);
                console.log(errorThrown);
            }
		});
	};
	
	/** Private Method that parses a json model and uses it as translator */
	this._parseJsonTranslation = function(json) {
		try {
			this.translation = JSON.parse(json);
			this.applyText();
		}catch(e) {
			console.log('there was an error parsing translations ');
			console.log(e);
		}
	};
	
	/** Get a key from the parsed translations */
	this.text = function(key) {
		if(this.translation != null) {
			return this.translation[key];
		}else{
			return key + ' no translation available';
		}
	};
	
	/** return the currently used language */
	this.getLanguage = function() {
		return this.language;
	};
	
	/** Translate rendered text */
	this.applyText = function() {
		var t = this;
		jQuery.each($.find('[data-i18n]'), function(index, value) {
			var element = jQuery(value);
			var key = element.attr('data-i18n');
			var value = t.text(key);
			if(element.is('input')) {
				element.html(value);
				element.val(value);
			}else{
				element.html(value);
			}
		});
	};
	
	/** Actually load the translation file */
	this.loadTranslation();
	
}

/** The global translator object used by all translations */
var translator = null;

/** Try to access the translator object - if none was found one is created inline*/
function getTranslator() {
	if(translator == null) {
		translator = new LanguageTranslator(DEFAULT_SYSTEM_LANGAUGE);
	}
	return translator;
}

/** translate the key to the currently selected language */
function _(key) {
	console.log(key);
	return getTranslator().text(key);
}

/** Set or switch language */
function switchLanguage(language) {
	console.log('switching language to ' + language);
	if(translator == null) {
		console.log('no language was set just creating new translator');
		translator = new LanguageTranslator(language);
	}else{
		// do we need to switch?
		if(translator.getLanguage() != language) {
			console.log('switch necessary ' + translator.getLanguage() + ' vs ' + language);
			var tmpTrans = new LanguageTranslator(language);
			// keep new and assigment separated!
			translator = tmpTrans;
		}
	}
}