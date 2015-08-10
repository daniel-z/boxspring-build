"use strict";

var _ = require('underscore')
, fs = module.require('fs')
, async = require('async');

var childProcess = require('child_process');

var runCommand = function(commandStr, callback) {
	var build = childProcess.exec(commandStr, 
			function (error, stdout, stderr) {
		if (error) {
			console.log(error.stack);
			console.log('Error code: '+error.code);
			console.log('Signal received: '+error.signal);
			console.log('Unable to run command: '+commandStr);
		}
		// console.log('Child Process STDOUT: '+stdout);
		// console.log('Child Process STDERR: '+stderr);
	});
		

	// on callback execute browserify
	build.on('exit', function (code) {
		
		// execute the kanso callback
		callback(code ? code : null);
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
			console.log('Warning: missing "baseURL" property on setttings object.');
			return callback(null, doc);
		}
		
		async.eachSeries(_.map(settings.build_commands, function(command) { return(command); }), function(cmd, cb) {
			
			// run the command
			runCommand(cmd, cb);
		}, function(err) {
			
			// advance the workflow on completion;
			callback(err, doc);
		});
    }
};

