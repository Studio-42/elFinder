/*
 * This is build file for elFinder 2.x
 * Build tool:    https://github.com/mde/jake
 * JS compressor: https://github.com/mishoo/UglifyJS/
 * CSS optimizer: https://github.com/afelix/csso
 */

require.paths.push('/usr/local/lib/node_modules');

var sys  = require('sys'),
  fs   = require('fs'),
  path = require('path'),
  ugp  = require('uglify-js').parser,
  ugu  = require('uglify-js').uglify,
  csp  = require('csso/lib/cssp').parse,
  csm  = require('csso/lib/cssm').minimize,
  csu  = require('csso/lib/cssoutils');

var files = {
  'elfinder.full.js':
    [
      'js/elFinder.js',
      'js/elFinder.version.js',
      'js/jquery.elfinder.js',
      'js/elFinder.options.js',
      'js/elFinder.history.js',
      'js/elFinder.command.js',
      'js/elFinder.resources.js'
    ]
    .concat(grep('js/ui/', '\\.js$'))
    .concat(grep('js/commands/', '\\.js$')),

  'elfinder.full.css': grep('css/', '\\.css$', 'theme')
  },
  dirmode = 0755,
  buildroot = 'build',
  src = __dirname;

// @TODO exclude
function grep(path, mask, exculde) {
  var r = new RegExp(mask);
  var e = new RegExp(exculde);
  var o = new Array();
  var input = fs.readdirSync(path);
  for (i in input) {
    if ((typeof exculde !== 'undefined') && (input[i].match(e))) {
      //console.log('skip ' + input[i]);
      continue;
    }
    if (input[i].match(r)) {
      o.push(path + input[i]);
    }
  }
  return o.sort();
}

// tasks

desc('elFinder default task')
task('default', function(root){
  if (root) {
    buildroot = root;
  }
  var arr = ['', 'css', 'js', 'img'];
  for (p in arr) {
    bp = path.join(buildroot, arr[p])
    if (!path.existsSync(bp)) {
      console.log('mkdir ' + bp);
      fs.mkdirSync(bp, dirmode);
    }
  }
  console.log(path.resolve());
  console.log('build dir:   ' + buildroot);
  console.log('src dir:     ' + src);
  jake.Task['build'].invoke();
});

desc('build elFinder')
task({'build': ['css/elfinder.min.css', 'js/elfinder.min.js']}, function(){
  console.log('build done');
});

// CSS
desc('concat elfinder.full.css')
file({'css/elfinder.full.css': files['elfinder.full.css']}, function(){
  console.log('concat ' + this.name)
  var data = '';
  for (f in this.prereqs) {
    file = this.prereqs[f];
    console.log('\t' + file);
    data += '\n/* File: ' + file + ' */\n';
    data += fs.readFileSync(path.join(src, file));
  }
  fs.writeFileSync(path.join(buildroot, this.name), data);
});

desc('optimize elfinder.min.css');
file({'css/elfinder.min.css': ['css/elfinder.full.css']}, function () {
  console.log('optimize elfinder.min.css');
  var csso = csu.min2string(
    csm(
      csp(
        fs.readFileSync(path.join(buildroot, 'css/elfinder.full.css')).toString()
      ),
      {}
    ).nodes,
    ''
  );
  fs.writeFileSync(path.join(buildroot, this.name), csso);
});

// JS
desc('concat elfinder.full.js')
file({'js/elfinder.full.js': files['elfinder.full.js']}, function(){
  console.log('concat elfinder.full.js');
  // @TODO remove use strict
  myf = files['elfinder.full.js'];
  var data = '';
  for (f in myf) {
    file = myf[f];
    console.log('\t' + file);
    data += '\n/* File: ' + file + ' */\n';
    data += fs.readFileSync(path.join(src, file));
  }
  data = '(function($) {\n' + data + '\n})(jQuery);'; // add calusure
  fs.writeFileSync(path.join(buildroot, this.name), data);
});

desc('uglify elfinder.min.js');
file({'js/elfinder.min.js': ['js/elfinder.full.js']}, function () {
  console.log('uglify elfinder.min.js');
  var ast = ugp.parse(fs.readFileSync(path.join(buildroot, 'js/elfinder.full.js')).toString()); // parse code and get the initial AST
  ast = ugu.ast_mangle(ast); // get a new AST with mangled names
  ast = ugu.ast_squeeze(ast); // get an AST with compression optimizations
  fs.writeFileSync(path.join(buildroot, this.name), ugu.gen_code(ast));
});

// other
desc('clean the floor')
task('clean', function(){
  console.log('cleaning the floor')
  ul = ['js/elfinder.full.js', 'js/elfinder.min.js', 'css/elfinder.full.css', 'css/elfinder.min.css'];
  for (f in ul) {
    console.log("\tunlink " + ul[f]);
    fs.unlink(path.join(buildroot, ul[f]));
  }
});

desc('help')
task('help', function(){
  console.log(
    'Usage: jake [command]',
    '\n\nCommands:',
    '\n  build     Build elFinder',
    '\n  clean     Clean build files'
  );
});

