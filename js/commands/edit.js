"use strict";
/**
 * @class elFinder command "edit". 
 * Edit text file in dialog window
 *
 * @author Dmitry (dio) Levashov, dio@std42.ru
 **/
elFinder.prototype.commands.edit = function() {
	var self  = this,
		fm    = this.fm,
		dlcls = 'elfinder-dialog-edit',
		texts = [],
		mimesSingle = [],
		mimes = [],
		rtrim = function(str){
			return str.replace(/\s+$/, '');
		},
		getEncSelect = function(heads) {
			var sel = $('<select class="ui-corner-all"/>'),
				hval;
			if (heads) {
				$.each(heads, function(i, head) {
					hval = fm.escape(head.value);
					sel.append('<option value="'+hval+'">'+(head.caption? fm.escape(head.caption) : hval)+'</option>');
				});
			}
			$.each(self.options.encodings, function(i, v) {
				sel.append('<option value="'+v+'">'+v+'</option>');
			});
			return sel;
		},
		
		/**
		 * Return files acceptable to edit
		 *
		 * @param  Array  files hashes
		 * @return Array
		 **/
		filter = function(files) {
			var cnt = files.length,
				mime, ext, skip;
			
			if (cnt > 1) {
				mime = files[0].mime;
				ext = files[0].name.replace(/^.*(\.[^.]+)$/, '$1');
			}
			return $.map(files, function(file) {
				var res;
				if (skip) {
					return null;
				}
				res = (fm.textMimes[file.mime] || file.mime.indexOf('text/') === 0 || $.inArray(file.mime, cnt === 1? mimesSingle : mimes) !== -1) 
					&& file.mime.indexOf('text/rtf')
					&& (!self.onlyMimes.length || $.inArray(file.mime, self.onlyMimes) !== -1)
					&& file.read && file.write
					&& (cnt === 1 || (file.mime === mime && file.name.substr(ext.length * -1) === ext))
					&& fm.uploadMimeCheck(file.mime, file.phash)? file : null;
				if (!res) {
					skip = true;
				}
				return res;
			});
		},
		
		/**
		 * Open dialog with textarea to edit file
		 *
		 * @param  String  id       dialog id
		 * @param  Object  file     file object
		 * @param  String  content  file content
		 * @return $.Deferred
		 **/
		dialog = function(id, file, content, encoding, editor) {

			var dfrd = $.Deferred(),
				save = function() {
					var encord = selEncoding? selEncoding.val():void(0),
						conf;
					ta.one('_savefail', function() {
						ta.off('_savedone');
						dialogNode.show().find('button.elfinder-btncnt-0,button.elfinder-btncnt-1').hide();
					}).one('_savedone', function() {
						ta.off('_savefail');
					});
					if (ta.editor) {
						ta.editor.save(ta[0], ta.editor.instance);
						conf = ta.editor.confObj;
						if (conf.info && conf.info.schemeContent) {
							encord = 'scheme';
						}
					}
					old = getContent();
					dfrd.notifyWith(ta, [encord, ta.data('hash')]);
				},
				cancel = function() {
					ta.elfinderdialog('close');
				},
				savecl = function() {
					ta.one('_savedone', function() {
						dialogNode.show();
						cancel();
					});
					save();
					dialogNode.hide();
				},
				saveAs = function() {
					var prevOld = old,
						phash = fm.file(file.phash)? file.phash : fm.cwd().hash,
						fail = function() {
							dialogs.fadeIn();
							old = prevOld;
							fm.disable();
							ta.addClass(clsEditing);
						},
						make = function() {
							self.mime = file.mime;
							self.prefix = file.name.replace(/ \d+(\.[^.]+)?$/, '$1');
							self.requestCmd = 'mkfile';
							self.nextAction = { cmd: 'edit', msg: 'cmdedit' };
							self.data = {target : phash};
							$.proxy(fm.res('mixin', 'make'), self)()
								.done(function(data) {
									if (data.added && data.added.length) {
										ta.data('hash', data.added[0].hash);
										save();
										dialogNode.show();
										cancel();
									} else {
										fail();
									}
									dialogs.fadeIn();
								})
								.fail(fail)
								.always(function() {
									delete self.mime;
									delete self.prefix;
									delete self.nextAction;
									delete self.data;
								});
							fm.trigger('unselectfiles', { files: [ file.hash ] });
						},
						reqOpen = null,
						dialogs = fm.getUI().children('.'+dlcls).fadeOut();
					
					ta.removeClass(clsEditing);
					fm.enable();
					
					if (fm.searchStatus.state < 2 && phash !== fm.cwd().hash) {
						reqOpen = fm.exec('open', [phash], {thash: phash});
					}
					
					$.when([reqOpen]).done(function() {
						reqOpen? fm.one('cwdrender', make) : make();
					}).fail(fail);
				},
				changed = function() {
					ta.editor && ta.editor.save(ta[0], ta.editor.instance);
					return  (old !== getContent());
				},
				opts = {
					title   : fm.escape(file.name),
					width   : self.options.dialogWidth || (Math.min(650, $(window).width() * .9)),
					buttons : {},
					maxWidth  : 'window',
					maxHeight : 'window',
					allowMinimize : true,
					allowMaximize : true,
					btnHoverFocus : false,
					closeOnEscape : false,
					close   : function() {
						var close = function(){
							dfrd.resolve();
							ta.editor && ta.editor.close(ta[0], ta.editor.instance);
							ta.elfinderdialog('destroy');
						};
						fm.toggleMaximize($(this).closest('.ui-dialog'), false);
						if (changed()) {
							fm.confirm({
								title  : self.title,
								text   : 'confirmNotSave',
								accept : {
									label    : 'btnSaveClose',
									callback : function() {
										save();
										close();
									}
								},
								cancel : {
									label    : 'btnClose',
									callback : close
								},
								buttons : [{
									label    : 'btnSaveAs',
									callback : function() {
										setTimeout(saveAs, 10);
									}
								}]
							});
						} else {
							close();
						}
					},
					open    : function() {
						var loadRes;
						ta.initEditArea.call(ta, id, file, content, fm);
						old = getContent();
						fm.disable();
						if (ta.editor) {
							loadRes = ta.editor.load(ta[0]) || null;
							if (loadRes && loadRes.done) {
								loadRes.done(function(instance) {
									ta.editor.instance = instance;
									ta.editor.focus(ta[0], ta.editor.instance);
									old = getContent();
								}).fail(function(error) {
									error && fm.error(error);
									ta.elfinderdialog('destroy');
								});
							} else {
								if (loadRes && (typeof loadRes === 'string' || Array.isArray(loadRes))) {
									fm.error(loadRes);
									ta.elfinderdialog('destroy');
									return;
								}
								ta.editor.instance = loadRes;
								ta.editor.focus(ta[0], ta.editor.instance);
								old = getContent();
							}
						}
					},
					resize : function(e, data) {
						ta.editor && ta.editor.resize(ta[0], ta.editor.instance, e, data || {});
					}
				},
				getContent = function() {
					return ta.getContent.call(ta, ta[0]);
				},
				clsEditing = fm.res('class', 'editing'),
				ta, old, dialogNode, selEncoding, extEditor;
				
			if (editor) {
				if (editor.html) {
					ta = $(editor.html);
				}
				extEditor = {
					init     : editor.init || null,
					load     : editor.load,
					getContent : editor.getContent || null,
					save     : editor.save,
					close    : typeof editor.close == 'function' ? editor.close : function() {},
					focus    : typeof editor.focus == 'function' ? editor.focus : function() {},
					resize   : typeof editor.resize == 'function' ? editor.resize : function() {},
					instance : null,
					doSave   : save,
					doCancel : cancel,
					doClose  : savecl,
					file     : file,
					fm       : fm,
					confObj  : editor
				};
			}
			
			if (!ta) {
				if (file.mime.indexOf('text/') !== 0 && !fm.textMimes[file.mime]) {
					return dfrd.reject('errEditorNotFound');
				}
				(function() {
					var stateChange = function() {
							if (selEncoding) {
								if (changed()) {
									selEncoding.attr('title', fm.i18n('saveAsEncoding')).addClass('elfinder-edit-changed');
								} else {
									selEncoding.attr('title', fm.i18n('openAsEncoding')).removeClass('elfinder-edit-changed');
								}
							}
						};
						
					ta = $('<textarea class="elfinder-file-edit" rows="20" id="'+id+'-ta"></textarea>')
						.on('input propertychange', stateChange);
					
					if (!ta.editor || !ta.editor.info || ta.editor.info.useTextAreaEvent) {
						ta.on('keydown', function(e) {
							var code = e.keyCode,
								value, start;
							
							e.stopPropagation();
							if (code == $.ui.keyCode.TAB) {
								e.preventDefault();
								// insert tab on tab press
								if (this.setSelectionRange) {
									value = this.value;
									start = this.selectionStart;
									this.value = value.substr(0, start) + "\t" + value.substr(this.selectionEnd);
									start += 1;
									this.setSelectionRange(start, start);
								}
							}
							
							if (e.ctrlKey || e.metaKey) {
								// close on ctrl+w/q
								if (code == 'Q'.charCodeAt(0) || code == 'W'.charCodeAt(0)) {
									e.preventDefault();
									cancel();
								}
								if (code == 'S'.charCodeAt(0)) {
									e.preventDefault();
									save();
								}
							}
							
						})
						.on('mouseenter', function(){this.focus();});
					}

					ta.initEditArea = function(id, file, content) {
						var heads = (encoding && encoding !== 'unknown')? [{value: encoding}] : [];
						ta.val(content);
						if (content === '' || ! encoding || encoding !== 'UTF-8') {
							heads.push({value: 'UTF-8'});
						}
						selEncoding = getEncSelect(heads).on('touchstart', function(e) {
							// for touch punch event handler
							e.stopPropagation();
						}).on('change', function() {
							// reload to change encoding if not edited
							if (! changed() && getContent() !== '') {
								cancel();
								edit(file, $(this).val(), editor);
							}
						}).on('mouseover', stateChange);
						ta.parent().prev().find('.elfinder-titlebar-button:last')
							.after($('<span class="elfinder-titlebar-button-right"/>').append(selEncoding));
						
						//fm.disable();
						ta.focus(); 
						ta[0].setSelectionRange && ta[0].setSelectionRange(0, 0);
					};
				})();
			}
			
			ta.addClass(clsEditing).data('hash', file.hash);
			
			if (extEditor) {
				ta.editor = extEditor;
				if (typeof extEditor.init === 'function') {
					ta.initEditArea = extEditor.init;
				}
				
				if (typeof extEditor.getContent === 'function') {
					ta.getContent = extEditor.getContent;
				}
			}
			
			if (! ta.initEditArea) {
				ta.initEditArea = function() {};
			}
			
			if (! ta.getContent) {
				ta.getContent = function() {
					return rtrim(ta.val());
				};
			}
			
			opts.buttons[fm.i18n('btnSave')]      = save;
			opts.buttons[fm.i18n('btnSaveClose')] = savecl;
			opts.buttons[fm.i18n('btnSaveAs')]    = saveAs;
			opts.buttons[fm.i18n('btnCancel')]    = cancel;
			
			dialogNode = fm.dialog(ta, opts)
				.attr('id', id)
				.on('keydown keyup keypress', function(e) {
					e.stopPropagation();
				})
				.css({ overflow: 'hidden', minHeight: '7em' })
				.closest('.ui-dialog').addClass(dlcls);
			
			return dfrd.promise();
		},
		
		/**
		 * Get file content and
		 * open dialog with textarea to edit file content
		 *
		 * @param  String  file hash
		 * @return jQuery.Deferred
		 **/
		edit = function(file, conv, editor) {
			var hash   = file.hash,
				opts   = fm.options,
				dfrd   = $.Deferred(), 
				id     = 'edit-'+fm.namespace+'-'+file.hash,
				d      = fm.getUI().find('#'+id),
				conv   = !conv? 0 : conv,
				req, error;
			
			
			if (d.length) {
				d.elfinderdialog('toTop');
				return dfrd.resolve();
			}
			
			if (!file.read || !file.write) {
				error = ['errOpen', file.name, 'errPerm'];
				fm.error(error);
				return dfrd.reject(error);
			}
			
			if (editor && editor.info && editor.info.urlAsContent) {
				req = $.Deferred();
				fm.url(hash, { async: true, temporary: true }).done(function(url) {
					req.resolve({content: url});
				});
			} else {
				req = fm.request({
					data           : {cmd : 'get', target : hash, conv : conv, _t : file.ts},
					options        : {type: 'get', cache : true},
					notify         : {type : 'file', cnt : 1},
					preventDefault : true
				});
			}
			
			req.done(function(data) {
				var selEncoding, reg, m;
				if (data.doconv) {
					fm.confirm({
						title  : self.title,
						text   : data.doconv === 'unknown'? 'confirmNonUTF8' : 'confirmConvUTF8',
						accept : {
							label    : 'btnConv',
							callback : function() {  
								dfrd = edit(file, selEncoding.val(), editor);
							}
						},
						cancel : {
							label    : 'btnCancel',
							callback : function() { dfrd.reject(); }
						},
						optionsCallback : function(options) {
							options.create = function() {
								var base = $('<div class="elfinder-dialog-confirm-encoding"/>'),
									head = {value: data.doconv},
									detected;
								
								if (data.doconv === 'unknown') {
									head.caption = '-';
								}
								selEncoding = getEncSelect([head]);
								$(this).next().find('.ui-dialog-buttonset')
									.prepend(base.append($('<label>'+fm.i18n('encoding')+' </label>').append(selEncoding)));
							}
						}
					});
				} else {
					if (fm.textMimes[file.mime] || file.mime.indexOf('text/') === 0) {
						reg = new RegExp('^(data:'+file.mime.replace(/([.+])/g, '\\$1')+';base64,)', 'i');
						if (window.atob && (m = data.content.match(reg))) {
							data.content = atob(data.content.substr(m[1].length));
						}
					}
					dialog(id, file, data.content, data.encoding, editor)
						.done(function(data) {
							dfrd.resolve(data);
						})
						.progress(function(encoding, newHash) {
							var ta = this;
							if (newHash) {
								hash = newHash;
							}
							fm.request({
								options : {type : 'post'},
								data : {
									cmd     : 'put',
									target  : hash,
									encoding : encoding || data.encoding,
									content : ta.getContent.call(ta, ta[0])
								},
								notify : {type : 'save', cnt : 1},
								syncOnFail : true,
								preventFail : true,
								navigate : {
									target : 'changed',
									toast : {
										inbuffer : {msg: fm.i18n(['complete', fm.i18n('btnSave')])}
									}
								}
							})
							.fail(function(error) {
								dfrd.reject(error);
								ta.trigger('_savefail');
							})
							.done(function(data) {
								setTimeout(function(){
									ta.focus();
									ta.editor && ta.editor.focus(ta[0], ta.editor.instance);
								}, 50);
								ta.trigger('_savedone');
							});
						})
						.fail(function(error) {
							dfrd.reject(error);
						});
				}
			})
			.fail(function(error) {
				var err = Array.isArray(error)? error[0] : error;
				(err !== 'errConvUTF8') && fm.sync();
				dfrd.reject(error);
			});

			return dfrd.promise();
		},
		
		/**
		 * Current editors of selected files
		 * 
		 * @type Object
		 */
		editors = {},
		
		/**
		 * Set current editors
		 * 
		 * @param  Object  file object
		 * @param  Number  cnt  count of selected items
		 * @return Void
		 */
		setEditors = function(file, cnt) {
			var mimeMatch = function(fileMime, editorMimes){
					editorMimes = editorMimes || texts.concat('text/');
					if ($.inArray(fileMime, editorMimes) !== -1 ) {
						return true;
					}
					var i, l;
					l = editorMimes.length;
					for (i = 0; i < l; i++) {
						if (fileMime.indexOf(editorMimes[i]) === 0) {
							return true;
						}
					}
					return false;
				},
				extMatch = function(fileName, editorExts){
					if (!editorExts || !editorExts.length) {
						return true;
					}
					var ext = fileName.replace(/^.+\.([^.]+)|(.+)$/, '$1$2').toLowerCase(),
					i, l;
					l = editorExts.length;
					for (i = 0; i < l; i++) {
						if (ext === editorExts[i].toLowerCase()) {
							return true;
						}
					}
					return false;
				};
			
			editors = {};
			$.each(self.options.editors || [], function(i, editor) {
				var name;
				if ((cnt === 1 || !editor.info || !editor.info.single)
						&& mimeMatch(file.mime, editor.mimes || null)
						&& extMatch(file.name, editor.exts || null)
						&& typeof editor.load == 'function'
						&& typeof editor.save == 'function') {
					
					name = editor.info && editor.info.name? editor.info.name : ('Editor ' + i);
					editors[name] = editor;
				}
			});
		};
	
	
	this.shortcuts = [{
		pattern     : 'ctrl+e'
	}];
	
	this.init = function() {
		var self = this,
			fm   = this.fm,
			opts = this.options;
		
		this.onlyMimes = this.options.mimes || [];
		
		// editors setup
		if (opts.editors && Array.isArray(opts.editors)) {
			$.each(opts.editors, function(i, editor) {
				if (editor.setup && typeof editor.setup === 'function') {
					editor.setup.call(editor, opts, fm);
				}
				if (!editor.disabled) {
					if (editor.mimes && Array.isArray(editor.mimes)) {
						mimesSingle = mimesSingle.concat(editor.mimes);
						if (!editor.info || !editor.info.single) {
							mimes = mimes.concat(editor.mimes);
						}
					}
				}
			});
			
			mimesSingle = ($.uniqueSort || $.unique)(mimesSingle);
			mimes = ($.uniqueSort || $.unique)(mimes);
			
			opts.editors = $.map(opts.editors, function(e) {
				return e.disabled? null : e;
			});
		}
		
		fm.one('open', function() {
			texts = fm.res('mimes', 'text') || [];
		})
		.bind('select', function() {
			if (self.enabled()) {
				setEditors(fm.file(fm.selected()[0]), fm.selected().length);
				if (Object.keys(editors).length > 1) {
					self.variants = [];
					$.each(editors, function(name, editor) {
						self.variants.push([{ editor: editor }, fm.i18n(name), editor.info && editor.info.iconImg? fm.baseUrl + editor.info.iconImg : 'edit']);
					});
				} else {
					delete self.variants;
				}
			}
		});
	};
	
	this.getstate = function(sel) {
		var sel = this.files(sel),
			cnt = sel.length;

		return cnt && filter(sel).length == cnt ? 0 : -1;
	};
	
	this.exec = function(hashes, opts) {
		var fm    = this.fm, 
			files = filter(this.files(hashes)),
			hashes = $.map(files, function(f) { return f.hash; }),
			list  = [],
			editor = opts && opts.editor? opts.editor : null,
			node = $(opts && opts._currentNode? opts._currentNode : $('#'+ fm.cwdHash2Id(hashes[0]))),
			getEditor = function() {
				var dfd = $.Deferred(),
					subMenuRaw;
				
				if (!editor && Object.keys(editors).length > 1) {
					subMenuRaw = [];
					$.each(editors, function(name, ed) {
						subMenuRaw.push(
							{
								label    : fm.escape(name),
								icon     : ed.info && ed.info.icon? ed.info.icon : 'edit',
								options  : { iconImg: ed.info && ed.info.iconImg? fm.baseUrl + ed.info.iconImg : void(0) },
								callback : function() {
									dfd.resolve(ed);
								}
							}		
						);
					});
					fm.trigger('contextmenu', {
						raw: subMenuRaw,
						x: node.offset().left,
						y: node.offset().top,
						opened: function() {
							fm.one('closecontextmenu',function() {
								setTimeout(function() {
									if (dfd.state() === 'pending') {
										dfd.reject();
									}
								}, 10);
							});
						}
					});
					
					fm.trigger('selectfiles', {files : hashes});
					
					return dfd;
				} else {
					return dfd.resolve(editor? editor : (Object.keys(editors).length? editors[Object.keys(editors)[0]] : null));
				}
			},
			dfrd = $.Deferred(),
			file;

		if (!node.length) {
			node = fm.getUI('cwd');
		}
		
		getEditor().done(function(editor) {
			while ((file = files.shift())) {
				list.push(edit(file, void(0), editor).fail(function(error) {
					error && fm.error(error);
				}));
			}
			
			if (list.length) { 
				$.when.apply(null, list).done(function() {
					dfrd.resolve();
				}).fail(function() {
					dfrd.reject();
				});
			} else {
				dfrd.reject();
			}
		}).fail(function() {
			dfrd.reject();
		});
		
		return dfrd;
	};

};
