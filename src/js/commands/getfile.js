/**
 * @class elFinder command "getfile". 
 * Return selected files info into outer callback.
 * For use elFinder with wysiwyg editors etc.
 *
 * @author Dmitry (dio) Levashov, dio@std42.ru
 **/
elFinder.prototype.commands.getfile = function() {
	
	var self   = this,
		fm     = this.fm,
		filter = function() {
			var o = self.options,
				files = [];

			$.each(fm.selectedFiles(), function(h, file) {
				if (file.mime != 'directory' || o.folders) {
					files.push(file);
				}
			});
			
			return o.multiple || files.length == 1 ? files : [];
		},
		callback = function(e) {
			if (self.getstate() > -1) {
				e.preventDefault();
				self.exec();
			} else {
				self.fm.exec('open');
			}
		};
	
	this.title = 'Select files';
	
	this.alwaysEnabled = true;
	
	this.callback = typeof this.fm.options.getFileCallback == 'function' 
		? this.fm.options.getFileCallback
		: false;
	
	this.handlers = {
		select : function() { this.update(); }
	}
	
	this.init = function() {
		var self       = this,
			fm         = this.fm,
			o          = fm.options,
			name       = 'getfile',
			dblclick   = o.dblclick   == name,
			enter      = o.enter      == name,
			shiftenter = o.shiftenter == name;

		fm.one('load', function() {
			dblclick && fm.bind('dblclick', callback);
			
			enter && fm.shortcut({
				pattern     : 'enter',
				description : self.title,
				callback    : callback
			});
			
			shiftenter && fm.shortcut({
				pattern     : 'shift+enter',
				description : self.title,
				callback    : callback
			});
		})
	}
	
	this.getstate = function() {
		return this.callback && filter().length ? 0 : -1;
	}
	
	this._exec = function() {
		var fm    = this.fm,
			files = filter();
			
		$.each(files, function(i, file) {
			file.baseUrl = fm.option('url');
			file.url     = fm.url(file.hash);
			file.path    = fm.path(file.hash);
		});

		this.callback(files, fm);
		fm.trigger('getfile', {files : files});
		return $.Deferred().resolve();
	}

}