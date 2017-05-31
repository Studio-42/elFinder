(function(editors, elFinder) {
	if (typeof define === 'function' && define.amd) {
		define(['elfinder'], editors);
	} else if (elFinder) {
		var optEditors = elFinder.prototype._options.commandsOptions.edit.editors;
		elFinder.prototype._options.commandsOptions.edit.editors = optEditors.concat(editors(elFinder));
	}
}(function(elFinder) {
	var // get query of getfile
		getfile = window.location.search.match(/getfile=([a-z]+)/),
		// cdns location
		cdns = {
			ace        : '//cdnjs.cloudflare.com/ajax/libs/ace/1.2.6',
			codemirror : '//cdnjs.cloudflare.com/ajax/libs/codemirror/5.26.0',
			ckeditor   : '//cdnjs.cloudflare.com/ajax/libs/ckeditor/4.7.0',
			tinymce    : '//cdnjs.cloudflare.com/ajax/libs/tinymce/4.6.3'
		};
	
	// check getfile callback function
	if (getfile) {
		getfile = getfile[1];
		if (getfile === 'ckeditor') {
			elFinder.prototype._options.getFileCallback = function(file, fm) {
				window.opener.CKEDITOR.tools.callFunction((function() {
					var reParam = new RegExp('(?:[\?&]|&amp;)CKEditorFuncNum=([^&]+)', 'i'),
						match = window.location.search.match(reParam);
					return (match && match.length > 1) ? match[1] : '';
				})(), fm.convAbsUrl(file.url));
				fm.destroy();
				window.close();
			};
		} else if (getfile === 'tinymce') {
			elFinder.prototype._options.getFileCallback = function(file, fm) {
				// pass selected file data to TinyMCE
				parent.tinymce.activeEditor.windowManager.getParams().oninsert(file, fm);
				// close popup window
				parent.tinymce.activeEditor.windowManager.close();
			};
		}
	}
	
	// return editors Array
	return [
		{
			// Adobe Creative SDK Creative Tools Image Editor UI
			// MIME types to accept
			info : {
				name : 'Creative Cloud'
			},
			mimes : ['image/jpeg', 'image/png'],
			// HTML of this editor
			html : '<div style="width:100%;height:300px;text-align:center;"><img/></div>',
			// called on initialization of elFinder cmd edit (this: this editor's config object)
			setup : function(opts, fm) {
				if (!opts.extraOptions || !opts.extraOptions.creativeCloudApiKey) {
					this.disabled = true;
				} else {
					this.apiKey = opts.extraOptions.creativeCloudApiKey;
				}
			},
			// Initialization of editing node (this: this editors HTML node)
			init : function(id, file, content, fm) {
				var node = $(this).children('img:first'),
					spnr = $('<div/>')
						.css({
							position: 'absolute',
							top: '50%',
							textAlign: 'center',
							width: '100%',
							fontSize: '16pt'
						})
						.html(fm.i18n('ntfloadimg'))
						.hide()
						.appendTo(this);
				
				node.data('mime', file.mime)
					.attr('id', id+'-img')
					.attr('src', content)
					.css({'height':'', 'max-width':'100%', 'max-height':'100%', 'cursor':'pointer'})
					.data('loading', function(done) {
						var btns = node.closest('.elfinder-dialog').find('button,.elfinder-titlebar-button');
						btns.prop('disabled', !done)[done? 'removeClass' : 'addClass']('ui-state-disabled');
						node.css('opacity', done? '' : '0.3');
						spnr[done? 'hide' : 'show']();
						return node;
					});
			},
			// Get data uri scheme (this: this editors HTML node)
			getContent : function() {
				return $(this).children('img:first').attr('src');
			},
			// Launch Aviary Feather editor when dialog open
			load : function(base) {
				var self = this,
					fm = this.fm,
					node = $(base).children('img:first'),
					elfNode = fm.getUI(),
					dfrd = $.Deferred(),
					init = function(onload) {
						var getLang = function() {
								var langMap = {
									'jp' : 'ja',
									'zh_TW' : 'zh_HANT',
									'zh_CN' : 'zh_HANS'
								};
								return langMap[fm.lang]? langMap[fm.lang] : fm.lang;
							};
						node.on('click', launch).data('loading')();
						featherEditor = new Aviary.Feather({
							apiKey: self.confObj.apiKey,
							onSave: function(imageID, newURL) {
								featherEditor.showWaitIndicator();
								node.on('load error', function() {
										node.data('loading')(true);
									})
									.attr('crossorigin', 'anonymous')
									.attr('src', newURL)
									.data('loading')();
								featherEditor.close();
							},
							onLoad: onload || function(){},
							onClose: function() { $(container).hide(); },
							appendTo: container.get(0),
							maxSize: 2048,
							language: getLang()
						});
						// return editor instance
						dfrd.resolve(featherEditor);
					},
					launch = function() {
						$(container).show();
						featherEditor.launch({
							image: node.attr('id'),
							url: node.attr('src')
						});
						node.data('loading')(true);
					},
					featherEditor, container, extraOpts;
				
				// Cancel editing with IE8
				if (fm.UA.ltIE8) {
					return dfrd.reject('IE8 does not supported.');
				}
				
				// load script then init
				if (typeof Aviary === 'undefined') {
					if (!(container = $('#elfinder-aviary-container')).length) {
						container = $('<div id="elfinder-aviary-container" class="ui-front"/>').css({
							position: 'fixed',
							top: 0,
							right: 0,
							width: '100%',
							height: $(window).height(),
							overflow: 'auto'
						}).hide().appendTo(elfNode.hasClass('elfinder-fullscreen')? elfNode : 'body');
						// fit to window size
						$(window).on('resize', function() {
							container.css('height', $(window).height());
						});
						// bind switch fullscreen event
						elfNode.on('resize', function(e, data) {
							data && data.fullscreen && container.appendTo(data.fullscreen === 'on'? elfNode : 'body');
						});
					}
					fm.loadScript(['https://dme0ih8comzn4.cloudfront.net/imaging/v3/editor.js'], function() {
						init(launch);
					});
				} else {
					container = $('#elfinder-aviary-container');
					// always moves to last
					container.appendTo(container.parent());
					init();
					launch();
				}
				return dfrd;
			},
			// Convert content url to data uri scheme to save content
			save : function(base) {
				var imgBase64 = function(node) {
						var style = node.attr('style'),
							img, canvas, ctx;
						// reset css for getting image size
						node.attr('style', '');
						// img node
						img = node.get(0);
						// New Canvas
						canvas = document.createElement('canvas');
						canvas.width  = img.width;
						canvas.height = img.height;
						// restore css
						node.attr('style', style);
						// Draw Image
						canvas.getContext('2d').drawImage(img, 0, 0);
						// To Base64
						return canvas.toDataURL(node.data('mime'));
					},
					node = $(base).children('img:first');
				if (node.attr('src').substr(0, 5) !== 'data:') {
					node.attr('src', imgBase64(node));
				}
			}
		},
		{
			// ACE Editor
			// `mimes` is not set for support everything kind of text file
			info : {
				name : 'ACE Editor'
			},
			load : function(textarea) {
				var self = this,
					dfrd = $.Deferred(),
					cdn  = cdns.ace,
					start = function() {
						var editor, editorBase, mode,
						ta = $(textarea),
						taBase = ta.parent(),
						dialog = taBase.parent(),
						id = textarea.id + '_ace',
						ext = self.file.name.replace(/^.+\.([^.]+)|(.+)$/, '$1$2').toLowerCase(),
						// MIME/mode map
						mimeMode = {
							'text/x-php'			  : 'php',
							'application/x-php'		  : 'php',
							'text/html'				  : 'html',
							'application/xhtml+xml'	  : 'html',
							'text/javascript'		  : 'javascript',
							'application/javascript'  : 'javascript',
							'text/css'				  : 'css',
							'text/x-c'				  : 'c_cpp',
							'text/x-csrc'			  : 'c_cpp',
							'text/x-chdr'			  : 'c_cpp',
							'text/x-c++'			  : 'c_cpp',
							'text/x-c++src'			  : 'c_cpp',
							'text/x-c++hdr'			  : 'c_cpp',
							'text/x-shellscript'	  : 'sh',
							'application/x-csh'		  : 'sh',
							'text/x-python'			  : 'python',
							'text/x-java'			  : 'java',
							'text/x-java-source'	  : 'java',
							'text/x-ruby'			  : 'ruby',
							'text/x-perl'			  : 'perl',
							'application/x-perl'	  : 'perl',
							'text/x-sql'			  : 'sql',
							'text/xml'				  : 'xml',
							'application/docbook+xml' : 'xml',
							'application/xml'		  : 'xml'
						};

						// set base height
						taBase.height(taBase.height());

						// set basePath of ace
						ace.config.set('basePath', cdn);

						// Base node of Ace editor
						editorBase = $('<div id="'+id+'" style="width:100%; height:100%;"/>').text(ta.val()).insertBefore(ta.hide());

						// Editor flag
						ta.data('ace', true);

						// Aceeditor instance
						editor = ace.edit(id);

						// Ace editor configure
						editor.$blockScrolling = Infinity;
						editor.setOptions({
							theme: 'ace/theme/monokai',
							fontSize: '14px',
							wrap: true,
						});
						ace.config.loadModule('ace/ext/modelist', function() {
							// detect mode
							mode = ace.require('ace/ext/modelist').getModeForPath('/' + self.file.name).name;
							if (mode === 'text') {
								if (mimeMode[self.file.mime]) {
									mode = mimeMode[self.file.mime];
								}
							}
							// show MIME:mode in title bar
							taBase.prev().children('.elfinder-dialog-title').append(' (' + self.file.mime + ' : ' + mode.split(/[\/\\]/).pop() + ')');
							editor.setOptions({
								mode: 'ace/mode/' + mode
							});
						});
						ace.config.loadModule('ace/ext/language_tools', function() {
							ace.require('ace/ext/language_tools');
							editor.setOptions({
								enableBasicAutocompletion: true,
								enableSnippets: true,
								enableLiveAutocompletion: false
							});
						});
						ace.config.loadModule('ace/ext/settings_menu', function() {
							ace.require('ace/ext/settings_menu').init(editor);
						});
						
						// Short cuts
						editor.commands.addCommand({
							name : "saveFile",
							bindKey: {
								win : 'Ctrl-s',
								mac : 'Command-s'
							},
							exec: function(editor) {
								self.doSave();
							}
						});
						editor.commands.addCommand({
							name : "closeEditor",
							bindKey: {
								win : 'Ctrl-w|Ctrl-q',
								mac : 'Command-w|Command-q'
							},
							exec: function(editor) {
								self.doCancel();
							}
						});

						editor.resize();

						// TextArea button and Setting button
						$('<div class="ui-dialog-buttonset"/>').css('float', 'left')
						.append(
							$('<button>TextArea</button>')
							.button()
							.on('click', function(){
								if (ta.data('ace')) {
									ta.removeData('ace');
									editorBase.hide();
									ta.val(editor.session.getValue()).show().focus();
									$(this).text('AceEditor');
								} else {
									ta.data('ace', true);
									editorBase.show();
									editor.setValue(ta.hide().val(), -1);
									editor.focus();
									$(this).text('TextArea');
								}
							})
						)
						.append(
							$('<button>Ace editor setting</button>')
							.button({
								icons: {
									primary: 'ui-icon-gear',
									secondary: 'ui-icon-triangle-1-e'
								},
								text: false
							})
							.on('click', function(){
								editor.showSettingsMenu();
								$('#ace_settingsmenu')
									.css('font-size', '80%')
									.find('div[contains="setOptions"]').hide().end()
									.parent().parent().appendTo($('#elfinder'));
							})
						)
						.prependTo(taBase.next());

						dfrd.resolve(editor);
					};

				// check ace & start
				if (typeof ace === 'undefined') {
					self.fm.loadScript([ cdn+'/ace.js' ], start, void 0, {obj: window, name: 'ace'});
				} else {
					start();
				}

				return dfrd;
			},
			save : function(textarea, instance) {
				instance && $(textarea).data('ace') && (textarea.value = instance.session.getValue());
			},
			focus : function(textarea, instance) {
				instance && $(textarea).data('ace') && instance.focus();
			},
			resize : function(textarea, instance, e, data) {
				instance && instance.resize();
			}
		},
		{
			// CodeMirror
			// `mimes` is not set for support everything kind of text file
			info : {
				name : 'CodeMirror'
			},
			load : function(textarea) {
				var cmUrl = cdns.codemirror,
					useRequire = (typeof define === 'function' && define.amd),
					dfrd = $.Deferred(),
					self = this,
					start = function() {
						var CodeMirror = this.CodeMirror,
							ta   = $(textarea),
							base = ta.parent(),
							editorBase;
						
						// set base height
						base.height(base.height());
						
						// CodeMirror configure
						editor = CodeMirror.fromTextArea(textarea, {
							lineNumbers: true,
							lineWrapping: true
						});
						
						// return editor instance
						dfrd.resolve(editor);
						
						// Auto mode set
						var info, m, mode, spec;
						if (! info) {
							info = CodeMirror.findModeByMIME(self.file.mime);
						}
						if (! info && (m = self.file.name.match(/.+\.([^.]+)$/))) {
							info = CodeMirror.findModeByExtension(m[1]);
						}
						if (info) {
							CodeMirror.modeURL = useRequire? 'codemirror/mode/%N/%N.min' : cmUrl + '/mode/%N/%N.min.js';
							mode = info.mode;
							spec = info.mime;
							editor.setOption('mode', spec);
							CodeMirror.autoLoadMode(editor, mode);
							// show MIME:mode in title bar
							base.prev().children('.elfinder-dialog-title').append(' (' + spec + ' : ' + mode + ')');
						}
						
						// editor base node
						editorBase = $(editor.getWrapperElement());
						ta.data('cm', true);
						
						// fit height to base
						editorBase.height('100%');
						
						// TextArea button and Setting button
						$('<div class="ui-dialog-buttonset"/>').css('float', 'left')
						.append(
							$('<button>TextArea</button>')
							.button()
							.on('click', function(){
								if (ta.data('cm')) {
									ta.removeData('cm');
									editorBase.hide();
									ta.val(editor.getValue()).show().focus();
									$(this).text('CodeMirror');
								} else {
									ta.data('cm', true);
									editorBase.show();
									editor.setValue(ta.hide().val());
									editor.refresh();
									editor.focus();
									$(this).text('TextArea');
								}
							})
						)
						.prependTo(base.next());
					};
				// load script then start
				if (!this.CodeMirror) {
					if (useRequire) {
						require.config({
							packages: [{
								name: 'codemirror',
								location: cmUrl,
								main: 'codemirror.min'
							}],
							map: {
								'codemirror': {
									'codemirror/lib/codemirror': 'codemirror'
								}
							}
						});
						require([
							'codemirror',
							'codemirror/addon/mode/loadmode.min',
							'codemirror/mode/meta.min'
						], function(CodeMirror) {
							this.CodeMirror = CodeMirror;
							start();
						});
					} else {
						self.fm.loadScript([
							cmUrl + '/codemirror.min.js',
							cmUrl + '/addon/mode/loadmode.min.js',
							cmUrl + '/mode/meta.min.js'
						], function() {
							this.CodeMirror = CodeMirror;
							start();
						});
					}
					self.fm.loadCss(cmUrl + '/codemirror.css');
				} else {
					start();
				}
				
				return dfrd;
			},
			close : function(textarea, instance) {
				instance && instance.toTextArea();
			},
			save : function(textarea, instance) {
				instance && $(textarea).data('cm') && (textarea.value = instance.getValue());
			},
			focus : function(textarea, instance) {
				instance && $(textarea).data('cm') && instance.focus();
			},
			resize : function(textarea, instance, e, data) {
				instance && instance.refresh();
			}
		},
		{
			// CKEditor for html file
			info : {
				name : 'CKEditor'
			},
			exts  : ['htm', 'html', 'xhtml'],
			setup : function(opts, fm) {
				if (opts.extraOptions && opts.extraOptions.managerUrl) {
					this.managerUrl = opts.extraOptions.managerUrl;
				}
			},
			load : function(textarea) {
				var self = this,
					fm   = this.fm,
					dfrd = $.Deferred(),
					init = function() {
						var base = $(textarea).parent(),
							dlg = base.closest('.elfinder-dialog'),
							h = base.height(),
							reg = /([&?]getfile=)[^&]+/,
							loc = self.confObj.managerUrl || window.location.href.replace(/#.*$/, ''),
							name = 'ckeditor';
						
						// make manager location
						if (reg.test(loc)) {
							loc = loc.replace(reg, '$1' + name);
						} else {
							loc += '?getfile=' + name;
						}
						// set base height
						base.height(h);
						// CKEditor configure
						CKEDITOR.replace(textarea.id, {
							startupFocus : true,
							fullPage: true,
							allowedContent: true,
							filebrowserBrowseUrl : loc,
							on: {
								'instanceReady' : function(e) {
									var editor = e.editor;
									editor.resize('100%', h);
									// re-build on dom move
									dlg.one('beforedommove.'+fm.namespace, function() {
										editor.destroy();
									}).one('dommove.'+fm.namespace, function() {
										self.load(textarea).done(function(editor) {
											self.instance = editor;
										});
									});
									// return editor instance
									dfrd.resolve(e.editor);
								}
							}
						});
					};
				if (typeof CKEDITOR === 'undefined') {
					$.getScript(cdns.ckeditor + '/ckeditor.js', init);
				} else {
					init();
				}
				return dfrd;
			},
			close : function(textarea, instance) {
				instance && instance.destroy();
			},
			save : function(textarea, instance) {
				instance && (textarea.value = instance.getData());
			},
			focus : function(textarea, instance) {
				instance && instance.focus();
			},
			resize : function(textarea, instance, e, data) {
				var self;
				if (instance) {
					if (instance.status === 'ready') {
						instance.resize('100%', $(textarea).parent().height());
					}
				}
			}
		},
		{
			// TinyMCE for html file
			info : {
				name : 'TinyMCE'
			},
			exts  : ['htm', 'html', 'xhtml'],
			setup : function(opts, fm) {
				if (opts.extraOptions && opts.extraOptions.managerUrl) {
					this.managerUrl = opts.extraOptions.managerUrl;
				}
			},
			load : function(textarea) {
				var self = this,
					fm   = this.fm,
					dfrd = $.Deferred(),
					init = function(loaded) {
						var base = $(textarea).parent(),
							dlg = base.closest('.elfinder-dialog'),
							h = base.height(),
							delta = base.outerHeight(true) - h;
						// set base height
						base.height(h);
						// fit height function
						textarea._setHeight = function(h) {
							var base = $(this).parent(),
								h    = h || base.height(),
								ctrH = 0,
								areaH;
							base.find('.mce-container-body:first').children('.mce-toolbar,.mce-toolbar-grp,.mce-statusbar').each(function() {
								ctrH += $(this).outerHeight(true);
							});
							areaH = h - ctrH - delta;
							base.find('.mce-edit-area iframe:first').height(areaH);
							return areaH;
						};
						// TinyMCE configure
						tinymce.init({
							selector: '#' + textarea.id,
							plugins: [
								'fullpage', // require for getting full HTML
								'image', 'link', 'media',
								'code'
							],
							init_instance_callback : function(editor) {
								// fit height on init
								setTimeout(function() {
									textarea._setHeight(h);
								}, loaded? 0 : 500);
								// re-build on dom move
								dlg.one('beforedommove.'+fm.namespace, function() {
									tinymce.execCommand('mceRemoveEditor', false, textarea.id);
								}).one('dommove.'+fm.namespace, function() {
									self.load(textarea).done(function(editor) {
										self.instance = editor;
									});
								});
								// return editor instance
								dfrd.resolve(editor);
							},
							file_picker_callback : function (callback, value, meta) {
								var reg = /([&?]getfile=)[^&]+/,
									loc = self.confObj.managerUrl || window.location.href.replace(/#.*$/, ''),
									name = 'tinymce';
								
								// make manager location
								if (reg.test(loc)) {
									loc = loc.replace(reg, '$1' + name);
								} else {
									loc += '?getfile=' + name;
								}
								// launch TinyMCE
								tinymce.activeEditor.windowManager.open({
									file: loc,
									title: 'elFinder',
									width: 900,	 
									height: 450,
									resizable: 'yes'
								}, {
									oninsert: function (file, elf) {
										var url, reg, info;

										// URL normalization
										url = elf.convAbsUrl(file.url);
										
										// Make file info
										info = file.name + ' (' + elf.formatSize(file.size) + ')';

										// Provide file and text for the link dialog
										if (meta.filetype == 'file') {
											callback(url, {text: info, title: info});
										}

										// Provide image and alt text for the image dialog
										if (meta.filetype == 'image') {
											callback(url, {alt: info});
										}

										// Provide alternative source and posted for the media dialog
										if (meta.filetype == 'media') {
											callback(url);
										}
									}
								});
								return false;
							}
						});
					};
				if (typeof tinymce === 'undefined') {
					$.getScript(cdns.tinymce + '/tinymce.min.js', init);
				} else {
					init(true);
				}
				return dfrd;
			},
			close : function(textarea, instance) {
				instance && tinymce.execCommand('mceRemoveEditor', false, textarea.id);
			},
			save : function(textarea, instance) {
				instance && instance.save();
			},
			focus : function(textarea, instance) {
				instance && instance.focus();
			},
			resize : function(textarea, instance, e, data) {
				// fit height to base node on dialog resize
				textarea._setHeight();
			}
		},
		{
			// Simple Text (basic textarea editor)
			info : {
				name : 'Simple Text'
			},
			load : function(){},
			save : function(){}
		}
	];
}, window.elFinder));
