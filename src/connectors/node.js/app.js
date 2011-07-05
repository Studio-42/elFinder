
var elfinder = require('./lib/elfinder')
	opts = {
		volumes : [{
			path : '../../../files/',
			driver : 'localfs'
		}]
	}
	;


var fm = new elfinder(opts)
