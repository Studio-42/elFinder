var $ = require('missing-utils'),
	path = require('path'),
	fs = require('fs');

var driver = function() {
	
}

driver.prototype = {
	id : '_',
	
	driverId : 'u',
	
	mounted : false,
	
	options : {
		path : ''
	},
	
	path : '',
	
	mount : function(id, opts) {
		var stat;
		
		this.id = id;
		opts = this._prepare(opts);
		
		this.options = $.extend({}, this.options, opts);
		
		this.path = path.normalize(this.options.path);
		
		try {
			stat = fs.statSync(this.path);
		} catch (e) {
			console.log('path does not exists: '+this.path);
			return false
		}
		
		if (!stat.isDirectory()) {
			console.log('path is not a directory: '+this.path);
			return false
		}
		console.log(stat);
		return false;
	},
	
	_prepare : function(opts) {
		return opts;
	},
	
	_configure : function() {
		
	}
}

module.exports = exports = driver;