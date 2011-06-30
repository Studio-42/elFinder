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
  util = require('util'),
  ugp  = require('uglify-js').parser,
  ugu  = require('uglify-js').uglify,
  csp  = require('csso/lib/cssp').parse,
  csm  = require('csso/lib/cssm').minimize,
  csu  = require('csso/lib/cssoutils');

var dirmode = 0755,
  src = __dirname,
  files = {
  'elfinder.full.js':
    [
      path.join(src, 'js', 'elFinder.js'),
      path.join(src, 'js', 'elFinder.version.js'),
      path.join(src, 'js', 'jquery.elfinder.js'),
      path.join(src, 'js', 'elFinder.options.js'),
      path.join(src, 'js', 'elFinder.history.js'),
      path.join(src, 'js', 'elFinder.command.js'),
      path.join(src, 'js', 'elFinder.resources.js')
    ]
    .concat(grep(path.join(src, 'js', 'ui'), '\\.js$'))
    .concat(grep(path.join(src, 'js', 'commands'), '\\.js$')),
  'elfinder.full.css': grep(path.join(src, 'css'), '\\.css$', 'theme'),
  'images':  grep(path.join(src, 'img'), '\\.png|\\.gif')
  };
// @TODO exclude
function grep(prefix, mask, exculde) {
  var m = new RegExp(mask);
  var e = new RegExp(exculde);
  var o = new Array();
  var input = fs.readdirSync(prefix);
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

// tasks

desc('elFinder default task')
task('default', function(){
  console.log('build dir:   ' + path.resolve());
  console.log('src dir:     ' + src);
  var arr = ['css', 'js', 'img'];
  for (p in arr) {
    bp = arr[p];
    if (!path.existsSync(bp)) {
      console.log('mkdir ' + bp);
      fs.mkdirSync(bp, dirmode);
    }
  }
  jake.Task['build'].invoke();
});

desc('build elFinder')
task({'build': ['css/elfinder.min.css', 'js/elfinder.min.js', 'images']}, function(){
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
    data += fs.readFileSync(file);
  }
  fs.writeFileSync(this.name, data);
});

desc('optimize elfinder.min.css');
file({'css/elfinder.min.css': ['css/elfinder.full.css']}, function () {
  console.log('optimize elfinder.min.css');
  var csso = csu.min2string(
    csm(
      csp(
        fs.readFileSync('css/elfinder.full.css').toString()
      ),
      {}
    ).nodes,
    ''
  );
  fs.writeFileSync(this.name, csso);
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
    data += fs.readFileSync(file);
  }
  data = '(function($) {\n' + data + '\n})(jQuery);'; // add calusure
  fs.writeFileSync(this.name, data);
});

desc('uglify elfinder.min.js');
file({'js/elfinder.min.js': ['js/elfinder.full.js']}, function () {
  console.log('uglify elfinder.min.js');
  var ast = ugp.parse(fs.readFileSync('js/elfinder.full.js').toString()); // parse code and get the initial AST
  ast = ugu.ast_mangle(ast); // get a new AST with mangled names
  ast = ugu.ast_squeeze(ast); // get an AST with compression optimizations
  fs.writeFileSync(this.name, ugu.gen_code(ast));
});

// IMG
desc('copy images')
task('images', function(){
  console.log('copy images');
  var images = files['images'];
  for (i in images)
  {
    var dst = images[i].replace(src, '').substr(1);
    //console.log(dst);
    if (path.existsSync(dst)) {
      continue;
    }

    console.log('\t' + images[i]);
    var srcimg = fs.createReadStream(images[i]);
    var dstimg = fs.createWriteStream(dst);
    util.pump(srcimg, dstimg);
  }
});

// other
desc('clean the floor')
task('clean', function(){
  console.log('cleaning the floor')
  ul = ['js/elfinder.full.js', 'js/elfinder.min.js', 'css/elfinder.full.css', 'css/elfinder.min.css'];
  for (f in ul) {
    console.log('\tunlink ' + ul[f]);
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

