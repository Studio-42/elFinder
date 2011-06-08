"use strict"
/**
 * @class  elFinder command "quicklook"
 * Fast preview for some files types
 *
 * @author Dmitry (dio) Levashov
 **/
elFinder.prototype.commands.quicklook = function() {
	var self = this,
		fm = self.fm,
		listeners = [],
		// preview = $('<div class="ui-corner-all elfinder-quicklook-preview"/>'),
		// info = $('<div class="elfinder-quicklook-info"/>'),
		// win = $('<div class="ui-reset ui-corner-all elfinder-quicklook"/>')
		// 	.append(preview)
		// 	.append(info)
		// 	.change(function(e, state) {
		// 		fm.log(arguments)
		// 		win.data('state', state)
		// 	}),
		parent, wz,
		cwd, deltaw, deltah
		;
	
	this.title = 'Preview';
	this.alwaysEnabled = true;
	
	/**
	 * Command options
	 *
	 * @type  Object
	 */
	this.options = {
		ui     : 'button', 
		width  : 450,
		height : 300
	};
	
	this.handlers = {
		select   : function() { this.update(); }
	}
	this.shortcuts = [{
		pattern     : 'space',
		description : 'Preview'
	}];
	
	this.preview = $('<div class="ui-corner-all elfinder-quicklook-preview"/>');
	
	this.info = $('<div class="elfinder-quicklook-info"/>');
	
	this.window = $('<div class="ui-reset ui-corner-all elfinder-quicklook"/>')
		.append(this.preview)
		.append(this.info)
		.data('state', 'closed')
		.change(function(e, state) {
			fm.log(arguments)
			self.window.data('state', state)
		})
	
	this.change = function() {
		var arg = arguments[0], i;
		
		if (typeof(arg) == 'function') {
			listeners.push(arg)
		} else {
			for (i = 0; i < listeners.length; i++) {
				try {
					listeners[i](arg);
				} catch (e) {
					
				}
				
			}
		}
	}
	
	
	this.init = function() {
		var o = this.options, 
			plugins = fm.commands.quicklook.plugins || [],
			i, p;
		
		fm.one('load', function() {
			parent = fm.getUI();
			cwd = fm.getUI('cwd');
			wz = cwd.parent();
			self.window.appendTo(parent)
			deltaw = (cwd.innerWidth() - cwd.width() - 2)/2;
			deltah = (cwd.innerHeight() - cwd.height() - 2)/2
			// for (i = 0; i < plugins.length; i++) {
			// 	new plugins[i](self)
			// }
		})
	}
	
	this.getstate = function() {
		return this.fm.selected().length == 1 ? 0 : -1;
	}
	
	
	// @todo node scrolltoview
	this._exec = function() {
		var self = this,
			fm = self.fm,
			opts = this.options, 
			width = opts.width,
			height = opts.height,
			dfrd = $.Deferred(),
			files = fm.selectedFiles(),
			win = self.window,
			state = self.window.data('state'),
			position = function(node) {
				return {
					top : parseInt(wz.position().top + node.position().top - deltah)+'px',
					left : parseInt(cwd.position().left + node.position().left + deltaw)+'px'
				}
			},
			file, node, npos, wpos;
			
		switch (state) {
			case 'opened':
				node = cwd.find('#'+this.file.hash)
				
				var css = position(node);
				css.width = node.width();
				css.height = node.height()
				
				win.data('state', 'animated')
					.animate(css, 'slow', function() {
						win.data('state', 'closed')
					})
				fm.log(node)
				break;
				
			case 'closed':
				if (files.length != 1) {
					return dfrd.reject()
				}

				file = files[0];
				this.file = file;
				node = cwd.find('#'+file.hash)
				fm.log(deltah)

				win.width(node.width()).height(node.height())
					.css(position(node))
					// .css({
					// 	top : parseInt(wz.position().top + node.position().top - deltah)+'px',
					// 	left : parseInt(cwd.position().left + node.position().left + deltaw)+'px'
					// })
					.zIndex(node.zIndex()+10)
					.data('state', 'animated')
					.animate({
						width : width,
						height : height,
						top : parseInt((parent.height() - height)/2),
						left : parseInt((parent.width() - width)/2)
					}, 'slow', function() {
						fm.log('ok')
						win.data('state', 'opened')
					})
					

					// .done(function() {
					// 	fm.log('ok')
					// })
				// fm.log(node.offset().top+' '+node.offset().left)
				// fm.log(node.position().top+' '+node.position().left)
				// fm.log(node.offset().top - parent.offset().top)
				break;
				
			default:
				return dfrd.reject()
		}
			
		fm.log(state)
		if (files.length != 1) {
			return dfrd.reject()
		}
		
		// fm.log(cwd)
			
		// win.trigger('change', 'test')
			
		return dfrd; 
	}

}


elFinder.prototype.commands.quicklook.plugins = {
	image : function(ql) {
		
	}
}
