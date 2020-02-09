(function(root, factory) {
	if (typeof define === 'function' && define.amd) {
		define(['jquery', 'elfinder'], factory);
	} else if (typeof exports !== 'undefined') {
		module.exports = factory(require('jquery'), require('elfinder'));
	} else {
		factory(root.jQuery, root.elFinder);
	}
}(this, function($, elFinder) {
try {

(function(){
	var style = document.createElement('style'),
		sheet;
	document.head.appendChild(style);
	sheet = style.sheet;
	sheet.insertRule('.elfinder-button-icon.elfinder-button-icon-login { background:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAgCAYAAAAbifjMAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH3wwODgkfXMcF3gAAA0ZJREFUSMftlVFo1VUYwH/nf+/uvW4O3NA23R0uHdPV1qJ6CwwiCgKfJNCXIiuxKAipoIdi9Bb1WA8rCcKXJMQgjIweTCgUdWipTMttuEWhbd61sf3/5/u+c3rYdrcbblhvQQcO39P3+w7nfN/vOP7FunjwlXdDsANmOp3/J4mXP3n15xCss7ChlZHRSzQnBa0C+vv7YwiBxW1m1bi3J5IQKKxvYe3dnQQLxJGfEMmoAsyMcrkMgHOuJsZ4kaaHHgYc2cwEJhkxBkSUZDkA4ER6nEjEOVfdZkYwI62MI7NTBPHEYIhktQDnHH9kN/mq8kUNQNUTTDD1BPUEzYgh4H1KfucHj8VggQt6isFbP9DR1oGqcXTsMLva9szD1RNVCeIx9RAdMQRUUvKmxlOP7kKCoaZoUMSEM+k5Phs+xJ6tTyMLlU0yoqa0bLjBL1HxPiOvYngVJtNJvAliAji679nOYHqer0eP0VEPpor5jMaGWzSvm6AuN8e0pCSqRmaeQlKkmCtRzJXIuRxnzw1SGf+TJ7fsRCQlaIZJRmUyx+joejJfN/+MKsrhLz9HxTA1yuU2NBhT49M8f99+nHN4nxFUCJJhIkxkeQgBEU9y8u3T7vt3zrru3/p4+d4DTP06w8T1Ci/0vbj0CpLO34EKpguwEFD1S42kqjjniBbZf/9LNc3kJZtPlowgHucCMa4A2Nu3r1p5ESAyX7W+qZ2ggmazEH/HTHEDAwNxaGiIsbGxmv5fHndvGaWhsZFiqYFCqZ66QpHpmQrXrwzedHcyhR8/136XmW41k24z7QrBykm+sNskm3L/+6B2nCORE+nxavKd+KDmBN/OHWPKV3D1rqYX/u4DcEs+WAQMNZ9nU8tGmmwdh4YPYmrV+fiw/YGVfQDwxPuP/Ni6qZXerl40KNs7tyELXjhy5OjqPnj8vR2fbt64ube3q4dKWmFWZhETfBAa8mtRNUT8yj745vWTz1wZvnrp9IUzJC5HMVeilF9DKbeGzDwqtroPAL5761TPjjdcnEvnUFWuXRvBNGBqBAur+qB6iVtubGPEXSWJOV578M2aXtDLH9X4wLl81QfJ8nF+tnsf0Wr/hNv5IIi/vQ+SJPkP+uAvyoJNfRlNM5QAAAAASUVORK5CYII="); background-position: 0 0; }', 0);
	sheet.insertRule('.elfinder-button-icon.elfinder-button-icon-logout { background-position: 0 -16px; }', 1);
})();
elFinder.prototype.commands.login = function() {
	var self = this,
		fm   = this.fm,
		url  = fm.options.url,
		aopt = {
			dataType: 'json',
			headers: fm.options.customHeaders,
			xhrFields: fm.options.xhrFields,
			cache: false
		};
	this.alwaysEnabled  = true;
	this.updateOnSelect = false;
	this.syncTitleOnChange = true;
	this.options = {
		ui       : 'button',
		loginUrl : url+'?login',
		logoutUrl: url+'?logout',
		statusUrl: url+'?status'
	};
	this.value = null;
	this.handlers = {
		'open': function(){
			if (self.value === null) {
				self.value = '';
				$.ajax(self.options.statusUrl, aopt).done(function(res){
					var val = res.uname? res.uname : '';
					self.title = val? fm.i18n('logout', val) : fm.i18n('cmdlogin');
					self.className = val? 'login elfinder-button-icon-logout' : 'login';
					self.update(void(0), val);
				});
			}
		} 
	};
	
	this.getstate = function() {
		return this.value? 1 : 0;
	};
	
	this.exec = function() {
		var dologin = (! self.value),
			getAjax = function(opt) {
				return $.ajax(self.options[dologin? 'loginUrl' : 'logoutUrl'], opt).done(function(res, rc, xhr){
					if (res.error) {
						fm.error(res.error);
					} else {
						var val = res.uname? res.uname : '';
						fm.setCustomHeaderByXhr(xhr); // set custom header of options.parrotHeaders
						self.title = val? fm.i18n('logout', val) : fm.i18n('cmdlogin');
						self.className = val? 'login elfinder-button-icon-logout' : 'login';
						self.update(void(0), val);
						var tm,
							dfd = fm.sync().always(function() { 
								tm && clearTimeout(tm); 
							});
							
						tm = setTimeout(function() {
							fm.notify({type : 'reload', cnt : 1, hideCnt : true});
							dfd.always(function() { fm.notify({type : 'reload', cnt  : -1}); });
						}, fm.notifyDelay);
					}
				}).fail(function(e) {
					var res = e.responseText;
					try {
						res = JSON.parse(res);
					} catch(e) {
						res = {};
					}
					res.error && fm.error(res.error);
				});
			},
			btn = {},
			req = function() {
				if (user.val() && pass.val()) {
					if (window.btoa) {
						aopt['headers']['Authorization'] = 'Basic ' + btoa(unescape(encodeURIComponent(user.val()+':'+pass.val())));
					} else {
						aopt['username'] = user.val();
						aopt['password'] = pass.val();
					}
				}
				getAjax(aopt).done(function() {
					dfd.resolve();
				}).fail(function(e) {
					dfd.reject();
				}).always(function() {
					dialog.elfinderdialog('destroy');
				});
			},
			dfd, dialog, user, pass, form;
		if (dologin) {
			dfd = $.Deferred();
			user = $('<input class="elfinder-tabstop" type="text" placeholder="demouser">');
			pass = $('<input class="elfinder-tabstop" type="password" placeholder="demouser">');
			form = $('<form style="text-align:center;">').append($('<p>').append('Username: ', user), $('<p>').append('Password: ', pass))
				.on('keyup keydown keypress', function(e) {
					e.key !== 'Escape' && e.key !== 'Tab' && e.stopPropagation();
					if (e.type === 'keypress' && e.key === 'Enter') {
						if (user.val() !== '' && pass.val() !== '') {
							req();
						} else {
							(user.val()? pass : user).focus();
						}
					}
				});
			btn[fm.i18n('cmdlogin')] = req;
			btn[fm.i18n('btnCancel')] = function() {
				dialog.elfinderdialog('destroy');
			};
			dialog = fm.dialog(form, {
				title: fm.i18n('cmdlogin'),
				buttons: btn,
				allowMinimize: false,
				destroyOnClose: true,
				open: function() {
					user.focus();
				},
				close: function() {
					(dfd.state() !== 'resolved') && dfd.reject();
				}
			});
			return dfd;
		} else {
			return getAjax(aopt);
		}
	};
}
elFinder.prototype._options.commands.push('login');
elFinder.prototype._options.uiOptions.toolbar.push(['login']);
elFinder.prototype.i18.en.messages.cmdlogin = 'Login';
elFinder.prototype.i18.en.messages.logout = '$1: Logout';

} catch(e) {}
}));
