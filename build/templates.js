"use strict";

var _ = require('underscore')
, fs = module.require('fs')
, async = require('async')

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

, script = function(id, text, root_path) {
	return({
		'id': id || '',
		'text': text || '',
		'root_path': root_path || ''
	});
}

, handleTemplate = function(root, path, template) {
	template = template.split('<script').slice(1);
	return _.map(template, function(id) {
		var text = id;
		
		if (id.split('id=').length === 1) {
			return script();
		}
		
		id = id.split('id=')[1].split(/\"/).length > 1 
			? id.split('id=')[1].split(/\"/)[1]
			: ''

		if (!id) {
			return script();
		}
		return script( id, _.escape(text.split('\n').slice(1).join('').replace('</script>', '')), 
				path.replace(root, '').slice(1).replace('template.html', '').replace(/\//g, '.') );
	});
}

var exportsTemplate = ['templates["<%= id %>"] = ',
		'_.template( _.unescape("<%= text %>") );',
		'\n\n'].join('')
, exportsFile = ['var _ = require("./base-utils")._;',
		'var templates = {};\n', 
		'<%= exports_content %>\n',
		'module.exports = templates;\n'].join('\n');

var parseTemplates = function(matches, callback) {
	var remaining = matches.length
	, ids = {}
	, result = []
	, parseTemplate = function(path) {
		readFile(path, function(err, data) {
			remaining -= 1;
			
			result = result.concat(_.reduce(handleTemplate(root, path, data), function(res, script) {
				if (script.id) {
					if (ids[script.id]) {
						console.log('Warning: Duplicate <script> id:', script.id, ids[script.id].root_path, script.root_path);
					} else {
						ids[script.id] = script;
					}
					res.push(_.template(exportsTemplate)(script));
				}
				return res;
			}, []));
			
			// asynchronous callback decrements remaining. When last one, write
			if (!remaining) {
				callback(null, result);
			}
		});
	};
	_.each(matches, parseTemplate);
};

module.exports = {
	before: ["attachments", "modules"],
    run: function (root, path, settings, doc, callback) {

		async.waterfall([
			
			function(readTemplates) {
				readFile(path + '/index.html', function(err, data) {
					readTemplates(null, 
						_.template(exportsTemplate)(script('index-html', 
								_.escape( data.split('\n').join('').replace(/[^\x00-\x7F]/g, "") ) , '')));
				});
			},
		
			function(indexFile, done) {
								
				// assemble the 'exports.templates' module
				// fetch all files and filter in template.html files.
				settings._utils.find(path, new RegExp(/template.html/), function(err, matches) {

					if (matches.length) {
						
						// if we got templates, parse them into a templates.js module
						parseTemplates(matches, function(e, result) {
							writeFile(path + '/lib/templates.js', 
								_.template(exportsFile)({'exports_content': [ indexFile ].concat(result).join('')}), 
										function(err, response) {
								return done();
							});
						});
					} else {

						// just build the source
						done();
					}
				});
			}
			
		], function() {
			callback(null, doc);
		});
    }
};

