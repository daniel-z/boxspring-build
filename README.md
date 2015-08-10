boxspring-build
===============

For CouchDB and Kan.so. Before pushing, updates "rewrites.js", generates "templates.js", and produces "index.js" via Browserify

Example kanso.json

```
{
    "name": "some program",
    "version": "0.0.3",
    "description": "...",
    "attachments": [
		"index.html"
	],
	"modules_attachment": false,
	"load": "lib/app",
	"modules": ["lib", "views"],
    "dependencies": {
        "attachments": null,
		"modules": null,
		"properties": null,
		"settings": null,
		"backbone": null,
		"underscore": "",
		"boxspring-build": null
    },
	"build_commands": {
		"app_bundle": "browserify app.js -o index.js -d"
	}
}

```