/**
 * @class  elFinder command "back"
 * Open last visited folder
 *
 * @author Dmitry (dio) Levashov
 **/
elFinder.prototype.commands.search = function() {
	var self  = this,
		fm    = self.fm,
		// flag - we not search already, so no searchend event on close panel
		found = false,
		title = fm.i18n('Find files'),
		// search input field
		input = $('<input type="text" size="42" class="ui-corner-all"/>')
			.bind('keydown keypress', function(e) {
				if (!(e.keyCode == 70 && (e.ctrlKey || e.metaKey))) {
					e.stopPropagation();
					e.stopImmediatePropagation();
				} 
				if (e.type == 'keydown') {
					e.keyCode == 27 && self.close();
					if (e.keyCode == 13) {
						input.attr('disabled')
						self._exec($.trim(input.val())).always(function() {
							input.removeAttr('disabled').focus();
						});
					}
				}
			}),
		// search panel under cwd
		node = $('<div class="elfinder-search"><span class="ui-priority-secondary">'+title+'</span></div>')
			.append(input)
			.append(
				$('<button class="ui-button ui-button-icon-only ui-state-default ui-corner-all"><span class="ui-icon ui-icon-search"/><span class="ui-button-text">f</span></button>')
					.hover(function() { $(this).toggleClass('ui-state-hover'); })
					.click(function(e) {
						e.preventDefault();
						search();
					})
			)
			.append(
				$('<span class="ui-button ui-button-icon-only ui-state-default elfinder-search-close"><span class=" ui-icon ui-icon-close" title="'+fm.i18n('Close')+'"/><span class="ui-button-text">f</span></span>')
					.mousedown(function() { self.close() })
					.hover(function() { $(this).toggleClass('ui-state-hover') })
			)
			.elfinderpanel(fm).hide(),
		// main elFinder node
		parent;
	
	this.title = title;
	this.alwaysEnabled = true;
	
	this.handlers = {
		select : function() { input.blur(); }
	}
	
	this.shortcuts = [{
		pattern     : 'ctrl+f',
		description : title
	}];
	
	/**
	 * Additional command initialization.
	 * Attach node and add open/reload handlers
	 *
	 * @return void
	 **/
	this.init = function() {
		fm.one('load', function() {
			parent = fm.getUI();
			node.insertBefore(fm.getUI('cwd'));
		})
		.bind('open reload', function() {
			self.close(true);
		});
	}
	
	/**
	 * Return command status.
	 * Search does not support old api.
	 *
	 * @return Number
	 **/
	this.getstate = function() {
		return this.fm.newAPI ? node.is(':hidden') ? 0 : 1 : -1;
	}
	
	/**
	 * open panel if not
	 *
	 * @return void
	 **/
	this.open = function() {
		node.is(':hidden') && node.slideDown('fast', function() {
			parent.trigger('resize');
			input.focus();
			self.update();
		});
	}
	
	/**
	 * close panel if opened and fire "searchend" event
	 *
	 * @param  Boolean  close without animation
	 * @return void
	 **/
	this.close = function(force) {
		var onclose = function() {
			input.val('');
			parent.trigger('resize')
			found && fm.trigger('searchend');
			found = false;
			self.update();
		}
		
		if (node.is(':visible:not(:animated)')) {
			force ? node.hide(1, onclose) : node.slideUp('fast', onclose);
		}
	}
	
	/**
	 * Without argument - open/close search panel.
	 * With argument - send rearch request to backend.
	 *
	 * @param  String  search string
	 * @return $.Deferred
	 **/
	this._exec = function(q) {
		if (!q) {
			node.is(':hidden') ? self.open() : self.close();
			return $.Deferred().reject();
		}
		
		return fm.ajax({
			data   : {cmd : 'search', q : q},
			notify : {type : 'seach', cnt : 1, hideCnt : true}
		})
		.done(function() {
			found = true;
		})
	}

}