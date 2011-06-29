/*
 * This is build file for elFinder 2.x
 * Build tool: https://github.com/mde/jake
 * Compressor: https://github.com/mishoo/UglifyJS/
 */

var sys  = require('sys'),
  fs   = require('fs'),
  proc = require('child_process');

function grep(path, mask) {
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

var elfinder_files = [
  'js/elFinder.js',
  'js/elFinder.version.js',
  'js/jquery.elfinder.js',
  'js/elFinder.options.js',
  'js/elFinder.mixins.js',
  'js/elFinder.history.js',
  'js/elFinder.command.js'
];
elfinder_files.concat(grep('js/ui/', '\\.js$'));
elfinder_files.concat(grep('js/commands/', '\\.js$'));

var files = {
  'elfinder.js': elfinder_files
}

//console.log(files);


desc('elFinder default task')
task('default', function(){
  console.log('Nothing to do');
  jake.Task['qwer'].invoke();
});

desc('This is the qwer task. It depends on default');
task({'qwer': ['default']}, function () {
  console.log('doing qwer task.');
});

desc('Building elFinder');
task({'elfinder': ['elfinder.js']}, function () {
  console.log('doing wow task.');
});

desc('make elfinder.js')
file({'elfinder.js': files['elfinder.js']}, function(){
  myf = files['elfinder.js'];
  var data = '';
  for (f in myf) {
    data += fs.readFileSync(myf[f]);
  }
  console.log('make elfinder.js')
  fs.writeFileSync('elfinder.js', data);
  //console.log(sys.inspect(arguments));
  //console.log(files);
});

