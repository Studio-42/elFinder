/**
 * @class elFinder command "edit". 
 * Edit text file in dialog window
 *
 * @author Dmitry (dio) Levashov, dio@std42.ru
 **/
elFinder.prototype.commands.edit = function() {
	"use strict";
	var self  = this,
		fm    = this.fm,
		clsEditing = fm.res('class', 'editing'),
		mimesSingle = [],
		mimes = [],
		allowAll = false,
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
		getDlgWidth = function() {
			var m, width;
			if (typeof self.options.dialogWidth === 'string' && (m = self.options.dialogWidth.match(/(\d+)%/))) {
				width = parseInt(fm.getUI().width() * (m[1] / 100));
			} else {
				width = parseInt(self.options.dialogWidth || 650);
			}
			return Math.min(width, $(window).width());
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
			return $.grep(files, function(file) {
				var res;
				if (skip || file.mime === 'directory') {
					return false;
				}
				res = file.read
					&& (allowAll || fm.mimeIsText(file.mime) || $.inArray(file.mime, cnt === 1? mimesSingle : mimes) !== -1) 
					&& (!self.onlyMimes.length || $.inArray(file.mime, self.onlyMimes) !== -1)
					&& (cnt === 1 || (file.mime === mime && file.name.substr(ext.length * -1) === ext))
					&& (fm.uploadMimeCheck(file.mime, file.phash)? true : false)
					&& setEditors(file, cnt)
					&& Object.keys(editors).length;
				if (!res) {
					skip = true;
				}
				return res;
			});
		},

		fileSync = function(hash) {
			var old = fm.file(hash),
				f;
			fm.request({
				cmd: 'info',
				targets: [hash],
				preventDefault: true
			}).done(function(data) {
				var changed;
				if (data && data.files && data.files.length) {
					f = data.files[0];
					if (old.ts != f.ts || old.size != f.size) {
						changed = { changed: [ f ] };
						fm.updateCache(changed);
						fm.change(changed);
					}
				}
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
				_loaded = false,
				loaded = function() {
					if (!_loaded) {
						fm.toast({
							mode: 'warning',
							msg: fm.i18n('nowLoading')
						});
						return false;
					}
					return true;
				},
				save = function() {
					var encord = selEncoding? selEncoding.val():void(0),
						saveDfd = $.Deferred().fail(function(err) {
							dialogNode.show().find('button.elfinder-btncnt-0,button.elfinder-btncnt-1').hide();
						}),
						conf, res;
					if (!loaded()) {
						return saveDfd.resolve();
					}
					if (ta.editor) {
						ta.editor.save(ta[0], ta.editor.instance);
						conf = ta.editor.confObj;
						if (conf.info && (conf.info.schemeContent || conf.info.arrayBufferContent)) {
							encord = 'scheme';
						}
					}
					res = getContent();
					setOld(res);
					if (res.promise) {
						res.done(function(data) {
							dfrd.notifyWith(ta, [encord, ta.data('hash'), old, saveDfd]);
						}).fail(function(err) {
							saveDfd.reject(err);
						});
					} else {
						dfrd.notifyWith(ta, [encord, ta.data('hash'), old, saveDfd]);
					}
					return saveDfd;
				},
				saveon = function() {
					if (!loaded()) { return; }
					save().fail(function(err) {
						err && fm.error(err);
					});
				},
				cancel = function() {
					ta.elfinderdialog('close');
				},
				savecl = function() {
					if (!loaded()) { return; }
					save().done(function() {
						_loaded = false;
						dialogNode.show();
						cancel();
					}).fail(function(err) {
						dialogNode.show();
						err && fm.error(err);
					});
					dialogNode.hide();
				},
				saveAs = function() {
					if (!loaded()) { return; }
					var prevOld = old,
						phash = fm.file(file.phash)? file.phash : fm.cwd().hash,
						fail = function(err) {
							dialogs.addClass(clsEditing).fadeIn(function() {
								err && fm.error(err);
							});
							old = prevOld;
							fm.disable();
						},
						make = function() {
							self.mime = saveAsFile.mime || file.mime;
							self.prefix = (saveAsFile.name || file.name).replace(/ \d+(\.[^.]+)?$/, '$1');
							self.requestCmd = 'mkfile';
							self.nextAction = {};
							self.data = {target : phash};
							$.proxy(fm.res('mixin', 'make'), self)()
								.done(function(data) {
									if (data.added && data.added.length) {
										ta.data('hash', data.added[0].hash);
										save().done(function() {
											_loaded = false;
											dialogNode.show();
											cancel();
											dialogs.fadeIn();
										}).fail(fail);
									} else {
										fail();
									}
								})
								.progress(function(err) {
									if (err && err === 'errUploadMime') {
										ta.trigger('saveAsFail');
									}
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
						dialogs = fm.getUI().children('.' + self.dialogClass + ':visible');
						if (dialogNode.is(':hidden')) {
							dialogs = dialogs.add(dialogNode);
						}
						dialogs.removeClass(clsEditing).fadeOut();
					
					fm.enable();
					
					if (fm.searchStatus.state < 2 && phash !== fm.cwd().hash) {
						reqOpen = fm.exec('open', [phash], {thash: phash});
					}
					
					$.when([reqOpen]).done(function() {
						reqOpen? fm.one('cwdrender', make) : make();
					}).fail(fail);
				},
				changed = function() {
					var dfd = $.Deferred(),
						res, tm;
					if (!_loaded) {
						return dfd.resolve(false);
					}
					ta.editor && ta.editor.save(ta[0], ta.editor.instance);
					res = getContent();
					if (res && res.promise) {
						tm = setTimeout(function() {
							fm.notify({
								type : 'chkcontent',
								cnt : 1,
								hideCnt: true
							});
						}, 100);
						res.always(function() {
							tm && clearTimeout(tm);
							fm.notify({ type : 'chkcontent', cnt: -1 });
						}).done(function(d) {
							dfd.resolve(old !== d);
						}).fail(function(err) {
							dfd.resolve(err || true);
						});
					} else {
						dfd.resolve(old !== res);
					}
					return dfd;
				},
				opts = {
					title   : fm.escape(file.name),
					width   : getDlgWidth(),
					buttons : {},
					cssClass  : clsEditing,
					maxWidth  : 'window',
					maxHeight : 'window',
					allowMinimize : true,
					allowMaximize : true,
					openMaximized : editorMaximized() || (editor && editor.info && editor.info.openMaximized),
					btnHoverFocus : false,
					closeOnEscape : false,
					propagationEvents : ['mousemove', 'mouseup', 'click'],
					minimize : function() {
						var conf;
						if (ta.editor && dialogNode.closest('.ui-dialog').is(':hidden')) {
							conf = ta.editor.confObj;
							if (conf.info && conf.info.syncInterval) {
								fileSync(file.hash);
							}
						}
					},
					close   : function() {
						var close = function() {
								var conf;
								dfrd.resolve();
								if (ta.editor) {
									ta.editor.close(ta[0], ta.editor.instance);
									conf = ta.editor.confObj;
									if (conf.info && conf.info.syncInterval) {
										fileSync(file.hash);
									}
								}
								ta.elfinderdialog('destroy');
							},
							onlySaveAs = (typeof saveAsFile.name !== 'undefined'),
							accept = onlySaveAs? {
								label    : 'btnSaveAs',
								callback : function() {
									requestAnimationFrame(saveAs);
								}
							} : {
								label    : 'btnSaveClose',
								callback : function() {
									save().done(function() {
										close();
									});
								}
							};
						changed().done(function(change) {
							var msgs = ['confirmNotSave'];
							if (change) {
								if (typeof change === 'string') {
									msgs.unshift(change);
								}
								fm.confirm({
									title  : self.title,
									text   : msgs,
									accept : accept,
									cancel : {
										label    : 'btnClose',
										callback : close
									},
									buttons : onlySaveAs? null : [{
										label    : 'btnSaveAs',
										callback : function() {
											requestAnimationFrame(saveAs);
										}
									}]
								});
							} else {
								close();
							}
						});
					},
					open    : function() {
						var loadRes, conf, interval;
						ta.initEditArea.call(ta, id, file, content, fm);
						if (ta.editor) {
							loadRes = ta.editor.load(ta[0]) || null;
							if (loadRes && loadRes.done) {
								loadRes.always(function() {
									_loaded = true;
								}).done(function(instance) {
									ta.editor.instance = instance;
									ta.editor.focus(ta[0], ta.editor.instance);
									setOld(getContent());
									requestAnimationFrame(function() {
										dialogNode.trigger('resize');
									});
								}).fail(function(error) {
									error && fm.error(error);
									ta.elfinderdialog('destroy');
									return;
								});
							} else {
								_loaded = true;
								if (loadRes && (typeof loadRes === 'string' || Array.isArray(loadRes))) {
									fm.error(loadRes);
									ta.elfinderdialog('destroy');
									return;
								}
								ta.editor.instance = loadRes;
								ta.editor.focus(ta[0], ta.editor.instance);
								setOld(getContent());
								requestAnimationFrame(function() {
									dialogNode.trigger('resize');
								});
							}
							conf = ta.editor.confObj;
							if (conf.info && conf.info.syncInterval) {
								if (interval = parseInt(conf.info.syncInterval)) {
									setTimeout(function() {
										autoSync(interval);
									}, interval);
								}
							}
						} else {
							_loaded = true;
							setOld(getContent());
						}
					},
					resize : function(e, data) {
						ta.editor && ta.editor.resize(ta[0], ta.editor.instance, e, data || {});
					}
				},
				getContent = function() {
					return ta.getContent.call(ta, ta[0]);
				},
				setOld = function(res) {
					if (res && res.promise) {
						res.done(function(d) {
							old = d;
						});
					} else {
						old = res;
					}
				},
				autoSync = function(interval) {
					if (dialogNode.is(':visible')) {
						fileSync(file.hash);
						setTimeout(function() {
							autoSync(interval);
						}, interval);
					}
				},
				saveAsFile = {},
				ta, old, dialogNode, selEncoding, extEditor, maxW, syncInterval;
				
			if (editor) {
				if (editor.html) {
					ta = $(editor.html);
				}
				extEditor = {
					init     : editor.init || null,
					load     : editor.load,
					getContent : editor.getContent || null,
					save     : editor.save,
					beforeclose : typeof editor.beforeclose == 'function' ? editor.beforeclose : void 0,
					close    : typeof editor.close == 'function' ? editor.close : function() {},
					focus    : typeof editor.focus == 'function' ? editor.focus : function() {},
					resize   : typeof editor.resize == 'function' ? editor.resize : function() {},
					instance : null,
					doSave   : saveon,
					doCancel : cancel,
					doClose  : savecl,
					file     : file,
					fm       : fm,
					confObj  : editor,
					trigger  : function(evName, data) {
						fm.trigger('editEditor' + evName, Object.assign({}, editor.info || {}, data));
					}
				};
			}
			
			if (!ta) {
				if (!fm.mimeIsText(file.mime)) {
					return dfrd.reject('errEditorNotFound');
				}
				(function() {
					var stateChange = function() {
							if (selEncoding) {
								changed().done(function(change) {
									if (change) {
										selEncoding.attr('title', fm.i18n('saveAsEncoding')).addClass('elfinder-edit-changed');
									} else {
										selEncoding.attr('title', fm.i18n('openAsEncoding')).removeClass('elfinder-edit-changed');
									}
								});
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
									saveon();
								}
							}
							
						})
						.on('mouseenter', function(){this.focus();});
					}

					ta.initEditArea = function(id, file, content) {
						var heads = (encoding && encoding !== 'unknown')? [{value: encoding}] : [],
							wfake = $('<select/>').hide(),
							setSelW = function(init) {
								init && wfake.appendTo(selEncoding.parent());
								wfake.empty().append($('<option/>').text(selEncoding.val()));
								selEncoding.width(wfake.width());
							};
						// ta.hide() for performance tune. Need ta.show() in `load()` if use textarea node.
						ta.hide().val(content);
						if (content === '' || ! encoding || encoding !== 'UTF-8') {
							heads.push({value: 'UTF-8'});
						}
						selEncoding = getEncSelect(heads).on('touchstart', function(e) {
							// for touch punch event handler
							e.stopPropagation();
						}).on('change', function() {
							// reload to change encoding if not edited
							changed().done(function(change) {
								if (! change && getContent() !== '') {
									cancel();
									edit(file, selEncoding.val(), editor).fail(function(err) { err && fm.error(err); });
								}
							});
							setSelW();
						}).on('mouseover', stateChange);
						ta.parent().next().prepend($('<div class="ui-dialog-buttonset elfinder-edit-extras"/>').append(selEncoding));
						setSelW(true);
					};
				})();
			}
			
			ta.data('hash', file.hash);
			
			if (extEditor) {
				ta.editor = extEditor;
				
				if (typeof extEditor.beforeclose === 'function') {
					opts.beforeclose = function() {
						return extEditor.beforeclose(ta[0], extEditor.instance);
					};
				}
				
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
			
			if (!editor || !editor.info || !editor.info.preventGet) {
				opts.buttons[fm.i18n('btnSave')]      = saveon;
				opts.buttons[fm.i18n('btnSaveClose')] = savecl;
				opts.buttons[fm.i18n('btnSaveAs')]    = saveAs;
				opts.buttons[fm.i18n('btnCancel')]    = cancel;
			}
			
			if (editor && typeof editor.prepare === 'function') {
				editor.prepare(ta, opts, file);
			}
			
			dialogNode = self.fmDialog(ta, opts)
				.attr('id', id)
				.on('keydown keyup keypress', function(e) {
					e.stopPropagation();
				})
				.css({ overflow: 'hidden', minHeight: '7em' })
				.addClass('elfinder-edit-editor')
				.closest('.ui-dialog')
				.on('changeType', function(e, data) {
					if (data.extention && data.mime) {
						var ext = data.extention,
							mime = data.mime,
							btnSet = $(this).children('.ui-dialog-buttonpane').children('.ui-dialog-buttonset');
						btnSet.children('.elfinder-btncnt-0,.elfinder-btncnt-1').hide();
						saveAsFile.name = fm.splitFileExtention(file.name)[0] + '.' + data.extention;
						saveAsFile.mime = data.mime;
						if (!data.keepEditor) {
							btnSet.children('.elfinder-btncnt-2').trigger('click');
						}
					}
				});
			
			// care to viewport scale change with mobile devices
			maxW = (fm.options.dialogContained? elfNode : $(window)).width();
			(dialogNode.width() > maxW) && dialogNode.width(maxW);
			
			return dfrd.promise();
		},
		
		/**
		 * Get file content and
		 * open dialog with textarea to edit file content
		 *
		 * @param  String  file hash
		 * @return jQuery.Deferred
		 **/
		edit = function(file, convert, editor) {
			var hash   = file.hash,
				opts   = fm.options,
				dfrd   = $.Deferred(), 
				id     = 'edit-'+fm.namespace+'-'+file.hash,
				d      = fm.getUI().find('#'+id),
				conv   = !convert? 0 : convert,
				noContent = false,
				req, error, res;
			
			
			if (d.length) {
				d.elfinderdialog('toTop');
				return dfrd.resolve();
			}
			
			if (!file.read || (!file.write && (!editor.info || !editor.info.converter))) {
				error = ['errOpen', file.name, 'errPerm'];
				return dfrd.reject(error);
			}
			
			if (editor && editor.info) {
				if (typeof editor.info.edit === 'function') {
					res = editor.info.edit.call(fm, file, editor);
					if (res.promise) {
						res.done(function() {
							dfrd.resolve();
						}).fail(function(error) {
							dfrd.reject(error);
						});
					} else {
						res? dfrd.resolve() : dfrd.reject();
					}
					return dfrd;
				}

				noContent = editor.info.preventGet || editor.info.noContent;
				if (editor.info.urlAsContent || noContent) {
					req = $.Deferred();
					if (editor.info.urlAsContent) {
						fm.url(hash, { async: true, onetime: true, temporary: true }).done(function(url) {
							req.resolve({content: url});
						});
					} else {
						req.resolve({});
					}
				} else {
					req = fm.request({
						data           : {cmd : 'get', target : hash, conv : conv, _t : file.ts},
						options        : {type: 'get', cache : true},
						notify         : {type : 'file', cnt : 1},
						preventDefault : true
					});
				}

				req.done(function(data) {
					var selEncoding, reg, m, res;
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
								};
							}
						});
					} else {
						if (!noContent && fm.mimeIsText(file.mime)) {
							reg = new RegExp('^(data:'+file.mime.replace(/([.+])/g, '\\$1')+';base64,)', 'i');
							if (!editor.info.dataScheme) {
								if (window.atob && (m = data.content.match(reg))) {
									data.content = atob(data.content.substr(m[1].length));
								}
							} else {
								if (window.btoa && !data.content.match(reg)) {
									data.content = 'data:'+file.mime+';base64,'+btoa(data.content);
								}
							}
						}
						dialog(id, file, data.content, data.encoding, editor)
							.done(function(data) {
								dfrd.resolve(data);
							})
							.progress(function(encoding, newHash, data, saveDfd) {
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
										content : data
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
									saveDfd.reject();
								})
								.done(function(data) {
									requestAnimationFrame(function(){
										ta.trigger('focus');
										ta.editor && ta.editor.focus(ta[0], ta.editor.instance);
									});
									saveDfd.resolve();
								});
							})
							.fail(function(error) {
								dfrd.reject(error);
							});
					}
				})
				.fail(function(error) {
					var err = fm.parseError(error);
					err = Array.isArray(err)? err[0] : err;
					(err !== 'errConvUTF8') && fm.sync();
					dfrd.reject(error);
				});
			}

			return dfrd.promise();
		},
		
		/**
		 * Current editors of selected files
		 * 
		 * @type Object
		 */
		editors = {},
		
		/**
		 * Fallback editor (Simple text editor)
		 * 
		 * @type Object
		 */
		fallbackEditor = {
			// Simple Text (basic textarea editor)
			info : {
				id : 'textarea',
				name : 'TextArea',
				useTextAreaEvent : true
			},
			load : function(textarea) {
				// trigger event 'editEditorPrepare'
				this.trigger('Prepare', {
					node: textarea,
					editorObj: void(0),
					instance: void(0),
					opts: {}
				});
				textarea.setSelectionRange && textarea.setSelectionRange(0, 0);
				$(textarea).trigger('focus').show();
			},
			save : function(){}
		},

		/**
		 * Set current editors
		 * 
		 * @param  Object  file object
		 * @param  Number  cnt  count of selected items
		 * @return Void
		 */
		setEditors = function(file, cnt) {
			var mimeMatch = function(fileMime, editorMimes){
					if (!editorMimes) {
						return fm.mimeIsText(fileMime);
					} else {
						if (editorMimes[0] === '*' || $.inArray(fileMime, editorMimes) !== -1) {
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
					}
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
				},
				optEditors = self.options.editors || [],
				cwdWrite = fm.cwd().write;
			
			stored = fm.storage('storedEditors') || {};
			editors = {};
			if (!optEditors.length) {
				optEditors = [fallbackEditor];
			}
			$.each(optEditors, function(i, editor) {
				var name;
				if ((cnt === 1 || !editor.info.single)
						&& ((!editor.info || !editor.info.converter)? file.write : cwdWrite)
						&& (file.size > 0 || (!editor.info.converter && editor.info.canMakeEmpty !== false && fm.mimesCanMakeEmpty[file.mime]))
						&& (!editor.info.maxSize || file.size <= editor.info.maxSize)
						&& mimeMatch(file.mime, editor.mimes || null)
						&& extMatch(file.name, editor.exts || null)
						&& typeof editor.load == 'function'
						&& typeof editor.save == 'function') {
					
					name = editor.info.name? editor.info.name : ('Editor ' + i);
					editor.id = editor.info.id? editor.info.id : ('editor' + i),
					editor.name = name;
					editor.i18n = fm.i18n(name);
					editors[editor.id] = editor;
				}
			});
			return Object.keys(editors).length? true : false;
		},
		store = function(mime, editor) {
			if (mime && editor) {
				if (!$.isPlainObject(stored)) {
					stored = {};
				}
				stored[mime] = editor.id;
				fm.storage('storedEditors', stored);
				fm.trigger('selectfiles', {files : fm.selected()});
			}
		},
		useStoredEditor = function() {
			var d = fm.storage('useStoredEditor');
			return d? (d > 0) : self.options.useStoredEditor;
		},
		editorMaximized = function() {
			var d = fm.storage('editorMaximized');
			return d? (d > 0) : self.options.editorMaximized;
		},
		getSubMenuRaw = function(files, callback) {
			var subMenuRaw = [];
			$.each(editors, function(id, ed) {
				subMenuRaw.push(
					{
						label    : fm.escape(ed.i18n),
						icon     : ed.info && ed.info.icon? ed.info.icon : 'edit',
						options  : { iconImg: ed.info && ed.info.iconImg? fm.baseUrl + ed.info.iconImg : void(0) },
						callback : function() {
							store(files[0].mime, ed);
							callback && callback.call(ed);
						}
					}		
				);
			});
			return subMenuRaw;
		},
		getStoreId = function(name) {
			// for compatibility to previous version
			return name.toLowerCase().replace(/ +/g, '');
		},
		getStoredEditor = function(mime) {
			var name = stored[mime];
			return name && Object.keys(editors).length? editors[getStoreId(name)] : void(0);
		},
		infoRequest = function() {

		},
		stored;
	
	
	this.shortcuts = [{
		pattern     : 'ctrl+e'
	}];
	
	this.init = function() {
		var self = this,
			fm   = this.fm,
			opts = this.options,
			cmdChecks = [],
			ccData, dfd;
		
		this.onlyMimes = this.options.mimes || [];
		
		fm.one('open', function() {
			// editors setup
			if (opts.editors && Array.isArray(opts.editors)) {
				fm.trigger('canMakeEmptyFile', {mimes: Object.keys(fm.storage('mkfileTextMimes') || {}).concat(opts.makeTextMimes || ['text/plain'])});
				$.each(opts.editors, function(i, editor) {
					if (editor.info && editor.info.cmdCheck) {
						cmdChecks.push(editor.info.cmdCheck);
					}
				});
				if (cmdChecks.length) {
					if (fm.api >= 2.1030) {
						dfd = fm.request({
							data : {
								cmd: 'editor',
								name: cmdChecks,
								method: 'enabled'
							},
							preventDefault : true
						}).done(function(d) {
							ccData = d;
						}).fail(function() {
							ccData = {};
						});
					} else {
						ccData = {};
						dfd = $.Deferred().resolve();
					}
				} else {
					dfd = $.Deferred().resolve();
				}
				
				dfd.always(function() {
					if (ccData) {
						opts.editors = $.grep(opts.editors, function(e) {
							if (e.info && e.info.cmdCheck) {
								return ccData[e.info.cmdCheck]? true : false;
							} else {
								return true;
							}
						});
					}
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
							if (!allowAll && editor.mimes && editor.mimes[0] === '*') {
								allowAll = true;
							}
							if (!editor.info) {
								editor.info = {};
							}
							if (editor.info.integrate) {
								fm.trigger('helpIntegration', Object.assign({cmd: 'edit'}, editor.info.integrate));
							}
							if (editor.info.canMakeEmpty) {
								fm.trigger('canMakeEmptyFile', {mimes: Array.isArray(editor.info.canMakeEmpty)? editor.info.canMakeEmpty : editor.mimes});
							}
						}
					});
					
					mimesSingle = ($.uniqueSort || $.unique)(mimesSingle);
					mimes = ($.uniqueSort || $.unique)(mimes);
					
					opts.editors = $.grep(opts.editors, function(e) {
						return e.disabled? false : true;
					});
				});
			}
		})
		.bind('select', function() {
			editors = null;
		})
		.bind('contextmenucreate', function(e) {
			var file, editor,
				single = function(editor) {
					var title = self.title;
					fm.one('contextmenucreatedone', function() {
						self.title = title;
					});
					self.title = fm.escape(editor.i18n);
					if (editor.info && editor.info.iconImg) {
						self.contextmenuOpts = {
							iconImg: fm.baseUrl + editor.info.iconImg
						};
					}
					delete self.variants;
				};
			
			self.contextmenuOpts = void(0);
			if (e.data.type === 'files' && self.enabled()) {
				file = fm.file(e.data.targets[0]);
				if (setEditors(file, e.data.targets.length)) {
					if (Object.keys(editors).length > 1) {
						if (!useStoredEditor() || !(editor = getStoredEditor(file.mime))) {
							delete self.extra;
							self.variants = [];
							$.each(editors, function(id, editor) {
								self.variants.push([{ editor: editor }, editor.i18n, editor.info && editor.info.iconImg? fm.baseUrl + editor.info.iconImg : 'edit']);
							});
						} else {
							single(editor);
							self.extra = {
								icon: 'menu',
								node: $('<span/>')
									.attr({title: fm.i18n('select')})
									.on('click touchstart', function(e){
										if (e.type === 'touchstart' && e.originalEvent.touches.length > 1) {
											return;
										}
										var node = $(this);
										e.stopPropagation();
										e.preventDefault();
										fm.trigger('contextmenu', {
											raw: getSubMenuRaw(fm.selectedFiles(), function() {
												var hashes = fm.selected();
												fm.exec('edit', hashes, {editor: this});
												fm.trigger('selectfiles', {files : hashes});
											}),
											x: node.offset().left,
											y: node.offset().top
										});
									})
							};
						}
					} else {
						single(editors[Object.keys(editors)[0]]);
						delete self.extra;
					}
				}
			}
		})
		.bind('canMakeEmptyFile', function(e) {
			if (e.data && e.data.resetTexts) {
				var defs = fm.arrayFlip(self.options.makeTextMimes || ['text/plain']),
					hides = self.getMkfileHides();

				$.each((fm.storage('mkfileTextMimes') || {}), function(mime, type) {
					if (!defs[mime]) {
						delete fm.mimesCanMakeEmpty[mime];
						delete hides[mime];
					}
				});
				fm.storage('mkfileTextMimes', null);
				if (Object.keys(hides).length) {
					fm.storage('mkfileHides', hides);
				} else {
					fm.storage('mkfileHides', null);
				}
			}
		});
	};
	
	this.getstate = function(select) {
		var sel = this.files(select),
			cnt = sel.length;

		return cnt && filter(sel).length == cnt ? 0 : -1;
	};
	
	this.exec = function(select, opts) {
		var fm    = this.fm, 
			files = filter(this.files(select)),
			hashes = $.map(files, function(f) { return f.hash; }),
			list  = [],
			editor = opts && opts.editor? opts.editor : null,
			node = $(opts && opts._currentNode? opts._currentNode : fm.cwdHash2Elm(hashes[0])),
			getEditor = function() {
				var dfd = $.Deferred(),
					storedId;
				
				if (!editor && Object.keys(editors).length > 1) {
					if (useStoredEditor() && (editor = getStoredEditor(files[0].mime))) {
						return dfd.resolve(editor);
					}
					fm.trigger('contextmenu', {
						raw: getSubMenuRaw(files, function() {
							dfd.resolve(this);
						}),
						x: node.offset().left,
						y: node.offset().top + 22,
						opened: function() {
							fm.one('closecontextmenu',function() {
								requestAnimationFrame(function() {
									if (dfd.state() === 'pending') {
										dfd.reject();
									}
								});
							});
						}
					});
					
					fm.trigger('selectfiles', {files : hashes});
					
					return dfd;
				} else {
					Object.keys(editors).length > 1 && editor && store(files[0].mime, editor);
					return dfd.resolve(editor? editor : (Object.keys(editors).length? editors[Object.keys(editors)[0]] : null));
				}
			},
			dfrd = $.Deferred(),
			file;

		if (editors === null) {
			setEditors(files[0], hashes.length);
		}
		
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

	this.getMkfileHides = function() {
		return fm.storage('mkfileHides') || fm.arrayFlip(self.options.mkfileHideMimes || []);
	};

};
