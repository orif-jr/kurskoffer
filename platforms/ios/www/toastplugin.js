/**
 * @author Orif Orifov
 * 
 * Usage:
 * 
 * shortToast("Short Toast Message Here...");
 * longToast("Long Toast Message Here...");
 */

// Plugin file should be always after cordova.js

window.shortToast = function(str, callback) {
	cordova.exec(callback, function(err) {
		callback('Nothing to echo.');
	}, "ToastPlugin", "shortToast", [ str ]);
};

window.longToast = function(str, callback) {
	cordova.exec(callback, function(err) {
		callback('Nothing to echo.');
	}, "ToastPlugin", "longToast", [ str ]);
};
