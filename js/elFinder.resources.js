"use strict";
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
		editing     : 'elfinder-to-editing'
	},
	tpl : {
		perms      : '<span class="elfinder-perms"/>',
		lock       : '<span class="elfinder-lock"/>',
		symlink    : '<span class="elfinder-symlink"/>',
		navicon    : '<span class="elfinder-nav-icon"/>',
		navspinner : '<span class="elfinder-navbar-spinner"/>',
		navdir     : '<div class="elfinder-navbar-wrapper{root}"><span id="{id}" class="ui-corner-all elfinder-navbar-dir {cssclass}"><span class="elfinder-navbar-arrow"/><span class="elfinder-navbar-icon" {style}/>{symlink}{permissions}{name}</span><div class="elfinder-navbar-subtree" style="display:none"/></div>',
		placedir   : '<div class="elfinder-navbar-wrapper"><span id="{id}" class="ui-corner-all elfinder-navbar-dir {cssclass}" title="{title}"><span class="elfinder-navbar-arrow"/><span class="elfinder-navbar-icon" {style}/>{symlink}{permissions}{name}</span><div class="elfinder-navbar-subtree" style="display:none"/></div>'
		
	},
	// mimes.text will be overwritten with connector config if `textMimes` is included in initial response
	// @see php/elFInder.class.php `public static $textMimes`
	mimes : {
		text : [
			'application/x-empty',
			'application/javascript', 
			'application/json',
			'application/xhtml+xml', 
			'audio/x-mp3-playlist', 
			'application/x-web-config',
			'application/docbook+xml',
			'application/x-php',
			'application/x-perl',
			'application/x-awk',
			'application/x-config',
			'application/x-csh',
			'application/xml',
			'application/sql'
		]
	},
	
	mixin : {
		make : function() {
			var self = this,
				fm   = this.fm,
				cmd  = this.name,
				req  = this.requestCmd || cmd,
				wz   = fm.getUI('workzone'),
				org  = (this.origin && this.origin === 'navbar')? 'tree' : 'cwd',
				ui   = fm.getUI(org),
				tree = (org === 'tree'),
				find = tree? 'navHash2Id' : 'cwdHash2Id',
				tarea= (! tree && fm.storage('view') != 'list'),
				sel  = fm.selected(),
				move = this.move || false,
				empty= wz.hasClass('elfinder-cwd-wrapper-empty'),
				rest = function(){
					if (!overlay.is(':hidden')) {
						overlay.addClass('ui-front')
							.elfinderoverlay('hide')
							.off('click', cancel);
					}
					node.removeClass('ui-front').css('position', '');
					if (tarea) {
						nnode && nnode.css('max-height', '');
					} else if (pnode) {
						pnode.css('width', '')
							.parent('td').css('overflow', '');
					}
				}, colwidth,
				dfrd = $.Deferred()
					.fail(function(error) {
						dstCls && dst.attr('class', dstCls);
						empty && wz.addClass('elfinder-cwd-wrapper-empty');
						if (sel) {
							move && fm.trigger('unlockfiles', {files: sel});
							fm.clipboard([]);
							fm.trigger('selectfiles', { files: sel })
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
				data = this.data || {},
				node = ui.trigger('create.'+fm.namespace, file).find('#'+fm[find](id))
					.on('unselect.'+fm.namespace, function() {
						setTimeout(function() {
							input && input.blur();
						}, 50);
					}),
				nnode, pnode,
				overlay = fm.getUI('overlay'),
				cleanup = function() {
					if (node && node.length) {
						input.off();
						node.hide();
						fm.unselectfiles({files : [id]}).unbind('resize', resize);
						setTimeout(function() {
							if (tree) {
								node.closest('.elfinder-navbar-wrapper').remove();
							} else {
								node.remove();
							}
						}, 0);
					}
				},
				cancel = function(e) { 
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
							input.blur();
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
								fm.error(file.mime === 'directory'? 'errInvDirname' : 'errInvName', {modal: true, close: select});
								return false;
							}
							if (fm.fileByName(name, phash)) {
								inError = true;
								fm.error(['errExists', name], {modal: true, close: select});
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
										notify      : {type : cmd, cnt : 1},
										preventFail : true,
										syncOnFail  : true,
										navigate    : {toast : toast},
									})
									.fail(function(error) {
										fm.unlockfiles({files : [id]});
										inError = true;
										input.show().prev().remove();
										fm.error(error, {modal: true, close: select});
									})
									.done(function(data) {
										if (data && data.added && data.added[0]) {
											var item    = data.added[0],
												dirhash = item.hash,
												newItem = ui.find('#'+fm[find](dirhash)),
												acts    = {
													'directory' : { cmd: 'open', msg: 'cmdopendir' },
													'text'      : { cmd: 'edit', msg: 'cmdedit' },
													'default'   : { cmd: 'open', msg: 'cmdopen' }
												};
											if (sel && move) {
												fm.one(req+'done', function() {
													fm.exec('paste', dirhash);
												});
											}
											if (!move) {
												Object.assign(nextAct, nextAction || acts[item.mime] || acts[item.mime.split('/')[0]] || acts[$.inArray(item.mime, fm.resources.mimes.text) !== -1 ? 'text' : 'none'] || acts['default']);
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
					}),
				select = function() {
					var name = input.val().replace(/\.((tar\.(gz|bz|bz2|z|lzo))|cpio\.gz|ps\.gz|xcf\.(gz|bz2)|[a-z0-9]{1,4})$/ig, '');
					if (!inError && fm.UA.Mobile && !fm.UA.iOS) { // since iOS has a bug? so disable it
						overlay.on('click', cancel)
							.removeClass('ui-front').elfinderoverlay('show');
					}
					inError = false;
					input.css('z-index', overlay.css('z-index')).focus().select();
					input[0].setSelectionRange && input[0].setSelectionRange(0, name.length);
				},
				resize = function() {
					node.trigger('scrolltoview');
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
			
			if (fm.UA.iOS) {
				// prevent auto zoom
				input.css('font-size', '16px');
			}
			
			if (tree) {
				dst = $('#'+fm[find](phash));
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
					dst.children('.'+arrow).click().data('dfrd').done(function() {
						if (input.val() === file.name) {
							input.val(fm.uniqueName(this.prefix, phash)).select().focus();
						}
					}.bind(this));
				}
				nnode = node.contents().filter(function(){ return this.nodeType==3 && $(this).parent().attr('id') === fm.navHash2Id(file.hash); });
				nnode.replaceWith(input.val(file.name));
			} else {
				empty && wz.removeClass('elfinder-cwd-wrapper-empty');
				nnode = node.find('.elfinder-cwd-filename');
				pnode = nnode.parent();
				node.css('position', 'relative').addClass('ui-front');
				if (tarea) {
					nnode.css('max-height', 'none');
				} else {
					colwidth = pnode.width();
					pnode.width(colwidth - 15)
						.parent('td').css('overflow', 'visible');
				}
				nnode.empty().append(input.val(file.name));
			}
			
			fm.bind('resize', resize).one('open', openCallback);
			
			input.trigger('keyup');
			select();

			return dfrd;

		}
	},
	blink: function(elm, mode) {
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
