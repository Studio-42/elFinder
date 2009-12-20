elFinder.prototype.eventsManager = function(fm, el) {
	var self    = this;
	this.fm     = fm;
	this.ui    = fm.ui;
	this.cwd   = fm.view.cwd;
	
	this.init = function() {
		this.cwd.bind('click', function(e) {
			self.fm.ui.hideMenu();
			select(e, true);
		}).bind(window.opera?'click':'contextmenu', function(e) {
				e.preventDefault();
				select(e);
				self.fm.ui.showMenu(e);
		}).selectable({
			filter : '[key]',
			delay  : 1,
			start  : function() { self.fm.ui.hideMenu(); },
			stop   : function() { self.fm.updateSelected(); }
		}).find('[key]').live('dblclick', function(e) {
			/* if editorCallback is set, dblclick on file call select command */
			self.ui.exec(self.ui.isCmdAllowed('select') ? 'select' : 'open');
		});
		
		if (this.fm.view.plc) {
			this.fm.view.plc.find('div.dir-collapsed,strong').live('click', function() {
				var t = this.nodeName == 'DIV' ? $(this) : $(this).prev();
				t.toggleClass('dir-expanded').next().next().toggle(300);
			})
			.end()
			.find('a').live('click', function(e) {
				e.preventDefault();
				self.ui.exec('open', $(this).attr('key'));
			})
			.end()
			.droppable({
				accept    : 'div',
				tolerance : 'pointer',
				over      : function() { $(this).addClass('hover'); },
				out       : function() { $(this).removeClass('hover'); },
				drop      : function(e, ui) {
					$(this).removeClass('hover');
					var upd = false;
					/* accept only folders with read access */
					ui.helper.children('div.el-finder-cwd').children('div.directory:not(.noaccess,.dropbox)').each(function() {
						if (self.fm.addPlace($(this).attr('key'))) {
							upd = true;
							$(this).hide();
						}
						/* update places id's and view */
						if (upd) {
							self.fm.view.renderPlaces();
							self.updatePlaces();
						}
						/* hide helper if empty */
						if (!ui.helper.children('div.el-finder-cwd').children('div:visible').length) {
							ui.helper.hide();
						}
					})
				}
			});
		}
		
		
		/* bind shortcuts */
		$(document).bind('keydown', function(e) {
			if (!self.keydown) {
				// return;
			}
			// self.log(e.keyCode);
			var meta = e.ctrlKey||e.metaKey;
			switch (e.keyCode) {
				/* command+backspace - delete */
				case 8:
					if (meta && self.ui.isCmdAllowed('rm')) {
						e.preventDefault();
						self.ui.exec('rm');
					} 
					break;
				/* Enter - exec "select" command if enabled, otherwise exec "open" */	
				case 13:
					if (self.ui.isCmdAllowed('select')) {
						return self.ui.exec('select');
					}
					self.ui.execIfAllowed('open');
					break;
				/* Esc */
				case 27:
					self.fm.quickLook.hide()
					break;
				case 32:
					if (self.fm.selected.length == 1) {
						e.preventDefault();
						self.fm.quickLook.toggle();
					}
					break;
					
				/* arrows left/up. with Ctrl - exec "back", w/o - move selection */
				case 37:
				case 38:
					if (e.keyCode == 37 && meta) {
						return self.ui.execIfAllowed('back');
					}
					if (!self.fm.selected.length) {
						self.cwd.find('[key]:last').addClass('ui-selected');
					} else {
						var el = self.cwd.find('[key="'+self.fm.selected[0]+'"]:first'),
							p  = el.prev();
						if (!e.shiftKey) {
							self.fm.unselectAll();
						}
						if (p.length) {
							p.addClass('ui-selected');
						} else {
							el.addClass('ui-selected');
						}
					}
					self.fm.updateSelected();
					self.fm.checkSelectedPos();
					break;
				/* arrows right/down. with Ctrl - exec "open", w/o - move selection  */
				case 39:
				case 40:
					if (meta) {
						return self.ui.execIfAllowed('open');
					}
					if (!self.fm.selected.length) {
						self.cwd.find('[key]:first').addClass('ui-selected');
					} else {
						var el = self.cwd.find('[key="'+self.fm.selected[self.fm.selected.length-1]+'"]:last'),
							n  = el.next();
						if (!e.shiftKey) {
							self.fm.unselectAll();
						}
						if (n.length) {
							n.addClass('ui-selected');
						} else {
							el.addClass('ui-selected');
						}
					}
					self.fm.updateSelected();
					self.fm.checkSelectedPos(true);
					break;
				/* Delete */
				case 46:
					self.ui.execIfAllowed('rm');
					break;
				/* Ctrl+A */
				case 65:
					if (meta) {
						e.preventDefault();
						self.cwd.find('[key]').addClass('ui-selected');
						self.fm.updateSelected();
					}
					break;
				/* Ctrl+C */
				case 67:
					meta && self.ui.execIfAllowed('copy');
					break;
				/* Ctrl+I - get info */	
				case 73:
					if (meta) {
						e.preventDefault();
						e.stopPropagation();
						self.ui.exec('info');
					}
					break;
				case 78:
					if (meta) {
						e.preventDefault();
						self.ui.execIfAllowed('mkdir');
					}
					break;
				/* Ctrl+U - upload files */
				case 85:
					if (meta) {
						e.preventDefault();
						self.ui.execIfAllowed('upload');
					}
					break;
				/* Ctrl+V */
				case 86:
					meta && self.ui.execIfAllowed('paste');
					break;
				/* Ctrl+X */
				case 88:
					meta && self.ui.execIfAllowed('cut');
					break;
			}
			
		});
		
		
	}
	
	/**
	 * Update navigation events
	 *
	 **/
	this.updateNav = function() {
		this.fm.view.tree
			.find('li>ul').each(function(i) {
				var ul = $(this);
				i>0 && ul.hide();
				ul.parent().children('div').click(function() {
					$(this).toggleClass('dir-expanded');
					ul.toggle(300);
				});
			})
			.end().end()
			.find('a')
				.bind('click', function(e) {
					e.preventDefault();
					var t  = $(this), 
						id = t.attr('key'); 
					if (id != self.fm.cwd.hash && !t.hasClass('noaccess') && !t.hasClass('dropbox')) {
						t.trigger('select');
						self.ui.exec('open', id);
					}
				})
				.bind('select', function() {
					self.fm.view.tree.find('a').removeClass('selected');
					$(this).addClass('selected').parents('li:has(ul)').children('ul').show().end().children('div').addClass('dir-expanded');
				})
				.not('.noaccess,.readonly')
				.droppable({
					over : function() { $(this).addClass('el-finder-droppable'); },
					out  : function() { $(this).removeClass('el-finder-droppable'); },
					drop : function(e, ui) { $(this).removeClass('el-finder-droppable'); self.fm.drop(e, ui, $(this).attr('key')); }
				})
				
	}
	
	/**
	 * Update places draggable
	 *
	 **/
	this.updatePlaces = function() {
		this.fm.view.plc.find('li>ul>li').draggable({
			scroll : false,
			stop : function() {
				if (self.fm.removePlace($(this).children('a').attr('key'))) {
					$(this).remove();
					self.fm.view.renderPlaces();
					self.updatePlaces();
				}
			}
		});
	}
	
	/**
	 * Select/unselect files
	 *
	 * @param Events   click/right click event
	 * @param Boolean  is it right click?
	 **/
	function select(e, click) {
		if (e.target == self.cwd.get(0)) {
			/* click on empty space */
			self.fm.unselectAll() ;
		} else {
			/* click on folder/file */
			click && !e.ctrlKey && !e.metaKey && self.fm.unselectAll();
			var t = $(e.target);
			(t.attr('key') ? t : t.parents('[key]').eq(0)).addClass('ui-selected');
		}
		/* if any element editing */
		self.cwd.find('input').trigger('blur');
		self.fm.updateSelected();
	}
	
}