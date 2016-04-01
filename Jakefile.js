/*
 * This is build file for elFinder 2.x
 * Build tool:    https://github.com/mde/jake
 * JS compressor: https://github.com/mishoo/UglifyJS/
 * CSS optimizer: https://github.com/afelix/csso
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
				path.join(src, 'js', 'elFinder.options.js'),
				path.join(src, 'js', 'elFinder.history.js'),
				path.join(src, 'js', 'elFinder.command.js'),
				path.join(src, 'js', 'elFinder.resources.js'),
				path.join(src, 'js', 'jquery.dialogelfinder.js'),
				path.join(src, 'js', 'i18n', 'elfinder.en.js')
			]
			.concat(grep(path.join(src, 'js', 'ui'), '\\.js$'))
			.concat(grep(path.join(src, 'js', 'commands'), '\\.js$')),

		'elfinder.full.css': grep(path.join(src, 'css'), '\\.css$', 'elfinder|theme'),

		'images':	grep(path.join(src, 'img'), '\\.png|\\.gif'),

		'sounds':	grep(path.join(src, 'sounds'), '\\.wav'),
		
		'i18n': grep(path.join(src, 'js', 'i18n'), '\\.js', 'elfinder.en.js'),

		'php':
			[
				path.join(src, 'php', 'connector.minimal.php-dist'),
				path.join(src, 'php', 'mime.types'),
				path.join(src, 'php', 'MySQLStorage.sql'),
				path.join(src, 'php', 'elFinderSession.php'),
				path.join(src, 'php', 'elFinderSessionInterface.php')
			]
			.concat(grep(path.join(src, 'php'), '\\.class\.php$'))
			.concat(grep(path.join(src, 'php'), 'Netmount\.php$')),
		'misc':
			[
				path.join(src, 'js', 'proxy', 'elFinderSupportVer1.js'),
				path.join(src, 'Changelog'),
				path.join(src, 'README.md'),
				path.join(src, 'composer.json'),
				path.join(src, 'elfinder.html')
			]
			.concat(grep(path.join(src, 'js', 'extras'), '\\.js$'))
	};

// plugins files
var plugins = [];
try {
	plugins = fs.readdirSync(path.join(src, 'php', 'plugins'));
} catch (err) { }
if (plugins.length) {
	for (var i in plugins) {
		files.php = files.php.concat(grep(path.join(src, 'php', 'plugins', plugins[i]), '.+'));
	}
}

// custom functions
function grep(prefix, mask, exculde) {
	var m = new RegExp(mask);
	var e = new RegExp(exculde);
	var o = new Array();
	var input = new Array();
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

function getComment() {
	var ver = fs.readFileSync(path.join(src, 'js', 'elFinder.version.js')).toString();
	ver = ver.match(/= '(.+)';/);
	var d = new Date();
	var bd = d.getFullYear() + '-' +
		(d.getMonth() >= 9 ? '' : '0') + (d.getMonth() + 1) + '-' +
		(d.getDate() >= 10 ? '' : '0') + d.getDate();
	var comment =
		'/*!\n' +
		' * elFinder - file manager for web\n' +
		' * Version ' + ver[1] + ' (' + bd + ')\n' +
		' * http://elfinder.org\n' +
		' * \n' +
		' * Copyright 2009-' + d.getFullYear() + ', Studio 42\n' +
		' * Licensed under a 3 clauses BSD license\n' +
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
	var dir = ['css', 'js', 'img', 'sounds', path.join('js', 'i18n'), path.join('js', 'extras'), path.join('js', 'proxy'), 'php', 'files'];
	if (plugins.length) {
		dir.push(path.join('php', 'plugins'));
		for (var i in plugins) {
			dir.push(path.join('php', 'plugins', plugins[i]));
		}
	}
	for (d in dir) {
		var bd = dir[d];
		if (!fs.existsSync(bd)) {
			console.log('mkdir ' + bd);
			fs.mkdirSync(bd, dirmode);
		}
	}
	//jake.Task['elfinder'].invoke();
});

desc('build elFinder');
task({'elfinder': ['prebuild', 'css/elfinder.min.css', 'js/elfinder.min.js', 'misc']}, function(){
	console.log('elFinder build done');
});

// CSS
desc('concat elfinder.full.css');
file({'css/elfinder.full.css': files['elfinder.full.css']}, function(){
	console.log('concat ' + this.name);
	var data = '';
	for (f in this.prereqs) {
		file = this.prereqs[f];
		console.log('\t' + file);
		data += '\n/* File: ' + file.replace(src, '') + ' */\n';
		data += fs.readFileSync(file);
	}
	fs.writeFileSync(this.name, getComment() + data);
});

desc('optimize elfinder.min.css');
file({'css/elfinder.min.css': ['css/elfinder.full.css']}, function () {
	console.log('optimize elfinder.min.css');
	var css_optimized = csso.justDoIt(fs.readFileSync('css/elfinder.full.css').toString());
	fs.writeFileSync(this.name, getComment() + css_optimized);
});

// JS
desc('concat elfinder.full.js');
file({'js/elfinder.full.js': files['elfinder.full.js']}, function(){
	console.log('concat elfinder.full.js');
	var strict = new RegExp('"use strict"\;?\n?');
	var elf = files['elfinder.full.js'];
	var data = '';
	for (f in elf) {
		file = elf[f];
		console.log('\t' + file);
		data += '\n\n/*\n * File: ' + file.replace(src, '') + '\n */\n\n';
		data += fs.readFileSync(file);
		data = data.replace(strict, '');
	}
	data = '(function($) {\n' + data + '\n})(jQuery);'; // add closure
	fs.writeFileSync(this.name, getComment() + data);
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
	fs.writeFileSync(this.name, getComment() + result);
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
		.concat(files['misc']);
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
	var cs = path.join(src, 'php', 'connector.minimal.php-dist');
	var cd = path.join('php', 'connector.php-dist');
	copyFile(cs, cd);
});

// other
desc('clean build dir');
task('clean', function(){
	console.log('cleaning the floor');
	uf = ['js/elfinder.full.js', 'js/elfinder.min.js', 'css/elfinder.full.css', 'css/elfinder.min.css'];
	// clean images, sounds, js/i18n and php only if we are not in src
	if (src != path.resolve()) {
		uf = uf
			.concat(grep('img', '\\.png|\\.gif'))
			.concat(grep('sounds', '\\.wav'))
			.concat(grep(path.join('js', 'i18n')))
			.concat(path.join('css', 'theme.css'))
			.concat(grep('php'))
			.concat([path.join('js', 'proxy', 'elFinderSupportVer1.js'), 'Changelog', 'README.md', 'elfinder.html', path.join('files', 'readme.txt')]);
	}
	for (f in uf) {
		var file = uf[f];
		if (fs.existsSync(file)) {
			console.log('\tunlink ' + file);
			fs.unlinkSync(file);
		}
	}
	// if (path.join(src, 'build') != path.resolve()) {
	// 	fs.unlinkSync('elfinder.html');
	// }
	if (src != path.resolve()) {
		var ud = ['css', path.join('js', 'proxy'), path.join('js', 'i18n'), 'js', 'img', 'sounds', 'php', 'files'];
		for (d in ud) {
			var dir = ud[d];
			if (fs.existsSync(dir)) {
				console.log('\trmdir	' + dir);
				fs.rmdirSync(dir);
			}
		}
	}
});

desc('get current build version from git');
task('version', function(){
	jake.exec(['git describe --tags > .version'], function(){
		version = fs.readFileSync('.version').toString().replace(/\n$/, '');
		fs.unlinkSync('.version');
		console.log('Version: ' + version);
		complete();
	});
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
