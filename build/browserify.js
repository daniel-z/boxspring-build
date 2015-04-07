"use strict";

var _ = require('underscore')
, fs = module.require('fs');

var childProcess = require('child_process');

var runBrowserify = function(doc, settings, callback) {
	var build = childProcess.exec(settings.browserify_command, 
			function (error, stdout, stderr) {
		if (error) {
			console.log(error.stack);
			console.log('Error code: '+error.code);
			console.log('Signal received: '+error.signal);
		}
		// console.log('Child Process STDOUT: '+stdout);
		// console.log('Child Process STDERR: '+stderr);
	});
		

	// on callback execute browserify
	build.on('exit', function (code) {
		
		// execute the kanso callback
		callback(code ? code : null, doc);
	});
};


module.exports = {
	after: ["properties", "settings", "modules"],
	before: ["attachments"],
    run: function (root, path, settings, doc, callback) {
	
		// apply the settings object (with 'baseURL' to the rewrites string)
		if (settings.baseURL) {
			doc.lib.rewrites = _.template(doc.lib.rewrites)(settings);
		} else {
			console.log('Warning: missing "baseURL" property on setttings object.', settings);
			return callback(null, doc);
		}
					
		// just build the source
		runBrowserify(doc, settings, callback);
    }
};

