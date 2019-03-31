/**
 * elFinder resources registry.
 * Store shared data
 *
 * @type Object
 * @author Dmitry (dio) Levashov
 **/
elFinder.prototype.resources = {
	'class' : {
		hover       : 'ui-state-hover',
		active      : 'ui-state-active',
		disabled    : 'ui-state-disabled',
		draggable   : 'ui-draggable',
		droppable   : 'ui-droppable',
		adroppable  : 'elfinder-droppable-active',
		cwdfile     : 'elfinder-cwd-file',
		cwd         : 'elfinder-cwd',
		tree        : 'elfinder-tree',
		treeroot    : 'elfinder-navbar-root',
		navdir      : 'elfinder-navbar-dir',
		navdirwrap  : 'elfinder-navbar-dir-wrapper',
		navarrow    : 'elfinder-navbar-arrow',
		navsubtree  : 'elfinder-navbar-subtree',
		navcollapse : 'elfinder-navbar-collapsed',
		navexpand   : 'elfinder-navbar-expanded',
		treedir     : 'elfinder-tree-dir',
		placedir    : 'elfinder-place-dir',
		searchbtn   : 'elfinder-button-search',
		editing     : 'elfinder-to-editing',
		preventback : 'elfinder-prevent-back',
		tabstab     : 'ui-state-default ui-tabs-tab ui-corner-top ui-tab',
		tabsactive  : 'ui-tabs-active ui-state-active'
	},
	tpl : {
		perms      : '<span class="elfinder-perms"/>',
		lock       : '<span class="elfinder-lock"/>',
		symlink    : '<span class="elfinder-symlink"/>',
		navicon    : '<span class="elfinder-nav-icon"/>',
		navspinner : '<span class="elfinder-spinner elfinder-navbar-spinner"/>',
		navdir     : '<div class="elfinder-navbar-wrapper{root}"><span id="{id}" class="ui-corner-all elfinder-navbar-dir {cssclass}"{title}><span class="elfinder-navbar-arrow"/><span class="elfinder-navbar-icon" {style}/>{symlink}{permissions}{name}</span><div class="elfinder-navbar-subtree" style="display:none"/></div>',
		placedir   : '<div class="elfinder-navbar-wrapper"><span id="{id}" class="ui-corner-all elfinder-navbar-dir {cssclass}"{title}><span class="elfinder-navbar-arrow"/><span class="elfinder-navbar-icon" {style}/>{symlink}{permissions}{name}</span><div class="elfinder-navbar-subtree" style="display:none"/></div>'
		
	},
	// mimes.text will be overwritten with connector config if `textMimes` is included in initial response
	// @see php/elFInder.class.php `public static $textMimes`
	mimes : {
		text : [
			'application/dash+xml',
			'application/docbook+xml',
			'application/javascript',
			'application/json',
			'application/plt',
			'application/sat',
			'application/sql',
			'application/step',
			'application/vnd.hp-hpgl',
			'application/x-awk',
			'application/x-config',
			'application/x-csh',
			'application/x-empty',
			'application/x-mpegurl',
			'application/x-perl',
			'application/x-php',
			'application/x-web-config',
			'application/xhtml+xml',
			'application/xml',
			'audio/x-mp3-playlist',
			'image/cgm',
			'image/svg+xml',
			'image/vnd.dxf',
			'model/iges'
		]
	},
	
	mixin : {
		make : function() {
			"use strict";
			var self = this,
				fm   = this.fm,
				cmd  = this.name,
				req  = this.requestCmd || cmd,
				wz   = fm.getUI('workzone'),
				org  = (this.origin && this.origin === 'navbar')? 'tree' : 'cwd',
				tree = (org === 'tree'),
				find = tree? 'navHash2Elm' : 'cwdHash2Elm',
				tarea= (! tree && fm.storage('view') != 'list'),
				sel  = fm.selected(),
				move = this.move || false,
				empty= wz.hasClass('elfinder-cwd-wrapper-empty'),
				unselect = function() {
					requestAnimationFrame(function() {
						input && input.trigger('blur');
					});
				},
				rest = function(){
					if (!overlay.is(':hidden')) {
						overlay.elfinderoverlay('hide').off('click close', cancel);
					}
					if (nnode) {
						pnode.removeClass('ui-front')
							.css('position', '')
							.off('unselect.'+fm.namespace, unselect);
						if (tarea) {
							nnode && nnode.css('max-height', '');
						} else if (!tree) {
							pnode.css('width', '')
								.parent('td').css('overflow', '');
						}
					}
				}, colwidth,
				dfrd = $.Deferred()
					.fail(function(error) {
						dstCls && dst.attr('class', dstCls);
						empty && wz.addClass('elfinder-cwd-wrapper-empty');
						if (sel) {
							move && fm.trigger('unlockfiles', {files: sel});
							fm.clipboard([]);
							fm.trigger('selectfiles', { files: sel });
						}
						error && fm.error(error);
					})
					.always(function() {
						rest();
						cleanup();
						fm.enable().unbind('open', openCallback).trigger('resMixinMake');
					}),
				id    = 'tmp_'+parseInt(Math.random()*100000),
				phash = this.data && this.data.target? this.data.target : (tree? fm.file(sel[0]).hash : fm.cwd().hash),
				date = new Date(),
				file   = {
					hash  : id,
					phash : phash,
					name  : fm.uniqueName(this.prefix, phash),
					mime  : this.mime,
					read  : true,
					write : true,
					date  : 'Today '+date.getHours()+':'+date.getMinutes(),
					move  : move
				},
				dum = fm.getUI(org).trigger('create.'+fm.namespace, file),
				data = this.data || {},
				node = fm[find](id),
				nnode, pnode,
				overlay = fm.getUI('overlay'),
				cleanup = function() {
					if (node && node.length) {
						input.off();
						node.hide();
						fm.unselectfiles({files : [id]}).unbind('resize', resize);
						requestAnimationFrame(function() {
							if (tree) {
								node.closest('.elfinder-navbar-wrapper').remove();
							} else {
								node.remove();
							}
						});
					}
				},
				cancel = function(e) { 
					if (!overlay.is(':hidden')) {
						pnode.css('z-index', '');
					}
					if (! inError) {
						cleanup();
						dfrd.reject();
						if (e) {
							e.stopPropagation();
							e.preventDefault();
						}
					}
				},
				input = $(tarea? '<textarea/>' : '<input type="text"/>')
					.on('keyup text', function(){
						if (tarea) {
							this.style.height = '1px';
							this.style.height = this.scrollHeight + 'px';
						} else if (colwidth) {
							this.style.width = colwidth + 'px';
							if (this.scrollWidth > colwidth) {
								this.style.width = this.scrollWidth + 10 + 'px';
							}
						}
					})
					.on('keydown', function(e) {
						e.stopImmediatePropagation();
						if (e.keyCode == $.ui.keyCode.ESCAPE) {
							dfrd.reject();
						} else if (e.keyCode == $.ui.keyCode.ENTER) {
							e.preventDefault();
							input.trigger('blur');
						}
					})
					.on('mousedown click dblclick', function(e) {
						e.stopPropagation();
						if (e.type === 'dblclick') {
							e.preventDefault();
						}
					})
					.on('blur', function() {
						var name   = $.trim(input.val()),
							parent = input.parent(),
							valid  = true,
							cut;

						if (!overlay.is(':hidden')) {
							pnode.css('z-index', '');
						}
						if (name === '') {
							return cancel();
						}
						if (!inError && parent.length) {

							if (fm.options.validName && fm.options.validName.test) {
								try {
									valid = fm.options.validName.test(name);
								} catch(e) {
									valid = false;
								}
							}
							if (!name || name === '.' || name === '..' || !valid) {
								inError = true;
								fm.error(file.mime === 'directory'? 'errInvDirname' : 'errInvName', {modal: true, close: function(){setTimeout(select, 120);}});
								return false;
							}
							if (fm.fileByName(name, phash)) {
								inError = true;
								fm.error(['errExists', name], {modal: true, close: function(){setTimeout(select, 120);}});
								return false;
							}

							cut = (sel && move)? fm.exec('cut', sel) : null;

							$.when(cut)
							.done(function() {
								var toast   = {},
									nextAct = {};
								
								rest();
								input.hide().before($('<span>').text(name));

								fm.lockfiles({files : [id]});

								fm.request({
										data        : Object.assign({cmd : req, name : name, target : phash}, data || {}), 
										notify      : {type : req, cnt : 1},
										preventFail : true,
										syncOnFail  : true,
										navigate    : {toast : toast},
									})
									.fail(function(error) {
										fm.unlockfiles({files : [id]});
										inError = true;
										input.show().prev().remove();
										fm.error(error, {
											modal: true,
											close: function() {
												if (Array.isArray(error) && $.inArray('errUploadMime', error) !== -1) {
													dfrd.notify('errUploadMime').reject();
												} else {
													setTimeout(select, 120);
												}
											}
										});
									})
									.done(function(data) {
										if (data && data.added && data.added[0]) {
											var item    = data.added[0],
												dirhash = item.hash,
												newItem = fm[find](dirhash),
												acts    = {
													'directory' : { cmd: 'open', msg: 'cmdopendir' },
													'text'      : { cmd: 'edit', msg: 'cmdedit' },
													'default'   : { cmd: 'open', msg: 'cmdopen' }
												},
												tmpMimes;
											if (sel && move) {
												fm.one(req+'done', function() {
													fm.exec('paste', dirhash);
												});
											}
											if (!move) {
												if (fm.mimeIsText(item.mime) && !fm.mimesCanMakeEmpty[item.mime] && fm.mimeTypes[item.mime]) {
													fm.trigger('canMakeEmptyFile', {mimes: [item.mime], unshift: true});
													tmpMimes = {};
													tmpMimes[item.mime] = fm.mimeTypes[item.mime];
													fm.storage('mkfileTextMimes', Object.assign(tmpMimes, fm.storage('mkfileTextMimes') || {}));
												}
												Object.assign(nextAct, nextAction || acts[item.mime] || acts[item.mime.split('/')[0]] || acts[(fm.mimesCanMakeEmpty[item.mime] || $.inArray(item.mime, fm.resources.mimes.text) !== -1) ? 'text' : 'none'] || acts['default']);
												Object.assign(toast, nextAct.cmd ? {
													incwd    : {msg: fm.i18n(['complete', fm.i18n('cmd'+cmd)]), action: nextAct},
													inbuffer : {msg: fm.i18n(['complete', fm.i18n('cmd'+cmd)]), action: nextAct}
												} : {
													inbuffer : {msg: fm.i18n(['complete', fm.i18n('cmd'+cmd)])}
												});
											}
										}
										dfrd.resolve(data);
									});
							})
							.fail(function() {
								dfrd.reject();
							});
						}
					})
					.on('dragenter dragleave dragover drop', function(e) {
						// stop bubbling to prevent upload with native drop event
						e.stopPropagation();
					}),
				select = function() {
					var name = fm.splitFileExtention(input.val())[0];
					if (!inError && fm.UA.Mobile && !fm.UA.iOS) { // since iOS has a bug? (z-index not effect) so disable it
						overlay.on('click close', cancel).elfinderoverlay('show');
						pnode.css('z-index', overlay.css('z-index') + 1);
					}
					inError = false;
					! fm.enabled() && fm.enable();
					input.trigger('focus').trigger('select');
					input[0].setSelectionRange && input[0].setSelectionRange(0, name.length);
				},
				resize = function() {
					node.trigger('scrolltoview', {blink : false});
				},
				openCallback = function() {
					dfrd && (dfrd.state() === 'pending') && dfrd.reject();
				},
				inError = false,
				nextAction,
				// for tree
				dst, dstCls, collapsed, expanded, arrow, subtree;

			if (!fm.isCommandEnabled(req, phash) || !node.length) {
				return dfrd.reject();
			}

			if ($.isPlainObject(self.nextAction)){
				nextAction = Object.assign({}, self.nextAction);
			}
			
			if (tree) {
				dst = fm[find](phash);
				collapsed = fm.res('class', 'navcollapse');
				expanded  = fm.res('class', 'navexpand');
				arrow = fm.res('class', 'navarrow');
				subtree = fm.res('class', 'navsubtree');
				
				node.closest('.'+subtree).show();
				if (! dst.hasClass(collapsed)) {
					dstCls = dst.attr('class');
					dst.addClass(collapsed+' '+expanded+' elfinder-subtree-loaded');
				}
				if (dst.is('.'+collapsed+':not(.'+expanded+')')) {
					dst.children('.'+arrow).trigger('click').data('dfrd').done(function() {
						if (input.val() === file.name) {
							input.val(fm.uniqueName(self.prefix, phash)).trigger('select').trigger('focus');
						}
					});
				}
				nnode = node.contents().filter(function(){ return this.nodeType==3 && $(this).parent().attr('id') === fm.navHash2Id(file.hash); });
				pnode = nnode.parent();
				nnode.replaceWith(input.val(file.name));
			} else {
				empty && wz.removeClass('elfinder-cwd-wrapper-empty');
				nnode = node.find('.elfinder-cwd-filename');
				pnode = nnode.parent();
				if (tarea) {
					nnode.css('max-height', 'none');
				} else {
					colwidth = pnode.width();
					pnode.width(colwidth - 15)
						.parent('td').css('overflow', 'visible');
				}
				nnode.empty().append(input.val(file.name));
			}
			pnode.addClass('ui-front')
				.css('position', 'relative')
				.on('unselect.'+fm.namespace, unselect);
			
			fm.bind('resize', resize).one('open', openCallback);
			
			input.trigger('keyup');
			select();

			return dfrd;

		}
	},
	blink: function(elm, mode) {
		"use strict";
		var acts = {
			slowonce : function(){elm.hide().delay(250).fadeIn(750).delay(500).fadeOut(3500);},
			lookme   : function(){elm.show().fadeOut(500).fadeIn(750);}
		}, func;
		mode = mode || 'slowonce';
		
		func = acts[mode] || acts['lookme'];
		
		elm.stop(true, true);
		func();
	}
};
