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
