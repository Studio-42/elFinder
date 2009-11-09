function elcookie(name, value, opts) {
	if (typeof value == 'undefined') {
		if (document.cookie && document.cookie != '') {
			var cookies = document.cookie.split(';');
			var test = name+'=';
			for (var i=0; i<cookies.length; i++) {
				var c = $.trim(cookies[i]);
				if (c.substring(0, name.length+1) == test) {
					return decodeURIComponent(c.substring(name.length+1));
				}
			}
		}
		return '';
	} else {
		opts = $.extend({expires : '', path : '', domain : '', secure : false}, opts);
		if (value===null) {
			value = '';
			opts.expires = -1;
		}
		var expires = '';
		if (opts.expires) {
			var d = opts.expires.toUTCString ? opts.expires : new Date();
			if (typeof opts.expires == 'number') {
				d.setTime(d.getTime() + (opts.expires * 24 * 60 * 60 * 1000));
			}
			expires = '; expires='+d.toUTCString();
		}
		document.cookie = name+'='+encodeURIComponent(value)+expires+(opts.path ? '; path='+opts.path : '')+(opts.domain ? '; domain='+opts.domain : '')+(opts.secure ? '; secure' : '');
	}
}
