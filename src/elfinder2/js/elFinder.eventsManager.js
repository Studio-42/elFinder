elFinder.prototype.eventsManager = function(fm, el) {
	var self   = this;
	this.lock  = false;
	this.fm    = fm;
	this.ui    = fm.ui;
	this.tree  = fm.view.tree
	this.cwd   = fm.view.cwd;
	
	this.init = function() {

		/* click on current dir */
		this.cwd.bind('click', function(e) {
			self.fm.ui.hideMenu();
			select(e, true);
		}) 
		.bind(window.opera?'click':'contextmenu', function(e) {
				e.preventDefault();
				select(e);
				self.fm.ui.showMenu(e);
		})
		.selectable({
			filter : '[key]',
			delay  : 1,
			start  : function() { self.fm.ui.hideMenu(); },
			stop   : function() { self.fm.updateSelected(); }
		})
		.find('[key]')
		.live('dblclick', function(e) {
			/* if editorCallback is set, dblclick on file call select command */
			self.ui.exec(self.ui.isCmdAllowed('select') ? 'select' : 'open');
		});
		
		/* click on tree or places */
		this.fm.view.nav.find('a').live('click', function(e) {
			e.preventDefault();
			if ($(this).attr('key') != self.fm.cwd.hash) {
				self.ui.exec('open', this);
			}
		});
		/* click on collapsed arrow or places */
		$('div.collapsed,strong', this.fm.view.nav).live('click', function(e) {
			var t = $(this), div, ul;
			if (this.nodeName == 'DIV') {
				div = t;
				ul  = div.next().next('ul');
			} else {
				div = t.prev('div.collapsed');
				ul  = t.next('ul');
			}
			div.toggleClass('expanded');
			ul.toggle(300)
		});
		/* open parents dir in tree */
		this.tree.bind('select', function(e) {
			self.tree.find('a').removeClass('selected');
			$(e.target).addClass('selected').prev('div').addClass('expanded').parents('li:has(ul)').children('div').addClass('expanded').next().next('ul').show();
		});
		/* make places droppable */
		if (this.fm.options.places) {
			this.fm.view.plc.droppable({
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
					});
					/* update places id's and view */
					if (upd) {
						self.fm.view.renderPlaces();
						self.updatePlaces();
						self.fm.view.plc.children('li').children('div').trigger('click');
					}
					/* hide helper if empty */
					if (!ui.helper.children('div.el-finder-cwd').children('div:visible').length) {
						ui.helper.hide();
					}
				}
			});
			// this.updatePlaces();
		}
		
		/* bind shortcuts */
		$(document).bind('keydown', function(e) {
			if (self.lock) {
				return;
			}
			
			var meta = e.ctrlKey||e.metaKey;
			// self.fm.log(e.keyCode+' '+meta);
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
					e.preventDefault();
					if (e.keyCode == 37 && meta) {
						self.ui.execIfAllowed('back');
					} else {
						moveSelection(false, !e.shiftKey);
					}
					break;
				/* arrows right/down. with Ctrl - exec "open", w/o - move selection  */
				case 39:
				case 40:
					e.preventDefault();
					if (meta) {
						self.ui.execIfAllowed('open');
					} else {
						moveSelection(true, !e.shiftKey);
					}
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
	 * Update navigation droppable/draggable
	 *
	 **/
	this.updateNav = function() {

		this.tree.find('a:not(.noaccess,.readonly)').droppable({
			tolerance : 'pointer',
			accept : 'div',
			over   : function() { $(this).addClass('el-finder-droppable'); },
			out    : function() { $(this).removeClass('el-finder-droppable'); },
			drop   : function(e, ui) { $(this).removeClass('el-finder-droppable'); self.fm.drop(e, ui, $(this).attr('key')); }
		});
		this.fm.options.places && this.updatePlaces();
	}
	
	this.updatePlaces = function() {
		this.fm.view.plc.find('ul>li').draggable({
			scroll : false,
			stop   : function() {
				if (self.fm.removePlace($(this).children('a').attr('key'))) {
					$(this).remove();
					if (!self.fm.view.plc.children('li').children('ul').children('li').length) {
						self.fm.view.plc.children('li').children('div').removeClass('collapsed expanded').next().next('ul').hide();
					}
				}
			}
		});
	}
	
	/**
	 * Update folders droppable & files/folders draggable
	 **/
	this.updateCwd = function() {
		this.cwd.find('(div,tr)[key]')
			.draggable({
				drag : function(e, ui) {
					if (e.shiftKey) {
						ui.helper.addClass('el-finder-drag-copy');
					} else {
						ui.helper.removeClass('el-finder-drag-copy');
					}
				},
				addClasses : false,
				revert     : true,
				helper     : function() {
					var h = $('<div/>').addClass('el-finder-cwd')
					self.cwd.find('.ui-selected').each(function(i) {
						h.append(self.fm.options.view == 'icons' ? $(this).clone().removeClass('ui-selected') : self.view.renderIcon(self.cdc[$(this).attr('key')]));
					})
					return $('<div/>').addClass('el-finder-drag-helper').append(h);
				}
			})
			.draggable('disable').removeClass('ui-state-disabled')
			.filter('.directory:not(.noaccess:has(em[class="readonly"],em[class=""]))')
			.droppable({
				tolerance : 'pointer',
				accept    : 'div',
				over      : function() { $(this).addClass('el-finder-droppable'); },
				out       : function() { $(this).removeClass('el-finder-droppable'); },
				drop      : function(e, ui) { $(this).removeClass('el-finder-droppable'); self.fm.drop(e, ui, $(this).attr('key')); }
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
	
	/**
	 * Move selection in current dir 
	 *
	 * @param Boolean  move forward?
	 * @param Boolean  clear current selection?
	 **/
	function moveSelection(forward, reset) {
		if (!self.fm.selected.length) {
			self.cwd.find('[key]:'+(forward?'first':'last')).addClass('ui-selected');
		} else {
			var el = self.cwd.find('[key="'+self.fm.selected[forward?self.fm.selected.length-1:0]+'"]:'+(forward?'last':'first')),
				n  = forward ? el.next() : el.prev();
			reset && self.fm.unselectAll();
			(n.length?n:el).addClass('ui-selected');
		}
		self.fm.updateSelected();
		self.fm.checkSelectedPos(forward);
	}
	
}