"use strict";
(function(){
    var i18nFolderMsgs = {},
        rootPath = './demo',
        // jQuery and jQueryUI version
        jqver = '3.7.0',
        uiver = '1.13.2',
        // Detect language (optional)
		lang = (function() {
			var locq = window.location.search,
				map = {
					'pt' : 'pt_BR',
					'ug' : 'ug_CN',
					'zh' : 'zh_CN'
				},
				full = {
					'zh_tw' : 'zh_TW',
					'zh_cn' : 'zh_CN',
					'fr_ca' : 'fr_CA'
				},
				fullLang, locm, lang;
			if (locq && (locm = locq.match(/lang=([a-zA-Z_-]+)/))) {
				// detection by url query (?lang=xx)
				fullLang = locm[1];
			} else {
				// detection by browser language
				fullLang = (navigator.browserLanguage || navigator.language || navigator.userLanguage || '');
			}
			fullLang = fullLang.replace('-', '_').substr(0,5).toLowerCase();
			if (full[fullLang]) {
				lang = full[fullLang];
			} else {
				lang = (fullLang || 'en').substr(0,2);
				if (map[lang]) {
					lang = map[lang];
				}
			}
			return lang;
		})(),
        
        // elFinder options (REQUIRED)
        // Documentation for client options:
        // https://github.com/Studio-42/elFinder/wiki/Client-configuration-options
        opts = {
            url : '//hypweb.net/elFinder-nightly/demo/2.1/php/connector.minimal.php',
            soundPath : './demo/sounds',
            sync : 5000,
            sortType : 'date',
            sortOrder : 'desc',
            sortStickFolders : false,
            themes : {
                'dark-slim'   : 'https://johnfort.github.io/elFinder.themes/dark-slim/manifest.json',
                'mt-darkblue' : 'https://robinn1.github.io/elFinder-Material-Theme/manifests/darkblue.json',
                'mt-gray'     : 'https://robinn1.github.io/elFinder-Material-Theme/manifests/gray.json',
                'mt-light'    : 'https://robinn1.github.io/elFinder-Material-Theme/manifests/light.json',
                'bootstrap'   : 'https://nao-pon.github.io/elfinder-theme-manifests/bootstrap.json',
                'moono'       : 'https://nao-pon.github.io/elfinder-theme-manifests/moono.json',
                'win10'       : 'https://nao-pon.github.io/elfinder-theme-manifests/win10.json'
            },
            ui : ['toolbar', 'places', 'tree', 'path', 'stat'],
            commandsOptions : {
                edit : {
                    extraOptions : {
                        uploadOpts : {
                            dropEvt: {shiftKey: true, ctrlKey: true}
                        },
                        pixo: {
                            apikey: '359qg6hf7t40'
                        },
                        creativeCloudApiKey : '6e62687b643a413cbb6aedf72ced95e3',
                        managerUrl : 'manager.html',
                        tinymce : {
                            imagetools_cors_hosts: ['hypweb.net']
                        }
                    }
                },
                quicklook : {
                    googleMapsApiKey : 'AIzaSyAmQiMcWI1e0QryaAHuGNblqJ9xRE2NXL8',
                    sharecadMimes : ['image/vnd.dwg', 'image/vnd.dxf', 'model/vnd.dwf', 'application/vnd.hp-hpgl', 'application/plt', 'application/step', 'model/iges', 'application/vnd.ms-pki.stl', 'application/sat', 'image/cgm', 'application/x-msmetafile'],
                    googleDocsMimes : ['application/pdf', 'image/tiff', 'application/vnd.ms-office', 'application/msword', 'application/vnd.ms-word', 'application/vnd.ms-excel', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/postscript', 'application/rtf'],
                    officeOnlineMimes : ['application/msword', 'application/vnd.ms-word', 'application/vnd.ms-excel', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.oasis.opendocument.text', 'application/vnd.oasis.opendocument.spreadsheet', 'application/vnd.oasis.opendocument.presentation']
                },
                opennew : {
                    url : 'fullscreen.html'
                }
            },
            parrotHeaders: ['X-elFinder-Token'],
            lang: lang
        },
        
        // Start elFinder (REQUIRED)
        start = function(elFinder, editors, i18nfmsg, extOpts) {
            // donate button
            $('#elfinder-donate-select').hide().find('form').on('submit', function() {
                setTimeout(function() {
                    $('#elfinder-donate-select').hide();
                }, 100);
            });
            $('#elfinder-donate').on('click', function(e) {
                var selbox = $('#elfinder-donate-select');
                e.preventDefault();
                if (selbox.is(':hidden')) {
                    selbox.show();
                } else {
                    selbox.hide();
                }
            });
            
            // load jQueryUI CSS
            //elFinder.prototype.loadCss('//cdnjs.cloudflare.com/ajax/libs/jqueryui/'+uiver+'/themes/smoothness/jquery-ui.css');
	    elFinder.prototype.loadCss('//code.jquery.com/ui/'+uiver+'/themes/smoothness/jquery-ui.css');
            
            $(function() {
                // Optional for Japanese decoder "extras/encoding-japanese.min"
                if (window.Encoding && Encoding.convert) {
                    elFinder.prototype._options.rawStringDecoder = function(s) {
                        return Encoding.convert(s,{to:'UNICODE',type:'string'});
                    };
                }
                
                // editors marges to opts.commandOptions.edit
                opts.commandsOptions.edit.editors = (opts.commandsOptions.edit.editors || []).concat(editors);
                
                Object.assign(opts, extOpts);
                
                i18nFolderMsgs = i18nfmsg;
                
                // Make elFinder (REQUIRED)
                $('#elfinder').elfinder(opts, function(fm, extraObj) {
                    // `init` event callback function
                    fm.bind('init', function() {
                        $.extend(fm.messages, i18nFolderMsgs.en, i18nFolderMsgs[fm.lang] || {});
                        // Optional for Japanese decoder "extras/encoding-japanese.min"
                        delete fm.options.rawStringDecoder;
                        if (fm.lang === 'ja') {
                            require(
                                [ 'extras/encoding-japanese.min' ],
                                function(Encoding) {
                                    if (Encoding && Encoding.convert) {
                                        fm.registRawStringDecoder(function(s) {
                                            return Encoding.convert(s, {to:'UNICODE',type:'string'});
                                        });
                                    }
                                }
                            );
                        }
                        fm.getUI().css('background-image', 'none');
                    });
                    // for example set document.title dynamically.
                    var title = document.title;
                    fm.bind('open', function() {
                        var path = '',
                            cwd  = fm.cwd();
                        if (cwd) {
                            path = fm.path(cwd.hash) || null;
                        }
                        document.title = path? path + ':' + title : title;
                    }).bind('destroy', function() {
                        document.title = title;
                    });
                });
            });
        },
        
        // JavaScript loader (REQUIRED)
        load = function() {
            require(
                [
                    'elfinder'
                    , 'extras/editors.default.min'
                    , 'i18nfmsg'
                    , 'extOpts'
                    , 'extras/quicklook.googledocs.min'                    // optional GoogleDocs preview
                    , 'elfinderBasicAuth'
                    , xdr
                    , 'blockchain'
                ],
                start,
                function(error) {
                    alert(error.message);
                }
            );
        },
        
        // is IE8 or Safari < 6? for determine the jQuery version to use (optional)
        old = (typeof window.addEventListener === 'undefined' && typeof document.getElementsByClassName === 'undefined')
                ||
                  (!window.chrome && !document.unqueID && !window.opera && !window.sidebar && 'WebkitAppearance' in document.documentElement.style && document.body.style && typeof document.body.style.webkitFilter === 'undefined'),
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
            'jquery'   : '//cdnjs.cloudflare.com/ajax/libs/jquery/'+(old? '1.12.4' : jqver)+'/jquery.min',
            //'jquery-ui': '//cdnjs.cloudflare.com/ajax/libs/jqueryui/'+uiver+'/jquery-ui.min',
            'jquery-ui': '//code.jquery.com/ui/'+uiver+'/jquery-ui.min',
            'elfinder' : 'elfinder.min',
            'i18nfmsg' : '../../i18nFolderMsgs',
            'jquery.xdr': '../xdr/jquery.xdr',
            'blockchain': '../../tools/donate-bitcoin/pay-now-button'
        },
        shim : {
            'jquery.xdr': {
                deps: ['jquery']
            },
            'blockchain': {
                deps: ['jquery']
            }
        },
        waitSeconds : 10 // optional
    });

    // load JavaScripts (REQUIRED)
    load();

})();
