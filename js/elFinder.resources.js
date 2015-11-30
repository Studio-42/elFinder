"use strict"
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
		searchbtn   : 'elfinder-button-search'
	},
	tpl : {
		perms      : '<span class="elfinder-perms"/>',
		lock       : '<span class="elfinder-lock"/>',
		symlink    : '<span class="elfinder-symlink"/>',
		navicon    : '<span class="elfinder-nav-icon"/>',
		navspinner : '<span class="elfinder-navbar-spinner"/>',
		navdir     : '<div class="elfinder-navbar-wrapper"><span id="{id}" class="ui-corner-all elfinder-navbar-dir {cssclass}"><span class="elfinder-navbar-arrow"/><span class="elfinder-navbar-icon" {style}/>{symlink}{permissions}{name}</span><div class="elfinder-navbar-subtree"/></div>'
		
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
				cwd  = fm.getUI('cwd'),
				tarea= (fm.storage('view') != 'list'),
				rest = function(){
					if (tarea) {
						node.zIndex('').css('position', '');
						nnode.css('max-height', '');
					} else {
						pnode.css('width', '');
						pnode.parent('td').css('overflow', '');
					}
				}, colwidth,
				dfrd = $.Deferred()
					.fail(function(error) {
						rest();
						cwd.trigger('unselectall');
						error && fm.error(error);
					})
					.always(function() {
						input.remove();
						node.remove();
						fm.enable();
					}),
				id    = 'tmp_'+parseInt(Math.random()*100000),
				phash = fm.cwd().hash,
				date = new Date(),
				file   = {
					hash  : id,
					name  : fm.uniqueName(this.prefix),
					mime  : this.mime,
					read  : true,
					write : true,
					date  : 'Today '+date.getHours()+':'+date.getMinutes()
				},
				data = this.data || {},
				node = cwd.trigger('create.'+fm.namespace, file).find('#'+id),
				nnode, pnode,
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
							parent = input.parent();

						if (parent.length) {

							if (!name) {
								return dfrd.reject('errInvName');
							}
							if (fm.fileByName(name, phash)) {
								return dfrd.reject(['errExists', name]);
							}

							rest();
							parent.html(fm.escape(name));

							fm.lockfiles({files : [id]});

							fm.request({
									data        : $.extend({cmd : cmd, name : name, target : phash}, data || {}), 
									notify      : {type : cmd, cnt : 1},
									preventFail : true,
									syncOnFail  : true
								})
								.fail(function(error) {
									dfrd.reject(error);
								})
								.done(function(data) {
									dfrd.resolve(data);
									if (data.added && data.added[0]) {
										var newItem = cwd.find('#'+data.added[0].hash);
										if (newItem.length) {
											newItem.trigger('scrolltoview');
										}
									}
								});
						}
					});


			if (this.disabled() || !node.length) {
				return dfrd.reject();
			}

			fm.disable();
			nnode = node.find('.elfinder-cwd-filename');
			pnode = nnode.parent();
			if (tarea) {
				node.zIndex((node.parent().zIndex()) + 1).css('position', 'relative');
				nnode.css('max-height', 'none');
			} else {
				colwidth = pnode.width();
				pnode.width(colwidth - 15);
				pnode.parent('td').css('overflow', 'visible');
			}
			nnode.empty('').append(input.val(file.name));
			input.trigger('keyup');
			input.select().focus();
			input[0].setSelectionRange && input[0].setSelectionRange(0, file.name.replace(/\..+$/, '').length);

			return dfrd;



		}
		
	}
}

