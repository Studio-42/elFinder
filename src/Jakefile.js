/*
 * This is build file for elFinder 2.x
 * Build tool:    https://github.com/mde/jake
 * JS compressor: https://github.com/mishoo/UglifyJS/
 * CSS optimizer: https://github.com/afelix/csso
 */

require.paths.push('/usr/local/lib/node_modules');

var sys  = require('sys'),
  fs   = require('fs'),
  proc = require('child_process'),
  ugp  = require('uglify-js').parser,
  ugu  = require('uglify-js').uglify,
  csp  = require('csso/lib/cssp').parse,
  csm  = require('csso/lib/cssm').minimize,
  csu  = require('csso/lib/cssoutils');


function grep(path, mask, exculde) {
  var r = new RegExp(mask);
  var o = new Array();
  var input = fs.readdirSync(path);
  for (i in input) {
    if (input[i].match(r)) {
      o.push(path + input[i]);
    }
  }
  return o.sort();
}

var files = {
  'elfinder.js':
    [
      'js/elFinder.js',
      'js/elFinder.version.js',
      'js/jquery.elfinder.js',
      'js/elFinder.options.js',
      'js/elFinder.mixins.js',
      'js/elFinder.history.js',
      'js/elFinder.command.js',
      'js/elFinder.resources.js'
    ]
    .concat(grep('js/ui/', '\\.js$'))
    .concat(grep('js/commands/', '\\.js$')),

  'elfinder.css': grep('css/', '\\.css$')
}

var buildroot = './';

desc('elFinder default task')
task('default', function(root){
  if (root) {
    buildroot = root;
    // @TODO check for this root
  }
  console.log('build start in: ' + buildroot);
  jake.Task['build'].invoke();
});

desc('build elFinder')
task({'build': ['elfinder.min.css', 'elfinder.min.js']}, function(){
  console.log('build done');
});

desc('uglify elfinder.min.js');
file({'elfinder.min.js': ['elfinder.js']}, function () {
  console.log('uglify elfinder.min.js');
  var ast = ugp.parse(fs.readFileSync('elfinder.js').toString()); // parse code and get the initial AST
  ast = ugu.ast_mangle(ast); // get a new AST with mangled names
  ast = ugu.ast_squeeze(ast); // get an AST with compression optimizations
  fs.writeFileSync('elfinder.min.js', ugu.gen_code(ast));
});

desc('optimize elfinder.css');
file({'elfinder.min.css': ['elfinder.css']}, function () {
  console.log('optimize elfinder.min.css');
  var csso = csu.min2string(
    csm(
      csp(
        fs.readFileSync('elfinder.css').toString()
      ),
      {}
    ).nodes,
    ''
  );
  fs.writeFileSync('elfinder.min.css', csso);
});

desc('concat elfinder.js')
file({'elfinder.js': files['elfinder.js']}, function(){
  console.log('concat elfinder.js');
  // @TODO remove use strict
  myf = files['elfinder.js'];
  var data = '';
  for (f in myf) {
    console.log("\t" + myf[f]);
    data += "\n/* File: " + myf[f] + " */\n";
    data += fs.readFileSync(myf[f]);
  }
  fs.writeFileSync('elfinder.js', data);
});

desc('concat elfinder.css')
file({'elfinder.css': files['elfinder.css']}, function(){
  console.log('concat elfinder.css')
  myf = files['elfinder.css'];
  var data = '';
  for (f in myf) {
    console.log("\t" + myf[f]);
    data += "\n/* File: " + myf[f] + " */\n";
    data += fs.readFileSync(myf[f]);
  }
  fs.writeFileSync('elfinder.css', data);
});

desc('clean the floor')
task('clean', function(){
  console.log('cleaning the floor')
  ul = ['elfinder.js', 'elfinder.min.js', 'elfinder.css', 'elfinder.min.css'];
  for (f in ul) {
    console.log("\tunlink " + ul[f]);
    fs.unlink(ul[f]);
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

