"use strict";

var _ = require('underscore')
, fs = module.require('fs');

, writeFile = function(file, data, handler) {		
	fs.writeFile(file, data, function (err) {
		if (handler && typeof handler === 'function') {
			handler(err);
		}
	});
}
, readFile = function(fullPath, handler) {
	handler = typeof handler === 'function' ? handler : function() { return ; };

	fs.readFile(fullPath, 'ascii', handler);
}

, handleTemplate = function(root, path, template) {
	template = template.split('<script').slice(1);
	return _.map(template, function(id) {
		var script = {'id': '', 'text': '', 'root_path': ''};
		
		if (id.split('id=').length === 1) {
			return script;
		}
		
		script.id = id.split('id=')[1].split(/\"/).length > 1 
			? id.split('id=')[1].split(/\"/)[1]
			: ''

		if (script.id) {
			script.text = _.escape(id.split('\n').slice(1).join('').replace('</script>', ''));
			script.root_path = path.replace(root, '').slice(1)
					.replace('template.html', '').replace(/\//g, '.');
		}
		return script;
	});
};

var exportsTemplate = ['templates["<%= id %>"] = ',
		'_.template( _.unescape("<%= text %>") );',
		'\n\n'].join('')
, exportsFile = ['var _ = require("underscore");',
		'var templates = {};\n', 
		'<%= exports_content %>\n',
		'module.exports = templates;\n'].join('\n');

var parseTemplates = function(root, matches, doc, callback) {
	var remaining = matches.length
	, ids = {}
	, result = []
	, parseTemplate = function(path) {
		readFile(path, function(err, data) {
			remaining -= 1;
			
			result = result.concat(_.reduce(handleTemplate(root, path, data), function(res, script) {
				if (script.id) {
					if (ids[script.id]) {
						console.log('Warning: Duplicate <script> id:', script.id, 
								ids[script.id].root_path, script.root_path);
					} else {
						ids[script.id] = script;
					}
					res.push(_.template(exportsTemplate)(script));
				}
				return res;
			}, []))
			
			if (!remaining) {
				writeFile(root + '/templates.js', 
					_.template(exportsFile)({'exports_content': result.join('')}), 
							function(err, response) {
					callback(null, doc);
				});
			}
		});
	};
	_.each(matches, parseTemplate);
};

var childProcess = require('child_process');

var runBrowserify = function(doc, callback) {
	var build = childProcess.exec('browserify app.js -o src/index.js -d', 
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
		console.log('browserify run');
		callback(code ? code : null, doc);
	});
};


module.exports = {
	after: ["properties", "settings", "modules"],
	before: ["attachments"],
    run: function (root, path, settings, doc, callback) {
					
		// apply the settings object (with 'baseURL' to the rewrites string)
		doc.lib.rewrites = _.template(doc.lib.rewrites)(settings);

		// assemble the 'exports.templates' module
		settings._utils.find(path, new RegExp(/template.html/), function(err, matches) {
			
			if (matches.length) {
				// if we got templates, parse them into a templates.js module
				parseTemplates(path, matches, doc, function() {
					runBrowserify(doc, callback);
				});
			} else {
				
				// just build the source
				runBrowserify(doc, callback);
			}
		});
    }
};

