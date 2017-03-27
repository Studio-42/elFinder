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
	
	mimes : {
		text : [
			'application/x-empty',
			'application/javascript', 
			'application/xhtml+xml', 
			'audio/x-mp3-playlist', 
			'application/x-web-config',
			'application/docbook+xml',
			'application/x-php',
			'application/x-perl',
			'application/x-awk',
			'application/x-config',
			'application/x-csh',
			'application/xml'
		]
	},
	
	mixin : {
		make : function() {
			var fm   = this.fm,
				cmd  = this.name,
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
						nnode.css('max-height', '');
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
						fm.enable();
						fm.trigger('resMixinMake');
					}),
				id    = 'tmp_'+parseInt(Math.random()*100000),
				phash = tree? fm.file(sel[0]).hash : fm.cwd().hash,
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
					fm.unbind('resize', resize);
					input.remove();
					if (tree) {
						node.closest('.elfinder-navbar-wrapper').remove();
					}
					node.remove();
				},
				cancel = function(e) { 
					if (! inError) {
						cleanup();
						e.stopPropagation();
						dfrd.reject();
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
					.keydown(function(e) {
						e.stopImmediatePropagation();
						if (e.keyCode == $.ui.keyCode.ESCAPE) {
							dfrd.reject();
						} else if (e.keyCode == $.ui.keyCode.ENTER) {
							input.blur();
						}
					})
					.mousedown(function(e) {
						e.stopPropagation();
					})
					.blur(function() {
						var name   = $.trim(input.val()),
							parent = input.parent(),
							valid  = true,
							cut;

						if (!inError && parent.length) {

							if (fm.options.validName && fm.options.validName.test) {
								try {
									valid = fm.options.validName.test(name);
								} catch(e) {
									valid = false;
								}
							}
							if (!name || name === '..' || !valid) {
								inError = true;
								fm.error('errInvName', {modal: true, close: select});
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
								rest();
								input.hide().before($('<span>').text(name));

								fm.lockfiles({files : [id]});

								fm.request({
										data        : $.extend({cmd : cmd, name : name, target : phash}, data || {}), 
										notify      : {type : cmd, cnt : 1},
										preventFail : true,
										syncOnFail  : true
									})
									.fail(function(error) {
										fm.unlockfiles({files : [id]});
										inError = true;
										input.show().prev().remove();
										fm.error(error, {modal: true, close: select});
									})
									.done(function(data) {
										dfrd.resolve(data);
										if (data && data.added && data.added[0]) {
											var item    = data.added[0],
												dirhash = item.hash,
												newItem = ui.find('#'+fm[find](dirhash));
											if (sel && move) {
												fm.one(cmd+'done', function() {
													fm.exec('paste', dirhash);
												});
											}
											fm.one(cmd+'done', function() {
												var acts = {
														'directory' : { cmd: 'open', msg: 'cmdopendir' },
														'text/plain': { cmd: 'edit', msg: 'cmdedit' },
														'default'   : { cmd: 'open', msg: 'cmdopen' }
													},
													act, extNode;
												newItem = ui.find('#'+fm[find](item.hash));
												if (data.added.length === 1) {
													act = acts[item.mime] || acts['default'];
													extNode = $('<div/>').append(
														$('<button type="button" class="ui-button ui-widget ui-state-default ui-corner-all elfinder-tabstop"><span class="ui-button-text">'
															+fm.i18n(act.msg)
															+'</span></button>')
														.on('mouseenter mouseleave', function(e) { 
															$(this).toggleClass('ui-state-hover', e.type == 'mouseenter');
														})
														.on('click', function() {
															fm.exec(act.cmd, item.hash);
														})
													);
												}
												if (newItem.length) {
													newItem.trigger('scrolltoview');
													! move && extNode && fm.toast({msg: fm.i18n(['complete', fm.i18n('cmd'+cmd)]), extNode: extNode});
												} else {
													fm.trigger('selectfiles', {files : $.map(data.added, function(f) {return f.hash;})});
													! move && fm.toast({msg: fm.i18n(['complete', fm.i18n('cmd'+cmd)]), extNode: extNode});
												}
											});
										}
									});
							})
							.fail(function() {
								dfrd.reject();
							});
						}
					}),
				select = function() {
					var name = input.val().replace(/\.((tar\.(gz|bz|bz2|z|lzo))|cpio\.gz|ps\.gz|xcf\.(gz|bz2)|[a-z0-9]{1,4})$/ig, '');
					inError = false;
					if (fm.UA.Mobile) {
						overlay.on('click', cancel)
							.removeClass('ui-front').elfinderoverlay('show');
					}
					input.select().focus();
					input[0].setSelectionRange && input[0].setSelectionRange(0, name.length);
				},
				resize = function() {
					node.trigger('scrolltoview');
				},
				inError = false,
				// for tree
				dst, dstCls, collapsed, expanded, arrow, subtree;

			if ((! tree && this.disabled()) || !node.length) {
				return dfrd.reject();
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
				nnode.empty('').append(input.val(file.name));
			}
			
			fm.bind('resize', resize);
			
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
