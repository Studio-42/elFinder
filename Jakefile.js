/*
 * This is build file for elFinder 2.x
 * Build tool:    https://github.com/mde/jake
 * JS compressor: https://github.com/mishoo/UglifyJS/
 * CSS optimizer: https://github.com/css/csso
 */

// if Jake fails to detect need libraries try running before: export NODE_PATH=`npm root`

var fs   = require('fs'),
	path = require('path'),
	util = require('util'),
	ugjs = require('uglify-js'),
	csso = require('csso');

var dirmode = 0755,
	src = __dirname,
	version = null,
	files = {
		'elfinder.full.js':
			[
				path.join(src, 'js', 'elFinder.js'),
				path.join(src, 'js', 'elFinder.version.js'),
				path.join(src, 'js', 'jquery.elfinder.js'),
				path.join(src, 'js', 'elFinder.mimetypes.js'),
				path.join(src, 'js', 'elFinder.options.js'),
				path.join(src, 'js', 'elFinder.options.netmount.js'),
				path.join(src, 'js', 'elFinder.history.js'),
				path.join(src, 'js', 'elFinder.command.js'),
				path.join(src, 'js', 'elFinder.resources.js'),
				path.join(src, 'js', 'jquery.dialogelfinder.js'),
				path.join(src, 'js', 'i18n', 'elfinder.en.js')
			]
			.concat(grep(path.join(src, 'js', 'ui'), '\\.js$'))
			.concat(grep(path.join(src, 'js', 'commands'), '\\.js$')),

		'elfinder-minimal.full.js':
			[
				path.join(src, 'js', 'elFinder.js'),
				path.join(src, 'js', 'elFinder.version.js'),
				path.join(src, 'js', 'jquery.elfinder.js'),
				//path.join(src, 'js', 'elFinder.mimetypes.js'),
				path.join(src, 'js', 'elFinder.options.js'),
				//path.join(src, 'js', 'elFinder.options.netmount.js'),
				path.join(src, 'js', 'elFinder.history.js'),
				path.join(src, 'js', 'elFinder.command.js'),
				path.join(src, 'js', 'elFinder.resources.js'),
				path.join(src, 'js', 'jquery.dialogelfinder.js'),
				path.join(src, 'js', 'i18n', 'elfinder.en.js')
			]
			.concat(grep(path.join(src, 'js', 'ui'), '(button|contextmenu|cwd|dialog|navbar|navdock|overlay|panel|path|searchbutton|sortbutton|stat|toast|toolbar|tree|uploadbutton|viewbutton|workzone)\\.js$'))
			.concat(grep(path.join(src, 'js', 'commands'), '(colwidth|copy|cut|duplicate|getfile|help|open|mkdir|paste|restore|rm|search|sort|upload|view)\\.js$')),

		'elfinder.full.css': grep(path.join(src, 'css'), '\\.css$', 'elfinder|theme'),

		'images':	grep(path.join(src, 'img'), '\\.png|\\.gif|\\.svg'),

		'sounds':	grep(path.join(src, 'sounds'), '\\.wav'),

		'i18n': grep(path.join(src, 'js', 'i18n'), '\\.js', 'elfinder.en.js')
				.concat(grep(path.join(src, 'js', 'i18n', 'help'), '\\.js')),

		'php':
			[
				path.join(src, 'php', 'autoload.php'),
				path.join(src, 'php', 'connector.minimal.php-dist'),
				path.join(src, 'php', 'connector.maximal.php-dist'),
				path.join(src, 'php', 'mime.types'),
				path.join(src, 'php', 'MySQLStorage.sql'),
				path.join(src, 'php', 'elFinderPlugin.php'),
				path.join(src, 'php', 'elFinderSession.php'),
				path.join(src, 'php', 'elFinderSessionInterface.php'),
				path.join(src, 'php', '.tmp', '.htaccess'),
				path.join(src, 'php', 'editors', 'editor.php')
			]
			.concat(grep(path.join(src, 'php'), '\\.class\\.php$'))
			.concat(grep(path.join(src, 'php'), 'Netmount\\.php$'))
			.concat(grep(path.join(src, 'php', 'libs'), '\\.php$'))
			.concat(grep(path.join(src, 'php', 'resources'), '.+\..+$')),
		'misc':
			[
				path.join(src, 'js', 'proxy', 'elFinderSupportVer1.js'),
				path.join(src, 'Changelog'),
				path.join(src, 'LICENSE.md'),
				path.join(src, 'README.md'),
				path.join(src, 'composer.json'),
				path.join(src, 'elfinder.html'),
				path.join(src, 'elfinder.legacy.html'),
				path.join(src, 'main.default.js')
			]
			.concat(grep(path.join(src, 'js', 'extras'), '\\.js$'))
			.concat(grep(path.join(src, 'js', 'worker'), '\\.js$')),
		'misc-minimal' :
			[
				path.join(src, 'js', 'proxy', 'elFinderSupportVer1.js'),
				path.join(src, 'Changelog'),
				path.join(src, 'LICENSE.md'),
				path.join(src, 'README.md'),
				path.join(src, 'composer.json'),
				path.join(src, 'elfinder-minimal.html'),
				path.join(src, 'main-minimal.default.js')
			]
	};

// editors files
var editors = [];
try {
	editors = fs.readdirSync(path.join(src, 'php', 'editors')).map(function(n) {
		return fs.statSync(path.join(src, 'php', 'editors', n)).isFile()? null : n;
	});
} catch (err) { }
if (editors.length) {
	for (var i in editors) {
		if (editors[i] !== null) {
			files.php = files.php.concat(grep(path.join(src, 'php', 'editors', editors[i]), '.+'));
		}
	}
}

// plugins files
var plugins = [];
try {
	plugins = fs.readdirSync(path.join(src, 'php', 'plugins')).map(function(n) {
		return fs.statSync(path.join(src, 'php', 'plugins', n)).isFile()? null : n;
	});
} catch (err) { }
if (plugins.length) {
	for (var i in plugins) {
		if (plugins[i] !== null) {
			files.php = files.php.concat(grep(path.join(src, 'php', 'plugins', plugins[i]), '.+'));
		}
	}
}

// custom functions
function grep(prefix, mask, exculde) {
	var m = new RegExp(mask);
	var e = new RegExp(exculde);
	var o = [];
	var input = [];
	try {
		input = fs.readdirSync(prefix);
	} catch (err) { }

	for (i in input) {
		if ((typeof exculde !== 'undefined') && (input[i].match(e))) {
			//console.log('skip ' + input[i]);
			continue;
		}
		if (input[i].match(m)) {
			o.push(path.join(prefix, input[i]));
		}
	}
	return o.sort();
}

function copyFile(from, to, overwrite) {
	if (!overwrite && fs.existsSync(to)) {
		return false;
	}
	console.log('\t' + from);
	var srcs = fs.createReadStream(from);
	var dsts = fs.createWriteStream(to);
	return srcs.pipe(dsts);
}

function getVersion() {
	var ver = fs.readFileSync(path.join(src, 'js', 'elFinder.version.js')).toString();
	ver = ver.match(/elFinder.prototype.version = '(.+)';/);
	return ver[1];
}

function buildComment() {
	var d = new Date();
	var buildDate = d.getFullYear() + '-' +
		(d.getMonth() >= 9 ? '' : '0') + (d.getMonth() + 1) + '-' +
		(d.getDate() >= 10 ? '' : '0') + d.getDate();
	var comment =
		'/*!\n' +
		' * elFinder - file manager for web\n' +
		' * Version ' + getVersion() + ' (' + buildDate + ')\n' +
		' * http://elfinder.org\n' +
		' * \n' +
		' * Copyright 2009-' + d.getFullYear() + ', Studio 42\n' +
		' * Licensed under a 3-clauses BSD license\n' +
		' */\n';
	return comment;
}

// tasks
desc('Help');
task('default', function(){
	console.log(
		"This is elFinder build script, run `jake --tasks` for more info, for a default build run:\n" +
		" jake -C ./build elfinder"
	);
});

desc('pre build task');
task('prebuild', function(){
	console.log('build dir:  ' + path.resolve());
	console.log('src dir:    ' + src);
	var dir = ['css', 'js', 'img', 'sounds',
			path.join('js', 'i18n'), path.join('js', 'i18n', 'help'), path.join('js', 'extras'), path.join('js', 'worker'), path.join('js', 'proxy'), path.join('js', 'worker'),
			'php',
			path.join('php', '.tmp'), path.join('php', 'libs'), path.join('php', 'resources'),
			'files', path.join('files', '.trash')],
		i;
	if (editors.length) {
		dir.push(path.join('php', 'editors'));
		for (i in editors) {
			(editors[i] !== null) && dir.push(path.join('php', 'editors', editors[i]));
		}
	}
	if (plugins.length) {
		dir.push(path.join('php', 'plugins'));
		for (i in plugins) {
			(plugins[i] !== null) && dir.push(path.join('php', 'plugins', plugins[i]));
		}
	}
	for (var d in dir) {
		var bd = dir[d];
		if (!fs.existsSync(bd)) {
			console.log('mkdir ' + bd);
			fs.mkdirSync(bd, dirmode);
		}
	}
	//jake.Task['elfinder'].invoke();
});

desc('build elFinder');
task({'elfinder': ['clean', 'prebuild', 'css/elfinder.min.css', 'js/elfinder.min.js', 'misc', 'js/extras', 'js/worker']}, function(){
	console.log('elFinder build done');
});

desc('minimal build elFinder');
task({'elfinder-minimal': ['clean', 'prebuild', 'css/elfinder.min.css', 'js/elfinder-minimal.min.js', 'misc-minimal']}, function(){
	console.log('elFinder build done');
});

// CSS
desc('concat elfinder.full.css');
file({'css/elfinder.full.css': files['elfinder.full.css']}, function(){
	console.log('concat ' + this.name);
	var data = '';
	for (var f in this.prereqs) {
		file = this.prereqs[f];
		console.log('\t' + file);
		data += '\n/* File: ' + file.replace(src, '') + ' */\n';
		data += fs.readFileSync(file);
	}
	fs.writeFileSync(this.name, buildComment() + data);
});

desc('optimize elfinder.min.css');
file({'css/elfinder.min.css': ['css/elfinder.full.css']}, function () {
	console.log('optimize elfinder.min.css');
	var cssOptimized = csso.minify(fs.readFileSync('css/elfinder.full.css').toString());
	fs.writeFileSync(this.name, cssOptimized.css || cssOptimized);
});

// JS
desc('concat elfinder.full.js');
file({'js/elfinder.full.js': files['elfinder.full.js']}, function(){
	console.log('concat elfinder.full.js');
	var strict = new RegExp('"use strict"\;?\n?');
	var elf = files['elfinder.full.js'];
	var data = '';
	for (var f in elf) {
		file = elf[f];
		console.log('\t' + file);
		data += '\n\n/*\n * File: ' + file.replace(src, '') + '\n */\n\n';
		data += fs.readFileSync(file);
		data = data.replace(strict, '');
	}
	data = "(function(root, factory) {\n" +
	"	if (typeof define === 'function' && define.amd) {\n" +
	"		// AMD\n" +
	"		define(['jquery','jquery-ui'], factory);\n" +
	"	} else if (typeof exports !== 'undefined') {\n" +
	"		// CommonJS\n" +
	"		var $, ui;\n" +
	"		try {\n" +
	"			$ = require('jquery');\n" +
	"			ui = require('jquery-ui');\n" +
	"		} catch (e) {}\n" +
	"		module.exports = factory($, ui);\n" +
	"	} else {\n" +
	"		// Browser globals (Note: root is window)\n" +
	"		factory(root.jQuery, root.jQuery.ui, true);\n" +
	"	}\n" +
	"}(this, function($, _ui, toGlobal) {\n" +
	"toGlobal = toGlobal || false;\n" + data + '\nreturn elFinder;\n}));'; // add UMD closure
	fs.writeFileSync(this.name, buildComment() + data);
});

desc('concat elfinder-minimal.full.js');
file({'js/elfinder-minimal.full.js': files['elfinder-minimal.full.js']}, function(){
	console.log('concat elfinder-minimal.full.js');
	var strict = new RegExp('"use strict"\;?\n?');
	var elf = files['elfinder-minimal.full.js'];
	var data = '';
	for (var f in elf) {
		file = elf[f];
		console.log('\t' + file);
		data += '\n\n/*\n * File: ' + file.replace(src, '') + '\n */\n\n';
		data += fs.readFileSync(file);
		data = data.replace(strict, '');
	}
	data = "(function(root, factory) {\n" +
	"	if (typeof define === 'function' && define.amd) {\n" +
	"		// AMD\n" +
	"		define(['jquery','jquery-ui'], factory);\n" +
	"	} else if (typeof exports !== 'undefined') {\n" +
	"		// CommonJS\n" +
	"		var $, ui;\n" +
	"		try {\n" +
	"			$ = require('jquery');\n" +
	"			ui = require('jquery-ui');\n" +
	"		} catch (e) {}\n" +
	"		module.exports = factory($, ui);\n" +
	"	} else {\n" +
	"		// Browser globals (Note: root is window)\n" +
	"		factory(root.jQuery, root.jQuery.ui, true);\n" +
	"	}\n" +
	"}(this, function($, _ui, toGlobal) {\n" +
	"toGlobal = toGlobal || false;\n" + data + '\nreturn elFinder;\n}));'; // add UMD closure
	fs.writeFileSync(this.name, buildComment() + data);
});

desc('uglify elfinder.min.js');
file({'js/elfinder.min.js': ['js/elfinder.full.js']}, function () {
	console.log('uglify elfinder.min.js');
	var result;
	if (typeof ugjs.minify == 'undefined') {
		var ugp  = ugjs.parser;
		var ugu  = ugjs.uglify;
		var ast = ugp.parse(fs.readFileSync('js/elfinder.full.js').toString()); // parse code and get the initial AST
		ast = ugu.ast_mangle(ast); // get a new AST with mangled names
		ast = ugu.ast_squeeze(ast); // get an AST with compression optimizations
		result = ugu.split_lines(ugu.gen_code(ast), 1024 * 8); // insert new line every 8 kb
	} else {
		result = ugjs.minify('js/elfinder.full.js').code;
	}
	fs.writeFileSync(this.name, buildComment() + result);
});

desc('uglify elfinder-minimal.min.js');
file({'js/elfinder-minimal.min.js': ['js/elfinder-minimal.full.js']}, function () {
	console.log('uglify elfinder-minimal.min.js');
	var result;
	if (typeof ugjs.minify == 'undefined') {
		var ugp  = ugjs.parser;
		var ugu  = ugjs.uglify;
		var ast = ugp.parse(fs.readFileSync('js/elfinder-minimal.full.js').toString()); // parse code and get the initial AST
		ast = ugu.ast_mangle(ast); // get a new AST with mangled names
		ast = ugu.ast_squeeze(ast); // get an AST with compression optimizations
		result = ugu.split_lines(ugu.gen_code(ast), 1024 * 8); // insert new line every 8 kb
	} else {
		result = ugjs.minify('js/elfinder-minimal.full.js').code;
	}
	fs.writeFileSync(this.name, buildComment() + result);
});

// IMG + SOUNDS + I18N + PHP
desc('copy misc files');
task('misc', function(){
	console.log('copy misc files');
	var cf = files['images']
		.concat(files['sounds'])
		.concat(files['i18n'])
		.concat(path.join(src, 'css', 'theme.css'))
		.concat(files['php'])
		.concat(files['misc'])
		.concat(path.join(src, 'files', '.gitignore'))
		.concat(path.join(src, 'files', '.trash', '.gitignore'));
	for (i in cf)
	{
		var dst = cf[i].replace(src, '').substr(1);
		copyFile(cf[i], dst);
	}
	// elfinder.html
	// var hs = path.join(src, 'build', 'elfinder.html');
	// var hd = path.join('elfinder.html');
	// copyFile(hs, hd);

	// connector
	//var cs = path.join(src, 'php', 'connector.minimal.php-dist');
	//var cd = path.join('php', 'connector.php-dist');
	//copyFile(cs, cd);
});

// IMG + SOUNDS + I18N + PHP
desc('copy misc files');
task('misc-minimal', function(){
	console.log('copy misc files');
	var cf = files['images']
		.concat(files['sounds'])
		.concat(files['i18n'])
		.concat(path.join(src, 'css', 'theme.css'))
		.concat(files['php'])
		.concat(files['misc-minimal'])
		.concat(path.join(src, 'files', '.gitignore'))
		.concat(path.join(src, 'files', '.trash', '.gitignore'));
	for (i in cf)
	{
		var dst = cf[i].replace(src, '').substr(1);
		copyFile(cf[i], dst);
	}
});

desc('uglify js/extras');
task('js/extras', function(){
	var files = grep(path.join(src, 'js', 'extras'), '\\.js$');
	var base, name, result;
	for (var i in files) {
		name = files[i].replace(/^.+\/([^\/]+)$/, '$1');
		if (! name.match(/\.min\./)) {
			base = name.replace(/\.js$/, '');
			name = 'js/extras/' + name;
			console.log('uglify ' + name);
			if (typeof ugjs.minify == 'undefined') {
				var ugp  = ugjs.parser;
				var ugu  = ugjs.uglify;
				var ast = ugp.parse(fs.readFileSync(files[i]).toString()); // parse code and get the initial AST
				ast = ugu.ast_mangle(ast); // get a new AST with mangled names
				ast = ugu.ast_squeeze(ast); // get an AST with compression optimizations
				result = ugu.split_lines(ugu.gen_code(ast), 1024 * 8); // insert new line every 8 kb
			} else {
				result = ugjs.minify(files[i]).code;
			}
			fs.writeFileSync('js/extras/' + base + '.min.js', result);
		}
	}
});

// other
desc('clean build dir');
task('clean', function(){
	console.log('cleaning the floor');
	uf = [path.join('js', 'elfinder.full.js'), path.join('js', 'elfinder.min.js'),
		path.join('css', 'elfinder.full.css'), path.join('css', 'elfinder.min.css')];
	// clean images, sounds, js/i18n and php only if we are not in src
	if (src != path.resolve()) {
		uf = uf
			.concat(grep('./'))
			.concat(grep('css'))
			.concat(grep('files'))
			.concat(grep('img'))
			.concat(grep('js'))
			.concat(grep('php'))
			.concat(grep('sounds'));
		uf = [].concat.apply(uf, grep('files').map(function(d) { return grep(d); }));
		uf = [].concat.apply(uf, grep('js').map(function(d) { return grep(d); }));
		uf = [].concat.apply(uf, grep(path.join('js', 'i18n')).map(function(d) { return grep(d); }));
		uf = [].concat.apply(uf, grep('php').map(function(d) { return grep(d); }));
		uf = [].concat.apply(uf, grep(path.join('php', 'editors')).map(function(d) { return grep(d); }));
		uf = [].concat.apply(uf, grep(path.join('php', 'plugins')).map(function(d) { return grep(d); }));
	}
	for (var f in uf) {
		var file = uf[f];
		if (fs.existsSync(file) && fs.statSync(file).isFile()) {
			console.log('\tunlink ' + file);
			fs.unlinkSync(file);
		}
	}
	// if (path.join(src, 'build') != path.resolve()) {
	// 	fs.unlinkSync('elfinder.html');
	// }
	if (src != path.resolve()) {
		var ud = [
			'css', 'img', 'sounds', path.join('files', '.trash'), 'files',
			path.join('js', 'proxy'), path.join('js', 'i18n', 'help'), path.join('js', 'i18n'), path.join('js', 'extras'), path.join('js', 'worker'), 'js',
			path.join('php', '.tmp'), path.join('php', 'libs'), path.join('php', 'resources')]
			.concat(grep(path.join('php', 'editors')))
			.concat(grep(path.join('php', 'plugins')))
			.concat([path.join('php', 'editors'), path.join('php', 'plugins'), 'php']);
		for (var d in ud) {
			var dir = ud[d];
			if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
				console.log('\trmdir	' + dir);
				fs.rmdirSync(dir);
			}
		}
	}
});

desc('get current build version from git');
task('version', function(){
	version = getVersion();
	console.log('Version: ' + version);
	complete();
}, {async: true});

desc('create package task');
task('prepack', function(){
	new jake.PackageTask('elfinder', version, function(){
		var fls = (files['php'].concat(files['images']).concat(files['sounds']).concat(files['i18n']).concat(files['misc'])).map(function(i){
			return i.substr(src.length + 1);
		});
		fls.push(path.join('css', 'elfinder.min.css'));
		fls.push(path.join('css', 'theme.css'));
		fls.push(path.join('js', 'elfinder.min.js'));
		fls.push('files');
		console.log('Including next files into release:');
		console.log(fls);
		this.packageFiles.items = fls;
		this.needTarGz = true;
		this.needZip = true;
	});
});

desc('pack release');
task({'release': ['version']}, function(){
	var prePack = jake.Task['prepack'];
	prePack.addListener('complete', function() {
		var pack = jake.Task['package'];
		pack.addListener('complete', function() {
			console.log('Created package for elFinder ' + version);
			complete();
		});
		pack.invoke();
	});
	prePack.invoke();
}, {async: true});
