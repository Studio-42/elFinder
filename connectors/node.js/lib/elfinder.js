require.paths.unshift(__dirname);
var $ = require('missing-utils');
// var d = require('elfinder.driver')
// var local = require('./local');

var log = function(o) {
	console.log(o);	
}
// log(d)

var elFinder = function(opts) {
	this.version = '0.1';
	this.protocolVersion = '2.0';
	this.volumes = {};
	this.defaultVolume = null;
	
	this.options = $.extend({}, this.options, opts)
	// log(this.options)
	
	this.options.volumes.forEach(function(o, i) {
		var name, driver, id;
		if (o && o.path && o.driver) {
			name = o.driver;
			try {
				var driver = require('elfinder.'+name)
			} catch(e) {
				log('Invalid driver name: '+name)
			}
			
			volume = new driver();
			id = volume.driverId+i;
			volume.mount(id, o);
			console.log(volume.options)
		}
	})
}

elFinder.prototype.options = {
	volumes : [],
	debug : true
	
};


module.exports = exports = elFinder;