var driver = require('elfinder.driver');


console.log(driver)

var localfs = function() {
	this.driverId = 'l';
	
	this._prepare = function(opts) {
		opts.imgLib = 'gd';
		return opts;
	}
	
}

localfs.prototype = new driver();

module.exports = exports = localfs;
