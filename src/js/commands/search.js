/**
 * @class  elFinder command "back"
 * Open last visited folder
 *
 * @author Dmitry (dio) Levashov
 **/
elFinder.prototype.commands.search = function() {
	var self = this,
		fm = self.fm,
		close = $('<span class="elfinder-cwd-search-close ui-icon ui-icon-close" title="'+fm.i18n('Close')+'"/>')
			.mousedown(function() {
				self._exec()
				fm.log('wtf')
			}),
		input = $('<input type="text" size="42" class="ui-corner-all"/>')
			.bind('keydown keypress', function(e) {
				if (!(e.keyCode == 70 && (e.ctrlKey || e.metaKey))) {
					e.stopPropagation();
					e.stopImmediatePropagation();
				} 
				if (e.type == 'keydown') {
					e.keyCode == 27 && self._exec();
					e.keyCode == 13 && search();
				}
			}),
		button = $('<a href="#" class="ui-state-default elfinder-cwd-search-button ui-corner-all"><span class="ui-icon ui-icon-search"/></a>')
			.hover(function() {
				button.toggleClass('ui-state-hover')
			})
			.click(function(e) {
				e.preventDefault();
				search();
			}),
		// wrap = $('<div class="elfinder-cwd-search-wrapper"/>').append(fm.i18n('Find files')).append(input),
		node = $('<div class="ui-widget ui-state-default elfinder-cwd-search ui-corner-all"></div>')
			.append($('<div class="elfinder-cwd-search-wrapper"/>').append(fm.i18n('Find files')).append(input))
			.append(button)
			.append(close)
			.append('<div class="ui-helper-clearfix"/>'),
		search = function() {
			var q = $.trim(input.val())
			fm.log(q)
			input.attr('disabled', 'on')
			
			jqxhr = fm.ajax({
				data : {cmd : 'search', q : q},
				notify : {type : 'seach', cnt : 1, hideCnt : true}
			})
			.done(function(data) {
				fm.log(data)
			})
			.always(function() {
				input.removeAttr('disabled').focus();
			})
			
		},
		cwd, jqxhr;
	
	
	this.title = 'Find files';
	this.alwaysEnabled = true;
	
	this.handlers = {
		select : function() { input.blur() }
	}
	
	this.shortcuts = [{
		pattern     : 'ctrl+f',
		description : 'Find files'
	}];
	
	this.init = function() {

		fm.one('load', function() {
			cwd = fm.getUI('cwd')
			cwd.append(node.hide())
		})
	}
	
	this.getstate = function() {
		return this.fm.newAPI ? 0 : -1;

	}
	
	this._exec = function() {
		node.slideToggle('fast', function() {
			if (node.is(':visible')) {
				input.focus();
			} else {
				input.val('');
				fm.trigger('searchend')
			}
		});
		return $.Deferred().resolve();
	}

}