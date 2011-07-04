"use strict";

window.elFinderSupportVer1 = function() {
	var self = this;
	
	this.init = function(fm) {
		this.fm = fm;
	}
	
	
	this.send = function(opts) {
		var self = this,
			fm = this.fm,
			dfrd = $.Deferred(),
			cmd = opts.data.cmd,
			files = [],
			data,
			xhr;
			
		dfrd.abort = function() {
			!xhr.isRejected() && !xhr.isResolved() && xhr.abort();
		}
		
		switch (cmd) {
			case 'open':
				opts.data.tree = 1;
				break;
			case 'get':
				opts.data.cmd = 'read';
				opts.data.current = fm.file(opts.data.target).phash;
				break;
			case 'put':
				opts.data.cmd = 'edit';
				opts.data.current = fm.file(opts.data.target).phash;
				break;
				
		}
		// cmd = opts.data.cmd
		
		xhr = $.ajax(opts)
			.fail(function(error) {
				dfrd.reject(error)
			})
			.done(function(raw) {
				// self.fm.log(cmd)
				data = self.normalize(cmd, raw)
				
				// cmd != 'open' && self.fm.log(data)
				dfrd.resolve(data)
				
			})
			
		// this.fm.log(opts)
		return dfrd;
		
		return $.ajax(opts);
	}
	
	
	this.normalize = function(cmd, data) {
		var self = this,
			files = {}, phash;

		if ((cmd == 'tmb' || cmd == 'get') || data.error) {
			return data;
		}
		
		if (cmd == 'put') {

			phash = this.fm.file(data.target.hash).phash;
			return {changed : [this.normalizeFile(data.target, phash)]};
		}
		
		phash = data.cwd.hash;
		
		if (data.tree) {
			$.each(this.normalizeTree(data.tree), function(i, file) {
				files[file.hash] = file;
			});
		}
		
		$.each(data.cdc||[], function(i, file) {
			var hash = file.hash;

			if (files[hash]) {
				files[hash].date   = file.date;
				files[hash].locked = file.hash == phash ? true : file.rm === void(0) ? false : !file.rm;
			} else {
				files[hash] = self.normalizeFile(file, phash, data.tmb);
			}
		});
		
		if (!data.tree) {
			$.each(this.fm.files(), function(hash, file) {
				if (!files[hash] && file.phash != phash && file.mime == 'directory') {
					files[hash] = file;
				}
			});
		}
		
		if (cmd == 'open') {
			return {
					cwd     : files[phash] || this.normalizeFile(data.cwd),
					files   : $.map(files, function(f) { return f }),
					options : self.normalizeOptions(data),
					init    : !!data.params,
					debug   : data.debug
				};
		}
		
		
		
		return $.extend({
			current : data.cwd.hash,
			error   : data.error,
			warning : data.warning,
			options : {tmb : !!data.tmb}
		}, this.fm.diff($.map(files, filter)));
		
	}
	
	/**
	 * Convert old api tree into plain array of dirs
	 *
	 * @param  Object  root dir
	 * @return Array
	 */
	this.normalizeTree = function(root) {
		var self     = this,
			result   = [],
			traverse = function(dirs, phash) {
				var i, dir;
				
				for (i = 0; i < dirs.length; i++) {
					dir = dirs[i];
					result.push(self.normalizeFile(dir, phash))
					dir.dirs.length && traverse(dir.dirs, dir.hash);
				}
			};

		traverse([root]);

		return result;
	}
	
	/**
	 * Convert file info from old api format into new one
	 *
	 * @param  Object  file
	 * @param  String  parent dir hash
	 * @return Object
	 */
	this.normalizeFile = function(file, phash, tmb) {
		var mime = file.mime || 'directory',
			size = mime == 'directory' && !file.linkTo ? 0 : file.size,
			info = {
				hash   : file.hash,
				phash  : phash,
				name   : file.name,
				mime   : mime,
				date   : file.date || 'unknown',
				size   : size,
				read   : file.read,
				write  : file.write,
				locked : !phash ? true : file.rm === void(0) ? false : !file.rm
			};
		
		if (file.link) {
			info.link = file.link;
		}

		if (file.linkTo) {
			info.linkTo = file.linkTo;
		}
		
		if (file.tmb) {
			info.tmb = file.tmb;
		} else if (info.mime.indexOf('image/') === 0 && tmb) {
			info.tmb = 1;
		}
			
		if (file.dirs && file.dirs.length) {
			info.dirs = true;
		}
		if (file.dim) {
			info.dim = file.dim;
		}
		if (file.resize) {
			info.resize = file.resize;
		}
		return info;
	}
	
	this.normalizeOptions = function(data) {
		var opts = {
				path          : data.cwd.rel,
				disabled      : data.disabled || [],
				tmb           : !!data.tmb,
				copyOverwrite : true
			};
		
		if (data.params) {
			opts.api      = 1;
			opts.url      = data.params.url;
			opts.archives = data.params.archives;
			opts.extract  = data.params.extract;
		}
		
		if (opts.path.indexOf('/') !== -1) {
			opts.separator = '/';
		} else if (opts.path.indexOf('\\') !== -1) {
			opts.separator = '\\';
		}
		return opts;
	}
	
	
}
