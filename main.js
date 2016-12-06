"use strict";
(function(){
	var i18nFolderMsgs = {},
		rootPath = './demo',
		// jQuery and jQueryUI version
		jqver = '3.1.1',
		uiver = '1.12.1',
		// Detect language (optional)
		lang = (function() {
			var locq = window.location.search,
				fullLang, locm, lang;
			if (locq && (locm = locq.match(/lang=([a-zA-Z_-]+)/))) {
				// detection by url query (?lang=xx)
				fullLang = locm[1];
			} else {
				// detection by browser language
				fullLang = (navigator.browserLanguage || navigator.language || navigator.userLanguage);
			}
			lang = fullLang.substr(0,2);
			if (lang === 'ja') lang = 'jp';
			else if (lang === 'pt') lang = 'pt_BR';
			else if (lang === 'ug') lang = 'ug_CN';
			else if (lang === 'zh') lang = (fullLang.substr(0,5) === 'zh-tw')? 'zh_TW' : 'zh_CN';
			return lang;
		})(),
		
		// elFinder options (REQUIRED)
		// Documentation for client options:
		// https://github.com/Studio-42/elFinder/wiki/Client-configuration-options
		opts = {
			url : '//hypweb.net/elFinder-nightly/demo/2.1/php/connector.minimal.php',
			soundPath: './demo/sounds',
			sync: 5000,
			ui	: ['toolbar', 'places', 'tree', 'path', 'stat'],
			commandsOptions : {
				quicklook : {
					googleDocsMimes : ['application/pdf', 'image/tiff', 'application/vnd.ms-office', 'application/msword', 'application/vnd.ms-word', 'application/vnd.ms-excel', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
				},
				edit : {
					editors : [
						{
							// ACE Editor
							// `mimes` is not set for support everything kind of text file
							load : function(textarea) {
								var self = this,
									dfrd = $.Deferred(),
									cdn  = '//cdnjs.cloudflare.com/ajax/libs/ace/1.2.5',
									init = function() {
										if (typeof ace === 'undefined') {
											self.fm.loadScript([
												cdn+'/ace.js',
												cdn+'/ext-modelist.js',
												cdn+'/ext-settings_menu.js',
												cdn+'/ext-language_tools.js'
											], start);
										} else {
											start();
										}
									},
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

										// set basePath of ace
										ace.config.set('basePath', cdn);

										// set base height
										taBase.height(taBase.height());

										// detect mode
										mode = ace.require('ace/ext/modelist').getModeForPath('/' + self.file.name).name;
										if (mode === 'text') {
											if (mimeMode[self.file.mime]) {
												mode = mimeMode[self.file.mime];
											}
										}

										// show MIME:mode in title bar
										taBase.prev().children('.elfinder-dialog-title').append(' (' + self.file.mime + ' : ' + mode.split(/[\/\\]/).pop() + ')');

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
											})
										)
										.prependTo(taBase.next());

										// Base node of Ace editor
										editorBase = $('<div id="'+id+'" style="width:100%; height:100%;"/>').text(ta.val()).insertBefore(ta.hide());

										// Ace editor configure
										ta.data('ace', true);
										editor = ace.edit(id);
										ace.require('ace/ext/language_tools');
										ace.require('ace/ext/settings_menu').init(editor);
										editor.$blockScrolling = Infinity;
										editor.setOptions({
											theme: 'ace/theme/monokai',
											mode: 'ace/mode/' + mode,
											fontSize: '14px',
											wrap: true,
											enableBasicAutocompletion: true,
											enableSnippets: true,
											enableLiveAutocompletion: false
										});
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

										dfrd.resolve(editor);
									};

								// init & start
								init();

								return dfrd;
							},
							close : function(textarea, instance) {
								if (instance) {
									instance.destroy();
									$(textarea).show();
								}
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
						}
					]
				}
			},
			handlers : {
				init : function(e, fm) {
					$.extend(fm.messages, i18nFolderMsgs.en, i18nFolderMsgs[fm.lang] || {});
				}
			},
			lang: lang
		},
		
		// Start elFinder (REQUIRED)
		start = function(elFinder, lang) {
			// load jQueryUI CSS
			elFinder.prototype.loadCss('//cdnjs.cloudflare.com/ajax/libs/jqueryui/'+uiver+'/themes/smoothness/jquery-ui.css');
			
			$(function() {
				// Optional for Japanese decoder "extras/encoding-japanese.min"
				if (window.Encoding && Encoding.convert) {
					elFinder.prototype._options.rawStringDecoder = function(s) {
						return Encoding.convert(s,{to:'UNICODE',type:'string'});
					};
				}
				// Make elFinder (REQUIRED)
				$('#elfinder').elfinder(opts);
			});
		},
		
		// JavaScript loader (REQUIRED)
		load = function() {
			require(
				[
					'elfinder'
					, 'i18nfmsg'
					, (lang !== 'en')? 'elfinder.lang' : null    // load detected language
					, 'extras/quicklook.googledocs'                    // optional GoogleDocs preview
					, (lang === 'jp')? 'extras/encoding-japanese.min' : null // optional Japanese decoder for archive preview
					, 'elfinderBasicAuth'
					, xdr
				],
				function(elFinder, i18nfmsg) {
					i18nFolderMsgs = i18nfmsg;
					start(elFinder, lang);
				},
				function(error) {
					alert(error.message);
				}
			);
		},
		
		// is IE8? for determine the jQuery version to use (optional)
		ie8 = (typeof window.addEventListener === 'undefined' && typeof document.getElementsByClassName === 'undefined'),
		xhr, xdr = null;

	// load jquery.xdr.js for old IE
	if (typeof document.uniqueID != 'undefined') {
		var xhr = new XMLHttpRequest();
		if (!('withCredentials' in xhr)) {
			xdr = 'jquery.xdr';
		}
		xhr = null;
	}

	// config of RequireJS (REQUIRED)
	require.config({
		baseUrl : rootPath+'/js',
		paths : {
			'jquery'   : '//cdnjs.cloudflare.com/ajax/libs/jquery/'+(ie8? '1.12.4' : jqver)+'/jquery.min',
			'jquery-ui': '//cdnjs.cloudflare.com/ajax/libs/jqueryui/'+uiver+'/jquery-ui.min',
			'elfinder' : 'elfinder.min',
			'elfinder.lang': [
				'i18n/elfinder.'+lang,
				'i18n/elfinder.fallback'
			],
			'i18nfmsg' : '../../i18nFolderMsgs',
			'jquery.xdr': '../xdr/jquery.xdr'
		},
		shim : {
			'jquery.xdr': {
				deps: ['jquery']
			}
		},
		waitSeconds : 10 // optional
	});

	// load JavaScripts (REQUIRED)
	load();

})();
