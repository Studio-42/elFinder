/**
 * @class  Bind events
 * @author dio dio@std42.ru
 **/
elFinder.prototype.eventsManager = function(fm, el) {
	var self   = this;
	this.lock  = false;
	this.fm    = fm;
	this.ui    = fm.ui;
	this.tree  = fm.view.tree
	this.cwd   = fm.view.cwd;
	this.pointer = ''
	
	/**
	 * Initial events binding
	 *
	 **/
	this.init = function() {
		
		this.cwd
			.bind('click', function(e) {
				var t = $(e.target);
				if (t.hasClass('ui-selected')) {
					self.fm.unselectAll();
				} else {
					if (!t.attr('key')) {
						t = t.parent('[key]');
					}
					if (e.ctrlKey || e.metaKey) {
						self.fm.toggleSelect(t);
					} else {
						self.fm.select(t, true);
					}
				}
			})
			.bind(window.opera?'click':'contextmenu', function(e) {
				if (window.opera && !e.ctrlKey) {
					return;
				}
				var t = $(e.target);
				e.preventDefault();
				e.stopPropagation()
				if (t.hasClass('el-finder-cwd')) {
					self.fm.unselectAll();
				} else {
					self.fm.select(t.attr('key') ? t : t.parent('[key]'));
				}
				self.fm.quickLook.hide();
				self.fm.ui.showMenu(e);
			})
			.selectable({
				filter : '[key]',
				delay  : 300,
				stop : function() { self.fm.updateSelect() }
			});
			
		$(document).bind('click', function() { 
			self.fm.ui.hideMenu(); 
			$('input', self.cwd).trigger('change'); 
		});

		/* click on tree or places */
		$('#'+this.fm.id+' .el-finder-nav a').live('click', function(e) {
			e.preventDefault();
			if ($(this).attr('key') != self.fm.cwd.hash) {
				$(this).trigger('select');
				self.ui.exec('open', this);
			}
		});
		
		/* click on collapsed arrow or places */
		$('#'+this.fm.id+' .el-finder-nav div.collapsed,strong').live('click', function(e) {
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
				accept    : '(div,tr)[key]',
				tolerance : 'pointer',
				over      : function() { $(this).addClass('el-finder-droppable'); },
				out       : function() { $(this).removeClass('el-finder-droppable'); },
				drop      : function(e, ui) {
					$(this).removeClass('el-finder-droppable');
					var upd = false;
					/* accept only folders with read access */
					ui.helper.children('.directory:not(.noaccess,.dropbox)').each(function() {
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
		}
		
		/* bind shortcuts */
		
		$(document).bind($.browser.mozilla || $.browser.opera ? 'keypress' : 'keydown', function(e) {
			var meta = e.ctrlKey||e.metaKey;
			if (self.lock) {
				return;
			}
			switch(e.keyCode) {
				/* arrows left/up. with Ctrl - exec "back", w/o - move selection */
				case 37:
				case 38:
					e.stopPropagation();
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
					e.stopPropagation();
					e.preventDefault();
					if (meta) {
						self.ui.execIfAllowed('open');
					} else {
						moveSelection(true, !e.shiftKey);
					}
					break;
			}
		});
		

		$(document).bind($.browser.opera ? 'keypress' : 'keydown', function(e) {
			if (self.lock) {
				return;
			}
			switch(e.keyCode) {
				/* Space - QuickLook */
				case 32:
					e.preventDefault();
					e.stopPropagation();
					self.fm.quickLook.toggle();
					break;
				/* Esc */	
				case 27:
					self.fm.quickLook.hide();
					break;
			}
		});
		
		if (!this.fm.options.disableShortcuts) {
			$(document).bind('keydown', function(e) {
				var meta = e.ctrlKey||e.metaKey;

				if (self.lock) {
					return;
				}

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
					/* Delete */
					case 46:
						self.ui.execIfAllowed('rm');
						break;
					/* Ctrl+A */
					case 65:
						if (meta) {
							e.preventDefault();
							e.stopPropagation();
							self.fm.selectAll();
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
					/* Ctrl+N - new folder */
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
		/* bind shortcuts */
	}
	
	/**
	 * Update navigation droppable/draggable
	 *
	 **/
	this.updateNav = function() {
		$('a:not(.noaccess,.readonly)', this.tree).droppable({
			tolerance : 'pointer',
			accept : '(div,tr)[key]',
			over   : function() { $(this).addClass('el-finder-droppable'); },
			out    : function() { $(this).removeClass('el-finder-droppable'); },
			drop   : function(e, ui) { $(this).removeClass('el-finder-droppable'); self.fm.drop(e, ui, $(this).attr('key')); }
		});
		this.fm.options.places && this.updatePlaces();
	}
	
	/**
	 * Update places draggable
	 *
	 **/
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
		// this.fm.startBench()
		
		$('[key]', this.cwd)
			.bind('dblclick', function(e) {
				self.fm.select($(this), true);
				self.ui.exec(self.ui.isCmdAllowed('select') ? 'select' : 'open');
			})
			.draggable({
				delay      : 2,
				addClasses : false,
				revert     : true,
				drag       : function(e, ui) {
					ui.helper.toggleClass('el-finder-drag-copy', e.shiftKey);
				},
				helper     : function() {
					var t = $(this),
						h = $('<div class="el-finder-drag-helper"/>'),
						c = 0;
					if (!t.hasClass('ui-selected')) {
						self.fm.select(t, true);
					}
					self.cwd.find('.ui-selected').each(function(i) {
						var el = self.fm.options.view == 'icons' ? $(this).clone().removeClass('ui-selected') : self.fm.view.renderIcon(self.fm.cdc[$(this).attr('key')])
						if (c++ == 0 || c%13 == 0) {
							el.css('margin-left', 0);
						}
						h.append(el);
					});
					return h.css('width', (c<=12 ? 85+(c-1)*27 : 387)+'px');
				}
			})
			.filter('.directory')
			.droppable({
				tolerance : 'pointer',
				accept    : '(div,tr)[key]',
				over      : function() { $(this).addClass('el-finder-droppable');  },
				out       : function() { $(this).removeClass('el-finder-droppable'); },
				drop      : function(e, ui) { $(this).removeClass('el-finder-droppable'); self.fm.drop(e, ui, $(this).attr('key')); }
			});
			
		// self.fm.log('updateCwd: '+self.fm.stopBench())
	}
	
	/**
	 * Move selection in current dir 
	 *
	 * @param Boolean  move forward?
	 * @param Boolean  clear current selection?
	 **/
	function moveSelection(forward, reset) {
		var p, _p, cur//, l = $('.ui-selected', self.cwd).length;
		
		if (!$('[key]', self.cwd).length) {
			return;
		}
		
		if (self.fm.selected.length == 0) {
			p = $('[key]:'+(forward ? 'first' : 'last'), self.cwd);
			self.fm.select(p);
		} else if (reset) {
			p  = $('.ui-selected:'+(forward ? 'last' : 'first'), self.cwd);
			_p = p[forward ? 'next' : 'prev']('[key]');
			if (_p.length) {
				p = _p;
			}
			self.fm.select(p, true);
		} else {
			if (self.pointer) {
				cur = $('[key="'+self.pointer+'"].ui-selected', self.cwd);
			}
			if (!cur || !cur.length) {
				cur = $('.ui-selected:'+(forward ? 'last' : 'first'), self.cwd);
			}
			p = cur[forward ? 'next' : 'prev']('[key]');

			if (!p.length) {
				p = cur;
			} else {
				if (!p.hasClass('ui-selected')) {
					self.fm.select(p);
				} else {
					if (!cur.hasClass('ui-selected')) {
						self.fm.unselect(p);
					} else {
						_p = cur[forward ? 'prev' : 'next']('[key]')
						if (!_p.length || !_p.hasClass('ui-selected')) {
							self.fm.unselect(cur);
						} else {
							while ((_p = forward ? p.next('[key]') : p.prev('[key]')) && p.hasClass('ui-selected')) {
								p = _p;
							}
							self.fm.select(p);
						}
					}
				}
			} 
		}
		self.pointer = p.attr('key');
		self.fm.checkSelectedPos(forward);
	}
	
}