/**
 * @class  Bind/update events
 * @author dio dio@std42.ru
 **/
(function($) {
elFinder.prototype.eventsManager = function(fm, el) {
	var self   = this;
	this.lock  = false;
	this.fm    = fm;
	this.ui    = fm.ui;
	this.tree  = fm.view.tree
	this.cwd   = fm.view.cwd;
	this.pointer = '';

	/**
	 * Initial events binding
	 *
	 **/
	this.init = function() {
		var self = this, ignore = false;
		
		self.lock = false;
		
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
				e.preventDefault();
				e.stopPropagation();

				var t = $(e.target);
				if ($.browser.mozilla) {
					ignore = true;
				}
				

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
				stop   : function() { self.fm.updateSelect(); self.fm.log('mouseup') }
			});
			
		$(document).bind('click', function(e) { 
			!ignore && self.fm.ui.hideMenu(); 
			ignore = false
			$('input', self.cwd).trigger('change'); 

			if (!$(e.target).is('input,textarea,select')) {
				$('input,textarea').blur();
			}
		});

		$('input,textarea').live('focus', function(e) {
			self.lock = true;
		}).live('blur', function(e) {
			self.lock = false;
		});

		/* open parents dir in tree */
		this.tree.bind('select', function(e) {
			self.tree.find('a').removeClass('selected');
			$(e.target).addClass('selected').parents('li:has(ul)').children('ul').show().prev().children('div').addClass('expanded');
		});
		
		/* make places droppable */
		if (this.fm.options.places) {

			this.fm.view.plc.click(function(e) {
				e.preventDefault();
				var t = $(e.target),
					h = t.attr('key'), ul;
				
				if (h) {
					h != self.fm.cwd.hash && self.ui.exec('open', e.target)
				} else if (e.target.nodeName == 'A' || e.target.nodeName == 'DIV') {
					ul = self.fm.view.plc.find('ul');
					if (ul.children().length) {
						ul.toggle(300);
						self.fm.view.plc.children('li').find('div').toggleClass('expanded');
					}
				}
			});
			
			this.fm.view.plc.droppable({
				accept    : '(div,tr).directory',
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
					if (!ui.helper.children('div:visible').length) {
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
					/* Meta+Backspace - delete */
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
						
					case 113:
						self.ui.execIfAllowed('rename');
						break;
						
				}

			});
			
		}
		
	}
	
	/**
	 * Update navigation droppable/draggable
	 *
	 **/
	this.updateNav = function() {
		$('a', this.tree).click(function(e) {
			e.preventDefault();
			var t = $(this), c;
			if (e.target.nodeName == 'DIV' && $(e.target).hasClass('collapsed')) {
				$(e.target).toggleClass('expanded').parent().next('ul').toggle(300);
			} else if (t.attr('key') != self.fm.cwd.hash) {
				if (t.hasClass('noaccess') || t.hasClass('dropbox')) {
					self.fm.view.error('Access denied');
				} else {
					self.ui.exec('open', t.trigger('select')[0]);
				}
			} else {
				c = t.children('.collapsed');
				if (c.length) {
					c.toggleClass('expanded');
					t.next('ul').toggle(300);
				}
			}
		});
		
		$('a:not(.noaccess,.readonly)', this.tree).droppable({
			tolerance : 'pointer',
			accept : 'div[key],tr[key]',
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
		this.fm.view.plc.children('li').find('li').draggable({
			scroll : false,
			stop   : function() {
				if (self.fm.removePlace($(this).children('a').attr('key'))) {
					$(this).remove();
					if (!$('li', self.fm.view.plc.children('li')).length) {
						self.fm.view.plc.children('li').find('div').removeClass('collapsed expanded').end().children('ul').hide();
					}
				}
			}
		});
	}
	
	/**
	 * Update folders droppable & files/folders draggable
	 **/
	this.updateCwd = function() {
		
		$('[key]', this.cwd)
			.bind('dblclick', function(e) {
				self.fm.select($(this), true);
				self.ui.exec(self.ui.isCmdAllowed('select') ? 'select' : 'open');
			})
			.draggable({
				delay      : 3,
				addClasses : false,
				appendTo : '.el-finder-cwd',
				revert     : true,
				drag       : function(e, ui) {
					ui.helper.toggleClass('el-finder-drag-copy', e.shiftKey||e.ctrlKey);
				},
				helper     : function() {
					var t = $(this),
						h = $('<div class="el-finder-drag-helper"/>'),
						c = 0;
					!t.hasClass('ui-selected') && self.fm.select(t, true);

					self.cwd.find('.ui-selected').each(function(i) {
						var el = self.fm.options.view == 'icons' ? $(this).clone().removeClass('ui-selected') : $(self.fm.view.renderIcon(self.fm.cdc[$(this).attr('key')]))
						if (c++ == 0 || c%12 == 0) {
							el.css('margin-left', 0);
						}
						h.append(el);
					});
					return h.css('width', (c<=12 ? 85+(c-1)*29 : 387)+'px');
				}
			})
			.filter('.directory')
			.droppable({
				tolerance : 'pointer',
				accept    : 'div[key],tr[key]',
				over      : function() { $(this).addClass('el-finder-droppable');  },
				out       : function() { $(this).removeClass('el-finder-droppable'); },
				drop      : function(e, ui) { $(this).removeClass('el-finder-droppable'); self.fm.drop(e, ui, $(this).attr('key')); }
			});
			
		if ($.browser.msie) {
			$('*', this.cwd).attr('unselectable', 'on')
				.filter('[key]')
					.bind('dragstart', function() { self.cwd.selectable('disable').removeClass('ui-state-disabled ui-selectable-disabled'); })
					.bind('dragstop', function() { self.cwd.selectable('enable'); });
		}

	}
	
	/**
	 * Move selection in current dir 
	 *
	 * @param Boolean  move forward?
	 * @param Boolean  clear current selection?
	 **/
	function moveSelection(forward, reset) {
		var p, _p, cur;
		
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

})(jQuery);