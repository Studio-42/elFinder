/**
 * elFinder client options and main script for RequireJS
 *
 * Rename "main.default.js" to "main.js" and edit it if you need configure elFInder options or any things. And use that in elfinder.html.
 * e.g. `<script data-main="./main.js" src="./require.js"></script>`
 **/
(function(){
	"use strict";
	var // jQuery and jQueryUI version
		jqver = '3.6.0',
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
			if (lang === 'pt') lang = 'pt_BR';
			else if (lang === 'ug') lang = 'ug_CN';
			else if (lang === 'zh') lang = (fullLang.substr(0,5).toLowerCase() === 'zh-tw')? 'zh_TW' : 'zh_CN';
			return lang;
		})(),
		
		// Start elFinder (REQUIRED)
		start = function(elFinder, config) {
			// load jQueryUI CSS
			elFinder.prototype.loadCss('//cdnjs.cloudflare.com/ajax/libs/jqueryui/'+uiver+'/themes/smoothness/jquery-ui.css');
			
			$(function() {
				var opts = {};
				
				// Interpretation of "elFinderConfig"
				if (config && config.managers) {
					$.each(config.managers, function(id, mOpts) {
						opts = Object.assign(opts, config.defaultOpts || {});
						// Make elFinder
						$('#' + id).elfinder(
							// 1st Arg - options
							$.extend(true, { lang: lang }, opts, mOpts || {}),
							// 2nd Arg - before boot up function
							function(fm, extraObj) {

							}
						);
					});
				} else {
					alert('"elFinderConfig" object is wrong.');
				}
			});
		},
		
		// JavaScript loader (REQUIRED)
		load = function() {
			require(
				[
					'elfinder'
					, 'elFinderConfig'
				],
				start,
				function(error) {
					alert(error.message);
				}
			);
		},
		
		// is IE8 or :? for determine the jQuery version to use (optional)
		old = (typeof window.addEventListener === 'undefined' && typeof document.getElementsByClassName === 'undefined')
		       ||
		      (!window.chrome && !document.unqueID && !window.opera && !window.sidebar && 'WebkitAppearance' in document.documentElement.style && document.body.style && typeof document.body.style.webkitFilter === 'undefined');

	// config of RequireJS (REQUIRED)
	require.config({
		baseUrl : 'js',
		paths : {
			'jquery'   : '//cdnjs.cloudflare.com/ajax/libs/jquery/'+(old? '1.12.4' : jqver)+'/jquery.min',
			'jquery-ui': '//cdnjs.cloudflare.com/ajax/libs/jqueryui/'+uiver+'/jquery-ui.min',
			'elfinder' : 'elfinder-minimal.min'
		},
		waitSeconds : 10 // optional
	});

	// check elFinderConfig and fallback
	// This part don't used if you are using elfinder.html, see elfinder.html
	if (! require.defined('elFinderConfig')) {
		define('elFinderConfig', {
			// elFinder options (REQUIRED)
			// Documentation for client options:
			// https://github.com/Studio-42/elFinder/wiki/Client-configuration-options
			defaultOpts : {
				url : 'php/connector.minimal.php' // connector URL (REQUIRED)
			},
			managers : {
				'elfinder': {},
			}
		});
	}

	// load JavaScripts (REQUIRED)
	load();

})();
