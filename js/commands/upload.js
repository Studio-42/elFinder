/**
 * @class elFinder command "upload"
 * Upload files using iframe or XMLHttpRequest & FormData.
 * Dialog allow to send files using drag and drop
 *
 * @type  elFinder.command
 * @author  Dmitry (dio) Levashov
 */
elFinder.prototype.commands.upload = function() {
	"use strict";
	var hover = this.fm.res('class', 'hover');
	
	this.disableOnSearch = true;
	this.updateOnSelect  = false;
	
	// Shortcut opens dialog
	this.shortcuts = [{
		pattern     : 'ctrl+u'
	}];
	
	/**
	 * Return command state
	 *
	 * @return Number
	 **/
	this.getstate = function(select) {
		var fm = this.fm, f,
		sel = (select || [fm.cwd().hash]);
		if (!this._disabled && sel.length == 1) {
			f = fm.file(sel[0]);
		}
		return (f && f.mime == 'directory' && f.write)? 0 : -1;
	};
	
	
	this.exec = function(data) {
		var fm = this.fm,
			cwdHash = fm.cwd().hash,
			getTargets = function() {
				var tgts = data && (data instanceof Array)? data : null,
					sel;
				if (! data || data instanceof Array) {
					if (! tgts && (sel = fm.selected()).length === 1 && fm.file(sel[0]).mime === 'directory') {
						tgts = sel;
					} else if (!tgts || tgts.length !== 1 || fm.file(tgts[0]).mime !== 'directory') {
						tgts = [ cwdHash ];
					}
				}
				return tgts;
			},
			targets = getTargets(),
			check = targets? targets[0] : (data && data.target? data.target : null),
			targetDir = check? fm.file(check) : fm.cwd(),
			fmUpload = function(data) {
				fm.upload(data)
					.fail(function(error) {
						dfrd.reject(error);
					})
					.done(function(data) {
						var cwd = fm.getUI('cwd'),
							node;
						dfrd.resolve(data);
						if (data && data.added && data.added[0] && ! fm.ui.notify.children('.elfinder-notify-upload').length) {
							var newItem = fm.findCwdNodes(data.added);
							if (newItem.length) {
								newItem.trigger('scrolltoview');
							} else {
								if (targetDir.hash !== cwdHash) {
									node = $('<div/>').append(
										$('<button type="button" class="ui-button ui-widget ui-state-default ui-corner-all elfinder-tabstop"><span class="ui-button-text">'+fm.i18n('cmdopendir')+'</span></button>')
										.on('mouseenter mouseleave', function(e) { 
											$(this).toggleClass('ui-state-hover', e.type == 'mouseenter');
										}).on('click', function() {
											fm.exec('open', check).done(function() {
												fm.one('opendone', function() {
													fm.trigger('selectfiles', {files : $.map(data.added, function(f) {return f.hash;})});
												});
											});
										})
									);
								} else {
									fm.trigger('selectfiles', {files : $.map(data.added, function(f) {return f.hash;})});
								}
								fm.toast({msg: fm.i18n(['complete', fm.i18n('cmdupload')]), extNode: node});
							}
						}
					})
					.progress(function() {
						dfrd.notifyWith(this, Array.from(arguments));
					});
			},
			upload = function(data) {
				dialog.elfinderdialog('close');
				if (targets) {
					data.target = targets[0];
				}
				fmUpload(data);
			},
			getSelector = function() {
				var hash = targetDir.hash,
					dirs = $.map(fm.files(hash), function(f) {
						return (f.mime === 'directory' && f.write)? f : null; 
					});
				
				if (! dirs.length) {
					return $();
				}
				
				return $('<div class="elfinder-upload-dirselect elfinder-tabstop" title="' + fm.i18n('folders') + '"/>')
				.on('click', function(e) {
					e.stopPropagation();
					e.preventDefault();
					dirs = fm.sortFiles(dirs);
					var $this  = $(this),
						cwd    = fm.cwd(),
						base   = dialog.closest('div.ui-dialog'),
						getRaw = function(f, icon) {
							return {
								label    : fm.escape(f.i18 || f.name),
								icon     : icon,
								remain   : false,
								callback : function() {
									var title = base.children('.ui-dialog-titlebar:first').find('span.elfinder-upload-target');
									targets = [ f.hash ];
									title.html(' - ' + fm.escape(f.i18 || f.name));
									$this.trigger('focus');
								},
								options  : {
									className : (targets && targets.length && f.hash === targets[0])? 'ui-state-active' : '',
									iconClass : f.csscls || '',
									iconImg   : f.icon   || ''
								}
							};
						},
						raw = [ getRaw(targetDir, 'opendir'), '|' ];
					$.each(dirs, function(i, f) {
						raw.push(getRaw(f, 'dir'));
					});
					$this.trigger('blur');
					fm.trigger('contextmenu', {
						raw: raw,
						x: e.pageX || $(this).offset().left,
						y: e.pageY || $(this).offset().top,
						prevNode: base,
						fitHeight: true
					});
				}).append('<span class="elfinder-button-icon elfinder-button-icon-dir" />');
			},
			inputButton = function(type, caption) {
				var button,
					input = $('<input type="file" ' + type + '/>')
					.on('click', function() {
						// for IE's bug
						if (fm.UA.IE) {
							setTimeout(function() {
								form.css('display', 'none').css('position', 'relative');
								requestAnimationFrame(function() {
									form.css('display', '').css('position', '');
								});
							}, 100);
						}
					})
					.on('change', function() {
						upload({input : input.get(0), type : 'files'});
					})
					.on('dragover', function(e) {
						e.originalEvent.dataTransfer.dropEffect = 'copy';
					}),
					form = $('<form/>').append(input).on('click', function(e) {
						e.stopPropagation();
					});

				return $('<div class="ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only elfinder-tabstop elfinder-focus"><span class="ui-button-text">'+fm.i18n(caption)+'</span></div>')
					.append(form)
					.on('click', function(e) {
						e.stopPropagation();
						e.preventDefault();
						input.trigger('click');
					})
					.on('mouseenter mouseleave', function(e) {
						$(this).toggleClass(hover, e.type === 'mouseenter');
					});
			},
			dfrd = $.Deferred(),
			dialog, dropbox, pastebox, dropUpload, paste, dirs, spinner, uidialog;
		
		dropUpload = function(e) {
			e.stopPropagation();
			e.preventDefault();
			var file = false,
				type = '',
				elfFrom = null,
				mycwd = '',
				data = null,
				target = e._target || null,
				trf = e.dataTransfer || null,
				kind = (trf.items && trf.items.length && trf.items[0].kind)? trf.items[0].kind : '',
				errors;
			
			if (trf) {
				try {
					elfFrom = trf.getData('elfinderfrom');
					if (elfFrom) {
						mycwd = window.location.href + fm.cwd().hash;
						if ((!target && elfFrom === mycwd) || target === mycwd) {
							dfrd.reject();
							return;
						}
					}
				} catch(e) {}
				
				if (kind === 'file' && (trf.items[0].getAsEntry || trf.items[0].webkitGetAsEntry)) {
					file = trf;
					type = 'data';
				} else if (kind !== 'string' && trf.files && trf.files.length && $.inArray('Text', trf.types) === -1) {
					file = trf.files;
					type = 'files';
				} else {
					try {
						if ((data = trf.getData('text/html')) && data.match(/<(?:img|a)/i)) {
							file = [ data ];
							type = 'html';
						}
					} catch(e) {}
					if (! file) {
						if (data = trf.getData('text')) {
							file = [ data ];
							type = 'text';
						} else if (trf && trf.files) {
							// maybe folder uploading but this UA dose not support it
							kind = 'file';
						}
					}
				}
			}
			if (file) {
				fmUpload({files : file, type : type, target : target, dropEvt : e});
			} else {
				errors = ['errUploadNoFiles'];
				if (kind === 'file') {
					errors.push('errFolderUpload');
				}
				fm.error(errors);
				dfrd.reject();
			}
		};
		
		if (!targets && data) {
			if (data.input || data.files) {
				data.type = 'files';
				fmUpload(data);
			} else if (data.dropEvt) {
				dropUpload(data.dropEvt);
			}
			return dfrd;
		}
		
		paste = function(ev) {
			var e = ev.originalEvent || ev;
			var files = [], items = [];
			var file;
			if (e.clipboardData) {
				if (e.clipboardData.items && e.clipboardData.items.length){
					items = e.clipboardData.items;
					for (var i=0; i < items.length; i++) {
						if (e.clipboardData.items[i].kind == 'file') {
							file = e.clipboardData.items[i].getAsFile();
							files.push(file);
						}
					}
				} else if (e.clipboardData.files && e.clipboardData.files.length) {
					files = e.clipboardData.files;
				}
				if (files.length) {
					upload({files : files, type : 'files', clipdata : true});
					return;
				}
			}
			var my = e.target || e.srcElement;
			requestAnimationFrame(function() {
				var type = 'text',
					src;
				if (my.innerHTML) {
					$(my).find('img').each(function(i, v){
						if (v.src.match(/^webkit-fake-url:\/\//)) {
							// For Safari's bug.
							// ref. https://bugs.webkit.org/show_bug.cgi?id=49141
							//      https://dev.ckeditor.com/ticket/13029
							$(v).remove();
						}
					});
					
					if ($(my).find('a,img').length) {
						type = 'html';
					}
					src = my.innerHTML;
					my.innerHTML = '';
					upload({files : [ src ], type : type});
				}
			});
		};
		
		dialog = $('<div class="elfinder-upload-dialog-wrapper"/>')
			.append(inputButton('multiple', 'selectForUpload'));
		
		if (! fm.UA.Mobile && (function(input) {
			return (typeof input.webkitdirectory !== 'undefined' || typeof input.directory !== 'undefined');})(document.createElement('input'))) {
			dialog.append(inputButton('multiple webkitdirectory directory', 'selectFolder'));
		}
		
		if (targetDir.dirs) {
			
			if (targetDir.hash === cwdHash || fm.navHash2Elm(targetDir.hash).hasClass('elfinder-subtree-loaded')) {
				getSelector().appendTo(dialog);
			} else {
				spinner = $('<div class="elfinder-upload-dirselect" title="' + fm.i18n('nowLoading') + '"/>')
					.append('<span class="elfinder-button-icon elfinder-button-icon-spinner" />')
					.appendTo(dialog);
				fm.request({cmd : 'tree', target : targetDir.hash})
					.done(function() { 
						fm.one('treedone', function() {
							spinner.replaceWith(getSelector());
							uidialog.elfinderdialog('tabstopsInit');
						});
					})
					.fail(function() {
						spinner.remove();
					});
			}
		}
		
		if (fm.dragUpload) {
			dropbox = $('<div class="ui-corner-all elfinder-upload-dropbox elfinder-tabstop" contenteditable="true" data-ph="'+fm.i18n('dropPasteFiles')+'"></div>')
				.on('paste', function(e){
					paste(e);
				})
				.on('mousedown click', function(){
					$(this).trigger('focus');
				})
				.on('focus', function(){
					this.innerHTML = '';
				})
				.on('mouseover', function(){
					$(this).addClass(hover);
				})
				.on('mouseout', function(){
					$(this).removeClass(hover);
				})
				.on('dragenter', function(e) {
					e.stopPropagation();
				  	e.preventDefault();
				  	$(this).addClass(hover);
				})
				.on('dragleave', function(e) {
					e.stopPropagation();
				  	e.preventDefault();
				  	$(this).removeClass(hover);
				})
				.on('dragover', function(e) {
					e.stopPropagation();
				  	e.preventDefault();
					e.originalEvent.dataTransfer.dropEffect = 'copy';
					$(this).addClass(hover);
				})
				.on('drop', function(e) {
					dialog.elfinderdialog('close');
					targets && (e.originalEvent._target = targets[0]);
					dropUpload(e.originalEvent);
				})
				.prependTo(dialog)
				.after('<div class="elfinder-upload-dialog-or">'+fm.i18n('or')+'</div>')[0];
			
		} else {
			pastebox = $('<div class="ui-corner-all elfinder-upload-dropbox" contenteditable="true">'+fm.i18n('dropFilesBrowser')+'</div>')
				.on('paste drop', function(e){
					paste(e);
				})
				.on('mousedown click', function(){
					$(this).trigger('focus');
				})
				.on('focus', function(){
					this.innerHTML = '';
				})
				.on('dragenter mouseover', function(){
					$(this).addClass(hover);
				})
				.on('dragleave mouseout', function(){
					$(this).removeClass(hover);
				})
				.prependTo(dialog)
				.after('<div class="elfinder-upload-dialog-or">'+fm.i18n('or')+'</div>')[0];
			
		}
		
		uidialog = this.fmDialog(dialog, {
			title          : this.title + '<span class="elfinder-upload-target">' + (targetDir? ' - ' + fm.escape(targetDir.i18 || targetDir.name) : '') + '</span>',
			modal          : true,
			resizable      : false,
			destroyOnClose : true,
			propagationEvents : ['mousemove', 'mouseup', 'click'],
			close          : function() {
				var cm = fm.getUI('contextmenu');
				if (cm.is(':visible')) {
					cm.click();
				}
			}
		});
		
		return dfrd;
	};

};
