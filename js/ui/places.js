"use strict";
/**
 * @class elFinder places/favorites ui
 *
 * @author Dmitry (dio) Levashov
 **/
$.fn.elfinderplaces = function(fm, opts) {
	return this.each(function() {
		var dirs      = {},
			c         = 'class',
			navdir    = fm.res(c, 'navdir'),
			collapsed = fm.res(c, 'navcollapse'),
			expanded  = fm.res(c, 'navexpand'),
			hover     = fm.res(c, 'hover'),
			clroot    = fm.res(c, 'treeroot'),
			dropover  = fm.res(c, 'adroppable'),
			tpl       = fm.res('tpl', 'placedir'),
			ptpl      = fm.res('tpl', 'perms'),
			spinner   = $(fm.res('tpl', 'navspinner')),
			key       = 'places'+(opts.suffix? opts.suffix : ''),
			menuTimer = null,
			/**
			 * Convert places dir node into dir hash
			 *
			 * @param  String  directory id
			 * @return String
			 **/
			id2hash   = function(id) { return id.substr(6);	},
			/**
			 * Convert places dir node into dir hash
			 *
			 * @param  String  directory id
			 * @return String
			 **/
			hash2id   = function(hash) { return 'place-'+hash; },
			
			/**
			 * Save current places state
			 *
			 * @return void
			 **/
			save      = function() {
				var hashes = [], data = {};
				
				hashes = $.map(subtree.children().find('[id]'), function(n) {
					return id2hash(n.id);
				});
				if (hashes.length) {
					$.each(hashes.reverse(), function(i, h) {
						data[h] = dirs[h];
					});
				} else {
					data = null;
				}
				
				fm.storage(key, data);
			},
			/**
			 * Return node for given dir object
			 *
			 * @param  Object  directory object
			 * @return jQuery
			 **/
			create    = function(dir, hash) {
				return $(tpl.replace(/\{id\}/, hash2id(dir? dir.hash : hash))
						.replace(/\{name\}/, fm.escape(dir? dir.i18 || dir.name : hash))
						.replace(/\{cssclass\}/, dir? (fm.perms2class(dir) + (dir.notfound? ' elfinder-na' : '') + (dir.csscls? ' '+dir.csscls : '')) : '')
						.replace(/\{permissions\}/, (dir && (!dir.read || !dir.write || dir.notfound))? ptpl : '')
						.replace(/\{title\}/, (dir && dir.path)? fm.escape(dir.path) : '')
						.replace(/\{symlink\}/, '')
						.replace(/\{style\}/, (dir && dir.icon)? fm.getIconStyle(dir) : ''));
			},
			/**
			 * Add new node into places
			 *
			 * @param  Object  directory object
			 * @return void
			 **/
			add = function(dir) {
				var node, hash;

				if (dir.mime !== 'directory') {
					return false;
				}
				hash = dir.hash;
				if (!fm.files().hasOwnProperty(hash)) {
					// update cache
					fm.trigger('tree', {tree: [dir]});
				}
				
				node = create(dir, hash);
				
				dirs[hash] = dir;
				subtree.prepend(node);
				root.addClass(collapsed);
				sortBtn.toggle(subtree.children().length > 1);
				
				return true;
			},
			/**
			 * Remove dir from places
			 *
			 * @param  String  directory hash
			 * @return String  removed name
			 **/
			remove = function(hash) {
				var name = null, tgt, cnt;

				if (dirs[hash]) {
					delete dirs[hash];
					tgt = $('#'+hash2id(hash));
					if (tgt.length) {
						name = tgt.text();
						tgt.parent().remove();
						cnt = subtree.children().length;
						sortBtn.toggle(cnt > 1);
						if (! cnt) {
							root.removeClass(collapsed);
							places.removeClass(expanded);
							subtree.slideToggle(false);
						}
					}
				}
				
				return name;
			},
			/**
			 * Move up dir on places
			 *
			 * @param  String  directory hash
			 * @return void
			 **/
			moveup = function(hash) {
				var self = $('#'+hash2id(hash)),
					tgt  = self.parent(),
					prev = tgt.prev('div'),
					cls  = 'ui-state-hover',
					ctm  = fm.getUI('contextmenu');
				
				menuTimer && clearTimeout(menuTimer);
				
				if (prev.length) {
					ctm.find(':first').data('placesHash', hash);
					self.addClass(cls);
					tgt.insertBefore(prev);
					prev = tgt.prev('div');
					menuTimer = setTimeout(function() {
						self.removeClass(cls);
						if (ctm.find(':first').data('placesHash') === hash) {
							ctm.hide().empty();
						}
					}, 1500);
				}
				
				if(!prev.length) {
					self.removeClass(cls);
					ctm.hide().empty();
				}
			},
			/**
			 * Update dir at places
			 *
			 * @param  Object   directory
			 * @param  String   previous hash
			 * @return Boolean
			 **/
			update = function(dir, preHash) {
				var hash = dir.hash,
					tgt  = $('#'+hash2id(preHash || hash)),
					node = create(dir, hash);

				if (tgt.length > 0) {
					tgt.parent().replaceWith(node);
					dirs[hash] = dir;
					return true
				} else {
					return false;
				}
			},
			/**
			 * Remove all dir from places
			 *
			 * @return void
			 **/
			clear = function() {
				subtree.empty();
				root.removeClass(collapsed);
				places.removeClass(expanded);
				subtree.slideToggle(false);
			},
			/**
			 * Sort places dirs A-Z
			 *
			 * @return void
			 **/
			sort = function() {
				$.each(dirs, function(h, f) {
					var dir = fm.file(h) || f,
						node = create(dir, h),
						ret = null;
					if (!dir) {
						node.hide();
					}
					if (subtree.children().length) {
						$.each(subtree.children(), function() {
							var current =  $(this);
							if ((dir.i18 || dir.name).localeCompare(current.children('.'+navdir).text()) < 0) {
								ret = !node.insertBefore(current);
								return ret;
							}
						});
						if (ret !== null) {
							return true;
						}
					}
					!$('#'+hash2id(h)).length && subtree.append(node);
				});
				save();
			},
			// sort button
			sortBtn = $('<span class="elfinder-button-icon elfinder-button-icon-sort elfinder-places-root-icon" title="'+fm.i18n('cmdsort')+'"/>')
				.hide()
				.on('click', function(e) {
					e.stopPropagation();
					subtree.empty();
					sort();
				}
			),
			/**
			 * Node - wrapper for places root
			 *
			 * @type jQuery
			 **/
			wrapper = create({
					hash  : 'root-'+fm.namespace, 
					name  : fm.i18n(opts.name, 'places'),
					read  : true,
					write : true
				}),
			/**
			 * Places root node
			 *
			 * @type jQuery
			 **/
			root = wrapper.children('.'+navdir)
				.addClass(clroot)
				.click(function(e) {
					e.stopPropagation();
					if (root.hasClass(collapsed)) {
						places.toggleClass(expanded);
						subtree.slideToggle();
						fm.storage('placesState', places.hasClass(expanded)? 1 : 0);
					}
				})
				.append(sortBtn),
			/**
			 * Container for dirs
			 *
			 * @type jQuery
			 **/
			subtree = wrapper.children('.'+fm.res(c, 'navsubtree')),
			
			/**
			 * Main places container
			 *
			 * @type jQuery
			 **/
			places = $(this).addClass(fm.res(c, 'tree')+' elfinder-places ui-corner-all')
				.hide()
				.append(wrapper)
				.appendTo(fm.getUI('navbar'))
				.on('mouseenter mouseleave', '.'+navdir, function(e) {
					$(this).toggleClass('ui-state-hover', (e.type == 'mouseenter'));
				})
				.on('click', '.'+navdir, function(e) {
					var p = $(this);
					if (p.data('longtap')) {
						e.stopPropagation();
						return;
					}
					! p.hasClass('elfinder-na') && fm.exec('open', p.attr('id').substr(6));
				})
				.on('contextmenu', '.'+navdir+':not(.'+clroot+')', function(e) {
					var self = $(this),
						hash = self.attr('id').substr(6);
					
					e.preventDefault();

					fm.trigger('contextmenu', {
						raw : [{
							label    : fm.i18n('moveUp'),
							icon     : 'up',
							remain   : true,
							callback : function() { moveup(hash); save(); }
						},'|',{
							label    : fm.i18n('rmFromPlaces'),
							icon     : 'rm',
							callback : function() { remove(hash); save(); }
						}],
						'x'       : e.pageX,
						'y'       : e.pageY
					});
					
					self.addClass('ui-state-hover');
					
					fm.getUI('contextmenu').children().on('mouseenter', function() {
						self.addClass('ui-state-hover');
					});
					
					fm.bind('closecontextmenu', function() {
						self.removeClass('ui-state-hover');
					});
				})
				.droppable({
					tolerance  : 'pointer',
					accept     : '.elfinder-cwd-file-wrapper,.elfinder-tree-dir,.elfinder-cwd-file',
					hoverClass : fm.res('class', 'adroppable'),
					classes    : { // Deprecated hoverClass jQueryUI>=1.12.0
						'ui-droppable-hover': fm.res('class', 'adroppable')
					},
					over       : function(e, ui) {
						var helper = ui.helper,
							dir    = $.map(helper.data('files'), function(h) { return (fm.file(h).mime === 'directory' && !dirs[h])? h : null});
						e.stopPropagation();
						helper.data('dropover', helper.data('dropover') + 1);
						if (fm.insideWorkzone(e.pageX, e.pageY)) {
							if (dir.length > 0) {
								helper.addClass('elfinder-drag-helper-plus');
								fm.trigger('unlockfiles', {files : helper.data('files'), helper: helper});
							} else {
								$(this).removeClass(dropover);
							}
						}
					},
					out : function(e, ui) {
						var helper = ui.helper,
							ctr    = (e.shiftKey||e.ctrlKey||e.metaKey);
						e.stopPropagation();
						helper.toggleClass('elfinder-drag-helper-move elfinder-drag-helper-plus', helper.data('locked')? true : ctr).data('dropover', Math.max(helper.data('dropover') - 1, 0));
						$(this).removeData('dropover')
						       .removeClass(dropover);
						fm.trigger(ctr? 'unlockfiles' : 'lockfiles', {files : helper.data('files'), helper: helper});
					},
					drop       : function(e, ui) {
						var helper  = ui.helper,
							resolve = true;
						
						$.each(helper.data('files'), function(i, hash) {
							var dir = fm.file(hash);
							
							if (dir && dir.mime == 'directory' && !dirs[dir.hash]) {
								add(dir);
							} else {
								resolve = false;
							}
						})
						save();
						resolve && helper.hide();
					}
				})
				// for touch device
				.on('touchstart', '.'+navdir+':not(.'+clroot+')', function(e) {
					if (e.originalEvent.touches.length > 1) {
						return;
					}
					var hash = $(this).attr('id').substr(6),
					p = $(this)
					.addClass(hover)
					.data('longtap', null)
					.data('tmlongtap', setTimeout(function(){
						// long tap
						p.data('longtap', true);
						fm.trigger('contextmenu', {
							raw : [{
								label    : fm.i18n('rmFromPlaces'),
								icon     : 'rm',
								callback : function() { remove(hash); save(); }
							}],
							'x'       : e.originalEvent.touches[0].pageX,
							'y'       : e.originalEvent.touches[0].pageY
						});
					}, 500));
				})
				.on('touchmove touchend', '.'+navdir+':not(.'+clroot+')', function(e) {
					clearTimeout($(this).data('tmlongtap'));
					if (e.type == 'touchmove') {
						$(this).removeClass(hover);
					}
				});

		if ($.fn.sortable) {
			subtree.addClass('touch-punch')
			.sortable({
				appendTo : fm.getUI(),
				revert   : false,
				helper   : function(e) {
					var dir = $(e.target).parent();
						
					dir.children().removeClass('ui-state-hover');
					
					return $('<div class="ui-widget elfinder-place-drag elfinder-'+fm.direction+'"/>')
							.append($('<div class="elfinder-navbar"/>').show().append(dir.clone()));

				},
				stop     : function(e, ui) {
					var target = $(ui.item[0]),
						top    = places.offset().top,
						left   = places.offset().left,
						width  = places.width(),
						height = places.height(),
						x      = e.pageX,
						y      = e.pageY;
					
					if (!(x > left && x < left+width && y > top && y < y+height)) {
						remove(id2hash(target.children(':first').attr('id')));
						save();
					}
				},
				update   : function(e, ui) {
					save();
				}
			});
		}

		// "on regist" for command exec
		$(this).on('regist', function(e, files){
			var added = false;
			$.each(files, function(i, dir) {
				if (dir && dir.mime == 'directory' && !dirs[dir.hash]) {
					if (add(dir)) {
						added = true;
					}
				}
			});
			added && save();
		});
	

		// on fm load - show places and load files from backend
		fm.one('load', function() {
			var dat, hashes;
			
			if (fm.oldAPI) {
				return;
			}
			
			places.show().parent().show();

			dirs = {};
			dat = fm.storage(key);
			if (typeof dat === 'string') {
				// old data type elFinder <= 2.1.12
				dat = $.map(dat.split(','), function(hash) { return hash || null;});
				$.each(dat, function(i, d) {
					var dir = d.split('#')
					dirs[dir[0]] = dir[1]? dir[1] : dir[0];
				});
			} else if ($.isPlainObject(dat)) {
				dirs = dat;
			}
			// allow modify `dirs`
			/**
			 * example for preset places
			 * 
			 * elfinderInstance.bind('placesload', function(e, fm) {
			 * 	//if (fm.storage(e.data.storageKey) === null) { // for first time only
			 * 	if (!fm.storage(e.data.storageKey)) {           // for empty places
			 * 		e.data.dirs[targetHash] = fallbackName;     // preset folder
			 * 	}
			 * }
			 **/
			fm.trigger('placesload', {dirs: dirs, storageKey: key}, true);
			
			hashes = Object.keys(dirs);
			if (hashes.length) {
				root.prepend(spinner);
				
				fm.request({
					data : {cmd : 'info', targets : hashes},
					preventDefault : true
				})
				.done(function(data) {
					var exists = {};
					$.each(data.files, function(i, f) {
						var hash = f.hash;
						exists[hash] = f;
					});
					$.each(dirs, function(h, f) {
						add(exists[h] || $.extend({notfound: true}, f));
					});
					if (fm.storage('placesState') > 0) {
						root.click();
					}
				})
				.always(function() {
					spinner.remove();
				})
			}
			

			fm.change(function(e) {
				var changed = false;
				$.each(e.data.changed, function(i, file) {
					if (dirs[file.hash]) {
						if (file.mime !== 'directory') {
							if (remove(file.hash)) {
								changed = true;
							}
						} else {
							if (update(file)) {
								changed = true;
							}
						}
					}
				});
				changed && save();
			})
			.bind('rename', function(e) {
				var changed = false;
				if (e.data.removed) {
					$.each(e.data.removed, function(i, hash) {
						if (e.data.added[i]) {
							if (update(e.data.added[i], hash)) {
								changed = true;
							}
						}
					});
				}
				changed && save();
			})
			.bind('rm paste', function(e) {
				var names = [],
					changed = false;
				if (e.data.removed) {
					$.each(e.data.removed, function(i, hash) {
						var name = remove(hash);
						name && names.push(name);
					});
				}
				if (names.length) {
					changed = true;
				}
				if (e.data.added && names.length) {
					$.each(e.data.added, function(i, file) {
						if ($.inArray(file.name, names) !== 1) {
							file.mime == 'directory' && add(file);
						}
					});
				}
				changed && save();
			})
			.bind('sync netmount', function(e) {
				var hashes = Object.keys(dirs);
				if (hashes.length) {
					root.prepend(spinner);

					fm.request({
						data : {cmd : 'info', targets : hashes},
						preventDefault : true
					})
					.done(function(data) {
						var exists  = {},
							updated = false,
							cwd     = fm.cwd().hash;
						$.each(data.files || [], function(i, file) {
							var hash = file.hash;
							exists[hash] = file;
							if (!fm.files().hasOwnProperty(file.hash)) {
								// update cache
								fm.trigger('tree', {tree: [file]});
							}
						});
						$.each(dirs, function(h, f) {
							if (!f.notfound != !!exists[h]) {
								if ((f.phash === cwd && e.type !== 'netmount') || (exists[h] && exists[h].mime !== 'directory')) {
									if (remove(h)) {
										updated = true;
									}
								} else {
									if (update(exists[h] || $.extend({notfound: true}, f))) {
										updated = true;
									}
								}
							} else if (exists[h] && exists[h].phash != cwd) {
								// update permission of except cwd
								update(exists[h]);
							}
						});
						updated && save();
					})
					.always(function() {
						spinner.remove();
					});
				}
			})
			
		})
		
	});
};
