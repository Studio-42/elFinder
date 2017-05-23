"use strict";
(function(){
	var i18nFolderMsgs = {},
		rootPath = './demo',
		// jQuery and jQueryUI version
		jqver = '3.2.1',
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
			else if (lang === 'zh') lang = (fullLang.substr(0,5).toLowerCase() === 'zh-tw')? 'zh_TW' : 'zh_CN';
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
					binMimeRegex : /^image\/(?:jpeg|png)/,
					editors : [
						{
							// Adobe Creative SDK Creative Tools Image Editor UI
							// MIME types to accept
							mimes : ['image/jpeg', 'image/png'],
							// HTML of this editor
							html : '<div style="width:100%;height:300px;text-align:center;"><img/></div>',
							// Initialization of editing node
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
										var btns = node.closest('.elfinder-dialog').find('button');
										btns.prop('disabled', !done)[done? 'removeClass' : 'addClass']('ui-state-disabled');
										node.css('opacity', done? '' : '0.3');
										spnr[done? 'hide' : 'show']();
										return node;
									});
							},
							// Get data uri scheme
							getContent : function() {
								return $(this).children('img').attr('src');
							},
							// Launch Aviary Feather editor when dialog open
							load : function(base) {
								var self = this,
									fm = this.fm,
									node = $(base).children('img'),
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
											apiKey: '6e62687b643a413cbb6aedf72ced95e3',
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
									featherEditor, container;
								
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
										}).hide().appendTo('body');
										$(window).on('resize', function() {
											container.css('height', $(window).height());
										});
									}
									fm.loadScript(['https://dme0ih8comzn4.cloudfront.net/imaging/v3/editor.js'], function() {
										init(launch);
									});
								} else {
									container = $('#elfinder-aviary-container');
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
									node = $(base).children('img');
								if (node.attr('src').substr(0, 5) !== 'data:') {
									node.attr('src', imgBase64(node));
								}
							}
						},
						{
							// ACE Editor
							// `mimes` is not set for support everything kind of text file
							load : function(textarea) {
								var self = this,
									dfrd = $.Deferred(),
									cdn  = '//cdnjs.cloudflare.com/ajax/libs/ace/1.2.6',
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
				$('#elfinder').elfinder(opts).elfinder('instance')
					.one('cssloaded', function(e, fm) {
						fm.getUI().css('background-image', 'none');
					});;
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
