elFinder.prototype.commands.quicklook.plugins = [
	
	/**
	 * Images preview plugin
	 *
	 * @param elFinder.commands.quicklook
	 **/
	function(ql) {
		"use strict";
		var mimes   = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml', 'image/x-ms-bmp'],
			preview = ql.preview,
			WebP, flipMime;
		
		// webp support
		WebP = new Image();
		WebP.onload = WebP.onerror = function() {
			if (WebP.height == 2) {
				mimes.push('image/webp');
			}
		};
		WebP.src='data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
		
		// what kind of images we can display
		$.each(navigator.mimeTypes, function(i, o) {
			var mime = o.type;
			
			if (mime.indexOf('image/') === 0 && $.inArray(mime, mimes)) {
				mimes.push(mime);
			} 
		});
			
		preview.on(ql.evUpdate, function(e) {
			var fm   = ql.fm,
				file = e.file,
				showed = false,
				dimreq = null,
				setdim  = function(dim) {
					var rfile = fm.file(file.hash);
					rfile.width = dim[0];
					rfile.height = dim[1];
				},
				show = function() {
					var elm, varelm, memSize, width, height, prop;
					
					dimreq && dimreq.state && dimreq.state() === 'pending' && dimreq.reject();
					if (showed) {
						return;
					}
					showed = true;
					
					elm = img.get(0);
					memSize = file.width && file.height? {w: file.width, h: file.height} : (elm.naturalWidth? null : {w: img.width(), h: img.height()});
				
					memSize && img.removeAttr('width').removeAttr('height');
					
					width  = file.width || elm.naturalWidth || elm.width || img.width();
					height = file.height || elm.naturalHeight || elm.height || img.height();
					if (!file.width || !file.height) {
						setdim([width, height]);
					}
					
					memSize && img.width(memSize.w).height(memSize.h);

					prop = (width/height).toFixed(2);
					preview.on('changesize', function() {
						var pw = parseInt(preview.width()),
							ph = parseInt(preview.height()),
							w, h;
					
						if (prop < (pw/ph).toFixed(2)) {
							h = ph;
							w = Math.floor(h * prop);
						} else {
							w = pw;
							h = Math.floor(w/prop);
						}
						img.width(w).height(h).css('margin-top', h < ph ? Math.floor((ph - h)/2) : 0);
					
					})
					.trigger('changesize');
					
					//show image
					img.fadeIn(100);
				},
				hideInfo = function() {
					loading.remove();
					// hide info/icon
					ql.hideinfo();
				},
				url, img, loading, m;

			if (!flipMime) {
				flipMime = fm.arrayFlip(mimes);
			}
			if (flipMime[file.mime] && ql.dispInlineRegex.test(file.mime)) {
				// this is our file - stop event propagation
				e.stopImmediatePropagation();

				loading = $('<div class="elfinder-quicklook-info-data"><span class="elfinder-spinner-text">'+fm.i18n('nowLoading')+'</span><span class="elfinder-spinner"/></div>').appendTo(ql.info.find('.elfinder-quicklook-info'));

				url = fm.openUrl(file.hash);
				
				img = $('<img/>')
					.hide()
					.appendTo(preview)
					.on('load', function() {
						hideInfo();
						show();
					})
					.on('error', function() {
						loading.remove();
					})
					.attr('src', url);
				
				if (file.width && file.height) {
					show();
				} else if (file.size > (ql.options.getDimThreshold || 0)) {
					dimreq = fm.request({
						data : {cmd : 'dim', target : file.hash},
						preventDefault : true
					})
					.done(function(data) {
						if (data.dim) {
							var dim = data.dim.split('x');
							file.width = dim[0];
							file.height = dim[1];
							setdim(dim);
							show();
						}
					});
				}
			}
			
		});
	},
	
	/**
	 * PSD(Adobe Photoshop data) preview plugin
	 *
	 * @param elFinder.commands.quicklook
	 **/
	function(ql) {
		"use strict";
		var fm      = ql.fm,
			mimes   = fm.arrayFlip(['image/vnd.adobe.photoshop', 'image/x-photoshop']),
			preview = ql.preview,
			load    = function(url, img, loading) {
				try {
					fm.replaceXhrSend();
					PSD.fromURL(url).then(function(psd) {
						var prop;
						img.attr('src', psd.image.toBase64());
						requestAnimationFrame(function() {
							prop = (img.width()/img.height()).toFixed(2);
							preview.on('changesize', function() {
								var pw = parseInt(preview.width()),
									ph = parseInt(preview.height()),
									w, h;
							
								if (prop < (pw/ph).toFixed(2)) {
									h = ph;
									w = Math.floor(h * prop);
								} else {
									w = pw;
									h = Math.floor(w/prop);
								}
								img.width(w).height(h).css('margin-top', h < ph ? Math.floor((ph - h)/2) : 0);
							}).trigger('changesize');
							
							loading.remove();
							// hide info/icon
							ql.hideinfo();
							//show image
							img.fadeIn(100);
						});
					}, function() {
						loading.remove();
						img.remove();
					});
					fm.restoreXhrSend();
				} catch(e) {
					fm.restoreXhrSend();
					loading.remove();
					img.remove();
				}
			},
			PSD;
		
		preview.on(ql.evUpdate, function(e) {
			var file = e.file,
				url, img, loading, m,
				_define, _require;

			if (mimes[file.mime] && fm.options.cdns.psd && ! fm.UA.ltIE10 && ql.dispInlineRegex.test(file.mime)) {
				// this is our file - stop event propagation
				e.stopImmediatePropagation();

				loading = $('<div class="elfinder-quicklook-info-data"><span class="elfinder-spinner-text">'+fm.i18n('nowLoading')+'</span><span class="elfinder-spinner"/></div>').appendTo(ql.info.find('.elfinder-quicklook-info'));
				url = fm.openUrl(file.hash);
				if (!fm.isSameOrigin(url)) {
					url = fm.openUrl(file.hash, true);
				}
				img = $('<img/>').hide().appendTo(preview);
				
				if (PSD) {
					load(url, img, loading);
				} else {
					_define = window.define;
					_require = window.require;
					window.require = null;
					window.define = null;
					fm.loadScript(
						[ fm.options.cdns.psd ],
						function() {
							PSD = require('psd');
							_define? (window.define = _define) : (delete window.define);
							_require? (window.require = _require) : (delete window.require);
							load(url, img, loading);
						}
					);
				}
			}
		});
	},
	
	/**
	 * HTML preview plugin
	 *
	 * @param elFinder.commands.quicklook
	 **/
	function(ql) {
		"use strict";
		var fm      = ql.fm,
			mimes   = fm.arrayFlip(['text/html', 'application/xhtml+xml']),
			preview = ql.preview;
			
		preview.on(ql.evUpdate, function(e) {
			var file = e.file, jqxhr, loading;
			
			if (mimes[file.mime] && ql.dispInlineRegex.test(file.mime) && (!ql.options.getSizeMax || file.size <= ql.options.getSizeMax)) {
				e.stopImmediatePropagation();

				loading = $('<div class="elfinder-quicklook-info-data"><span class="elfinder-spinner-text">'+fm.i18n('nowLoading')+'</span><span class="elfinder-spinner"/></div>').appendTo(ql.info.find('.elfinder-quicklook-info'));

				// stop loading on change file if not loaded yet
				preview.one('change', function() {
					jqxhr.state() == 'pending' && jqxhr.reject();
				}).addClass('elfinder-overflow-auto');
				
				jqxhr = fm.request({
					data           : {cmd : 'get', target : file.hash, conv : 1, _t : file.ts},
					options        : {type: 'get', cache : true},
					preventDefault : true
				})
				.done(function(data) {
					ql.hideinfo();
					var doc = $('<iframe class="elfinder-quicklook-preview-html"/>').appendTo(preview)[0].contentWindow.document;
					doc.open();
					doc.write(data.content);
					doc.close();
				})
				.always(function() {
					loading.remove();
				});
			}
		});
	},
	
	/**
	 * MarkDown preview plugin
	 *
	 * @param elFinder.commands.quicklook
	 **/
	function(ql) {
		"use strict";
		var fm      = ql.fm,
			mimes   = fm.arrayFlip(['text/x-markdown']),
			preview = ql.preview,
			marked  = null,
			show = function(data, loading) {
				ql.hideinfo();
				var doc = $('<iframe class="elfinder-quicklook-preview-html"/>').appendTo(preview)[0].contentWindow.document;
				doc.open();
				doc.write(marked(data.content));
				doc.close();
				loading.remove();
			},
			error = function(loading) {
				marked = false;
				loading.remove();
			};
			
		preview.on(ql.evUpdate, function(e) {
			var file = e.file, jqxhr, loading;
			
			if (mimes[file.mime] && fm.options.cdns.marked && marked !== false && ql.dispInlineRegex.test(file.mime) && (!ql.options.getSizeMax || file.size <= ql.options.getSizeMax)) {
				e.stopImmediatePropagation();

				loading = $('<div class="elfinder-quicklook-info-data"><span class="elfinder-spinner-text">'+fm.i18n('nowLoading')+'</span><span class="elfinder-spinner"/></div>').appendTo(ql.info.find('.elfinder-quicklook-info'));

				// stop loading on change file if not loaded yet
				preview.one('change', function() {
					jqxhr.state() == 'pending' && jqxhr.reject();
				}).addClass('elfinder-overflow-auto');
				
				jqxhr = fm.request({
					data           : {cmd : 'get', target : file.hash, conv : 1, _t : file.ts},
					options        : {type: 'get', cache : true},
					preventDefault : true
				})
				.done(function(data) {
					if (marked || window.marked) {
						if (!marked) {
							marked = window.marked;
						}
						show(data, loading);
					} else {
						fm.loadScript([fm.options.cdns.marked],
							function(res) { 
								marked = res || window.marked || false;
								delete window.marked;
								if (marked) {
									show(data, loading);
								} else {
									error(loading);
								}
							},
							{
								tryRequire: true,
								error: function() {
									error(loading);
								}
							}
						);
					}
				})
				.fail(function() {
					error(loading);
				});
			}
		});
	},

	/**
	 * PDF/ODT/ODS/ODP preview with ViewerJS
	 * 
	 * @param elFinder.commands.quicklook
	 */
	 function(ql) {
		if (ql.options.viewerjs) {
			var fm      = ql.fm,
				preview = ql.preview,
				opts    = ql.options.viewerjs,
				mimes   = opts.url? fm.arrayFlip(opts.mimes || []) : [];

			if (opts.url) {
				preview.on('update', function(e) {
					var win  = ql.window,
						file = e.file, node, loading;

					if (mimes[file.mime]) {
						var url = fm.openUrl(file.hash);
						if (url && fm.isSameOrigin(url)) {
							e.stopImmediatePropagation();

							loading = $('<div class="elfinder-quicklook-info-data"><span class="elfinder-spinner-text">'+fm.i18n('nowLoading')+'</span><span class="elfinder-spinner"/></div>').appendTo(ql.info.find('.elfinder-quicklook-info'));

							node = $('<iframe class="elfinder-quicklook-preview-iframe"/>')
								.css('background-color', 'transparent')
								.on('load', function() {
									ql.hideinfo();
									loading.remove();
									node.css('background-color', '#fff');
								})
								.on('error', function() {
									loading.remove();
									node.remove();
								})
								.appendTo(preview)
								.attr('src', opts.url + '#' + url);

							preview.one('change', function() {
								loading.remove();
								node.off('load').remove();
							});
						}
					}
				});
			}
		}
	},

	/**
	 * PDF preview plugin
	 *
	 * @param elFinder.commands.quicklook
	 **/
	function(ql) {
		"use strict";
		var fm      = ql.fm,
			mime    = 'application/pdf',
			preview = ql.preview,
			active  = false,
			urlhash = '',
			firefox, toolbar;
			
		if ((fm.UA.Safari && fm.OS === 'mac' && !fm.UA.iOS) || fm.UA.IE || fm.UA.Firefox) {
			active = true;
		} else {
			$.each(navigator.plugins, function(i, plugins) {
				$.each(plugins, function(i, plugin) {
					if (plugin.type === mime) {
						return !(active = true);
					}
				});
			});
		}

		if (active) {
			if (typeof ql.options.pdfToolbar !== 'undefined' && !ql.options.pdfToolbar) {
				urlhash = '#toolbar=0';
			}
			preview.on(ql.evUpdate, function(e) {
				var file = e.file;
				
				if (active && file.mime === mime && ql.dispInlineRegex.test(file.mime)) {
					e.stopImmediatePropagation();
					ql.hideinfo();
					ql.cover.addClass('elfinder-quicklook-coverbg');
					$('<object class="elfinder-quicklook-preview-pdf" data="'+fm.openUrl(file.hash)+urlhash+'" type="application/pdf" />')
						.on('error', function(e) {
							active = false;
							ql.update(void(0), fm.cwd());
							ql.update(void(0), file);
						})
						.appendTo(preview);
				}
				
			});
		}
	},
	
	/**
	 * Flash preview plugin
	 *
	 * @param elFinder.commands.quicklook
	 **/
	function(ql) {
		"use strict";
		var fm      = ql.fm,
			mime    = 'application/x-shockwave-flash',
			preview = ql.preview,
			active  = false;

		$.each(navigator.plugins, function(i, plugins) {
			$.each(plugins, function(i, plugin) {
				if (plugin.type === mime) {
					return !(active = true);
				}
			});
		});
		
		active && preview.on(ql.evUpdate, function(e) {
			var file = e.file,
				node;
				
			if (file.mime === mime && ql.dispInlineRegex.test(file.mime)) {
				e.stopImmediatePropagation();
				ql.hideinfo();
				node = $('<embed class="elfinder-quicklook-preview-flash" pluginspage="http://www.macromedia.com/go/getflashplayer" src="'+fm.openUrl(file.hash)+'" quality="high" type="application/x-shockwave-flash" wmode="transparent" />')
					.appendTo(preview);
			}
		});
	},
	
	/**
	 * HTML5 audio preview plugin
	 *
	 * @param elFinder.commands.quicklook
	 **/
	function(ql) {
		"use strict";
		var fm       = ql.fm,
			preview  = ql.preview,
			mimes    = {
				'audio/mpeg'    : 'mp3',
				'audio/mpeg3'   : 'mp3',
				'audio/mp3'     : 'mp3',
				'audio/x-mpeg3' : 'mp3',
				'audio/x-mp3'   : 'mp3',
				'audio/x-wav'   : 'wav',
				'audio/wav'     : 'wav',
				'audio/x-m4a'   : 'm4a',
				'audio/aac'     : 'm4a',
				'audio/mp4'     : 'm4a',
				'audio/x-mp4'   : 'm4a',
				'audio/ogg'     : 'ogg',
				'audio/webm'    : 'webm',
				'audio/flac'    : 'flac',
				'audio/x-flac'  : 'flac',
				'audio/amr'     : 'amr'
			},
			node, curHash,
			win  = ql.window,
			navi = ql.navbar,
			AMR, autoplay,
			controlsList = typeof ql.options.mediaControlsList === 'string' && ql.options.mediaControlsList? ' controlsList="' + fm.escape(ql.options.mediaControlsList) + '"' : '',
			setNavi = function() {
				navi.css('bottom', win.hasClass('elfinder-quicklook-fullscreen')? '50px' : '');
			},
			getNode = function(src, hash) {
				return $('<audio class="elfinder-quicklook-preview-audio ui-front" controls' + controlsList + ' preload="auto" autobuffer><source src="'+src+'" /></audio>')
					.on('change', function(e) {
						// Firefox fire change event on seek or volume change
						e.stopPropagation();
					})
					.on('error', function(e) {
						node && node.data('hash') === hash && reset();
					})
					.data('hash', hash)
					.appendTo(preview);
			},
			amrToWavUrl = function(hash) {
				var dfd = $.Deferred(),
					loader = $.Deferred().done(function() {
						fm.getContents(hash).done(function(data) {
							try {
								var buffer = AMR.toWAV(new Uint8Array(data));
								if (buffer) {
									dfd.resolve(URL.createObjectURL(new Blob([buffer], { type: 'audio/x-wav' })));
								} else {
									dfd.reject();
								}
							} catch(e) {
								dfd.reject();
							}
						}).fail(function() {
							dfd.reject();
						});
					}).fail(function() {
						AMR = false;
						dfd.reject();
					}),
					_AMR;
				if (window.TextEncoder && window.URL && URL.createObjectURL && typeof AMR === 'undefined') {
					// previous window.AMR
					_AMR = window.AMR;
					delete window.AMR;
					fm.loadScript(
						[ fm.options.cdns.amr ],
						function() { 
							AMR = window.AMR? window.AMR : false;
							// restore previous window.AMR
							window.AMR = _AMR;
							loader[AMR? 'resolve':'reject']();
						},
						{
							error: function() {
								loader.reject();
							}
						}
					);
				} else {
					loader[AMR? 'resolve':'reject']();
				}
				return dfd;
			},
			play = function(player) {
				var hash = node.data('hash'),
					playPromise;
				autoplay && (playPromise = player.play());
				// uses "playPromise['catch']" instead "playPromise.catch" to support Old IE
				if (playPromise && playPromise['catch']) {
					playPromise['catch'](function(e) {
						if (!player.paused) {
							node && node.data('hash') === hash && reset();
						}
					});
				}
			},
			reset = function() {
				if (node && node.parent().length) {
					var elm = node[0],
						url = node.children('source').attr('src');
					win.off('viewchange.audio');
					try {
						elm.pause();
						node.empty();
						if (url.match(/^blob:/)) {
							URL.revokeObjectURL(url);
						}
						elm.src = '';
						elm.load();
					} catch(e) {}
					node.remove();
					node = null;
				}
			};

		preview.on(ql.evUpdate, function(e) {
			var file = e.file,
				type = mimes[file.mime],
				html5, srcUrl;

			if (mimes[file.mime] && ql.dispInlineRegex.test(file.mime) && ((html5 = ql.support.audio[type]) || (type === 'amr'))) {
				autoplay = ql.autoPlay();
				curHash = file.hash;
				srcUrl = html5? fm.openUrl(curHash) : '';
				if (!html5) {
					if (fm.options.cdns.amr && type === 'amr' && AMR !== false) {
						e.stopImmediatePropagation();
						node = getNode(srcUrl, curHash);
						amrToWavUrl(file.hash).done(function(url) {
							if (curHash === file.hash) {
								var elm = node[0];
								try {
									node.children('source').attr('src', url);
									elm.pause();
									elm.load();
									play(elm);
									win.on('viewchange.audio', setNavi);
									setNavi();
								} catch(e) {
									URL.revokeObjectURL(url);
									node.remove();
								}
							} else {
								URL.revokeObjectURL(url);
							}
						}).fail(function() {
							node.remove();
						});
					}
				} else {
					e.stopImmediatePropagation();
					node = getNode(srcUrl, curHash);
					play(node[0]);
					win.on('viewchange.audio', setNavi);
					setNavi();
				}
			}
		}).on('change', reset);
	},
	
	/**
	 * HTML5 video preview plugin
	 *
	 * @param elFinder.commands.quicklook
	 **/
	function(ql) {
		"use strict";
		var fm       = ql.fm,
			preview  = ql.preview,
			mimes    = {
				'video/mp4'       : 'mp4',
				'video/x-m4v'     : 'mp4',
				'video/quicktime' : 'mp4',
				'video/mpeg'      : 'mpeg',
				'video/ogg'       : 'ogg',
				'application/ogg' : 'ogg',
				'video/webm'      : 'webm',
				'video/x-matroska': 'mkv',
				'video/3gpp'      : '3gp',
				'application/vnd.apple.mpegurl' : 'm3u8',
				'application/x-mpegurl' : 'm3u8',
				'application/dash+xml'  : 'mpd',
				'video/x-flv'     : 'flv',
				'video/x-msvideo' : 'avi'
			},
			node,
			win  = ql.window,
			navi = ql.navbar,
			cHls, cDash, pDash, cFlv, cVideojs, autoplay, tm,
			controlsList = typeof ql.options.mediaControlsList === 'string' && ql.options.mediaControlsList? ' controlsList="' + fm.escape(ql.options.mediaControlsList) + '"' : '',
			setNavi = function() {
				if (fm.UA.iOS) {
					if (win.hasClass('elfinder-quicklook-fullscreen')) {
						preview.css('height', '-webkit-calc(100% - 50px)');
						navi._show();
					} else {
						preview.css('height', '');
					}
				} else {
					navi.css('bottom', win.hasClass('elfinder-quicklook-fullscreen')? '50px' : '');
				}
			},
			render = function(file, opts) {
				var errTm = function(e) {
						if (err > 1) {
							tm && clearTimeout(tm);
							tm = setTimeout(function() {
								!canPlay && reset(true);
							}, 800);
						}
					},
					err = 0, 
					canPlay;
				//reset();
				pDash = null;
				opts = opts || {};
				ql.hideinfo();
				node = $('<video class="elfinder-quicklook-preview-video" controls' + controlsList + ' preload="auto" autobuffer playsinline>'
						+'</video>')
					.on('change', function(e) {
						// Firefox fire change event on seek or volume change
						e.stopPropagation();
					})
					.on('timeupdate progress', errTm)
					.on('canplay', function() {
						canPlay = true;
					})
					.data('hash', file.hash);
				// can not handling error event with jQuery `on` event handler
				node[0].addEventListener('error', function(e) {
					if (opts.src && fm.convAbsUrl(opts.src) === fm.convAbsUrl(e.target.src)) {
						++err;
						errTm();
					}
				}, true);

				if (opts.src) {
					node.append('<source src="'+opts.src+'" type="'+file.mime+'"/><source src="'+opts.src+'"/>');
				}
				
				node.appendTo(preview);

				win.on('viewchange.video', setNavi);
				setNavi();
			},
			loadHls = function(file) {
				var hls;
				render(file);
				hls = new cHls();
				hls.loadSource(fm.openUrl(file.hash));
				hls.attachMedia(node[0]);
				if (autoplay) {
					hls.on(cHls.Events.MANIFEST_PARSED, function() {
						play(node[0]);
					});
				}
			},
			loadDash = function(file) {
				var debug;
				render(file);
				pDash = window.dashjs.MediaPlayer().create();
				debug = pDash.getDebug();
				if (debug.setLogLevel) {
					debug.setLogLevel(dashjs.Debug.LOG_LEVEL_FATAL);
				} else if (debug.setLogToBrowserConsole) {
					debug.setLogToBrowserConsole(false);
				}
				pDash.initialize(node[0], fm.openUrl(file.hash), autoplay);
				pDash.on('error', function(e) {
					reset(true);
				});
			},
			loadFlv = function(file) {
				if (!cFlv.isSupported()) {
					cFlv = false;
					return;
				}
				var player = cFlv.createPlayer({
					type: 'flv',
					url: fm.openUrl(file.hash)
				});
				render(file);
				player.on(cFlv.Events.ERROR, function() {
					player.destroy();
					reset(true);
				});
				player.attachMediaElement(node[0]);
				player.load();
				play(player);
			},
			loadVideojs = function(file) {
				render(file);
				node[0].src = fm.openUrl(file.hash);
				cVideojs(node[0], {
					src: fm.openUrl(file.hash)
				});
			},
			play = function(player) {
				var hash = node.data('hash'),
					playPromise;
				autoplay && (playPromise = player.play());
				// uses "playPromise['catch']" instead "playPromise.catch" to support Old IE
				if (playPromise && playPromise['catch']) {
					playPromise['catch'](function(e) {
						if (!player.paused) {
							node && node.data('hash') === hash && reset(true);
						}
					});
				}
			},
			reset = function(showInfo) {
				tm && clearTimeout(tm);
				if (node && node.parent().length) {
					var elm = node[0];
					win.off('viewchange.video');
					pDash && pDash.reset();
					try {
						elm.pause();
						node.empty();
						elm.src = '';
						elm.load();
					} catch(e) {}
					node.remove();
					node = null;
				}
				showInfo && ql.info.show();
			};

		preview.on(ql.evUpdate, function(e) {
			var file = e.file,
				mime = file.mime.toLowerCase(),
				type = mimes[mime],
				stock, playPromise;
			
			if (mimes[mime] && ql.dispInlineRegex.test(file.mime) /*&& (((type === 'm3u8' || (type === 'mpd' && !fm.UA.iOS) || type === 'flv') && !fm.UA.ltIE10) || ql.support.video[type])*/) {
				autoplay = ql.autoPlay();
				if (ql.support.video[type] && (type !== 'm3u8' || fm.UA.Safari)) {
					e.stopImmediatePropagation();
					render(file, { src: fm.openUrl(file.hash) });
					play(node[0]);
				} else {
					if (cHls !== false && fm.options.cdns.hls && type === 'm3u8') {
						e.stopImmediatePropagation();
						if (cHls) {
							loadHls(file);
						} else {
							stock = window.Hls;
							delete window.Hls;
							fm.loadScript(
								[ fm.options.cdns.hls ],
								function(res) { 
									cHls = res || window.Hls || false;
									window.Hls = stock;
									cHls && loadHls(file);
								},
								{
									tryRequire: true,
									error : function() {
										cHls = false;
									}
								}
							);
						}
					} else if (cDash !== false && fm.options.cdns.dash && type === 'mpd') {
						e.stopImmediatePropagation();
						if (cDash) {
							loadDash(file);
						} else {
							fm.loadScript(
								[ fm.options.cdns.dash ],
								function() {
									// dashjs require window.dashjs in global scope
									cDash = window.dashjs? true : false;
									cDash && loadDash(file);
								},
								{
									tryRequire: true,
									error : function() {
										cDash = false;
									}
								}
							);
						}
					} else if (cFlv !== false && fm.options.cdns.flv && type === 'flv') {
						e.stopImmediatePropagation();
						if (cFlv) {
							loadFlv(file);
						} else {
							stock = window.flvjs;
							delete window.flvjs;
							fm.loadScript(
								[ fm.options.cdns.flv ],
								function(res) { 
									cFlv = res || window.flvjs || false;
									window.flvjs = stock;
									cFlv && loadFlv(file);
								},
								{
									tryRequire: true,
									error : function() {
										cFlv = false;
									}
								}
							);
						}
					} else if (fm.options.cdns.videojs) {
						if (cVideojs) {
							loadVideojs(file);
						} else {
							fm.loadScript(
								[ fm.options.cdns.videojs + '/video.min.js' ],
								function(res) { 
									cVideojs = res || window.videojs || false;
									//window.flvjs = stock;
									cVideojs && loadVideojs(file);
								},
								{
									tryRequire: true,
									error : function() {
										cVideojs = false;
									}
								}
							).loadCss([fm.options.cdns.videojs + '/video-js.min.css']);
						}
					}
				}
			}
		}).on('change', reset);
	},
	
	/**
	 * Audio/video preview plugin using browser plugins
	 *
	 * @param elFinder.commands.quicklook
	 **/
	function(ql) {
		"use strict";
		var preview = ql.preview,
			mimes   = [],
			node,
			win  = ql.window,
			navi = ql.navbar;
			
		$.each(navigator.plugins, function(i, plugins) {
			$.each(plugins, function(i, plugin) {
				(plugin.type.indexOf('audio/') === 0 || plugin.type.indexOf('video/') === 0) && mimes.push(plugin.type);
			});
		});
		mimes = ql.fm.arrayFlip(mimes);
		
		preview.on(ql.evUpdate, function(e) {
			var file  = e.file,
				mime  = file.mime,
				video,
				setNavi = function() {
					navi.css('bottom', win.hasClass('elfinder-quicklook-fullscreen')? '50px' : '');
				};
			
			if (mimes[file.mime] && ql.dispInlineRegex.test(file.mime)) {
				e.stopImmediatePropagation();
				(video = mime.indexOf('video/') === 0) && ql.hideinfo();
				node = $('<embed src="'+ql.fm.openUrl(file.hash)+'" type="'+mime+'" class="elfinder-quicklook-preview-'+(video ? 'video' : 'audio')+'"/>')
					.appendTo(preview);
				
				win.on('viewchange.embed', setNavi);
				setNavi();
			}
		}).on('change', function() {
			if (node && node.parent().length) {
				win.off('viewchange.embed');
				node.remove();
				node= null;
			}
		});
		
	},

	/**
	 * Archive(zip|gzip|tar) preview plugin using https://github.com/imaya/zlib.js
	 *
	 * @param elFinder.commands.quicklook
	 **/
	function(ql) {
		"use strict";
		var fm      = ql.fm,
			mimes   = fm.arrayFlip(['application/zip', 'application/x-gzip', 'application/x-tar']),
			preview = ql.preview,
			unzipFiles = function() {
				/** @type {Array.<string>} */
				var filenameList = [];
				/** @type {number} */
				var i;
				/** @type {number} */
				var il;
				/** @type {Array.<Zlib.Unzip.FileHeader>} */
				var fileHeaderList;
				// need check this.Y when update cdns.zlibUnzip
				this.Y();
				fileHeaderList = this.i;
				for (i = 0, il = fileHeaderList.length; i < il; ++i) {
					// need check fileHeaderList[i].J when update cdns.zlibUnzip
					filenameList[i] = fileHeaderList[i].filename + (fileHeaderList[i].J? ' (' + fm.formatSize(fileHeaderList[i].J) + ')' : '');
				}
				return filenameList;
			},
			tarFiles = function(tar) {
				var filenames = [],
					tarlen = tar.length,
					offset = 0,
					toStr = function(arr) {
						return String.fromCharCode.apply(null, arr).replace(/\0+$/, '');
					},
					h, name, prefix, size, dbs;
				while (offset < tarlen && tar[offset] !== 0) {
					h = tar.subarray(offset, offset + 512);
					name = toStr(h.subarray(0, 100));
					if (prefix = toStr(h.subarray(345, 500))) {
						name = prefix + name;
					}
					size = parseInt(toStr(h.subarray(124, 136)), 8);
					dbs = Math.ceil(size / 512) * 512;
					if (name === '././@LongLink') {
						name = toStr(tar.subarray(offset + 512, offset + 512 + dbs));
					}
					(name !== 'pax_global_header') && filenames.push(name + (size? ' (' + fm.formatSize(size) + ')': ''));
					offset = offset + 512 + dbs;
				}
				return filenames;
			},
			Zlib;

		if (window.Uint8Array && window.DataView && fm.options.cdns.zlibUnzip && fm.options.cdns.zlibGunzip) {
			preview.on(ql.evUpdate, function(e) {
				var file  = e.file,
					isTar = (file.mime === 'application/x-tar');
				if (mimes[file.mime] && (
						isTar
						|| ((typeof Zlib === 'undefined' || Zlib) && (file.mime === 'application/zip' || file.mime === 'application/x-gzip'))
					)) {
					var jqxhr, loading, url,
						req = function() {
							url = fm.openUrl(file.hash);
							if (!fm.isSameOrigin(url)) {
								url = fm.openUrl(file.hash, true);
							}
							jqxhr = fm.request({
								data    : {cmd : 'get'},
								options : {
									url: url,
									type: 'get',
									cache : true,
									dataType : 'binary',
									responseType :'arraybuffer',
									processData: false
								}
							})
							.fail(function() {
								loading.remove();
							})
							.done(function(data) {
								var unzip, filenames;
								try {
									if (file.mime === 'application/zip') {
										unzip = new Zlib.Unzip(new Uint8Array(data));
										//filenames = unzip.getFilenames();
										filenames = unzipFiles.call(unzip);
									} else if (file.mime === 'application/x-gzip') {
										unzip = new Zlib.Gunzip(new Uint8Array(data));
										filenames = tarFiles(unzip.decompress());
									} else if (file.mime === 'application/x-tar') {
										filenames = tarFiles(new Uint8Array(data));
									}
									makeList(filenames);
								} catch (e) {
									loading.remove();
									fm.debug('error', e);
								}
							});
						},
						makeList = function(filenames) {
							var header, doc;
							if (filenames && filenames.length) {
								filenames = $.map(filenames, function(str) {
									return fm.decodeRawString(str);
								});
								filenames.sort();
								loading.remove();
								header = '<strong>'+fm.escape(file.mime)+'</strong> ('+fm.formatSize(file.size)+')'+'<hr/>';
								doc = $('<div class="elfinder-quicklook-preview-archive-wrapper">'+header+'<pre class="elfinder-quicklook-preview-text">'+fm.escape(filenames.join("\n"))+'</pre></div>')
									.on('touchstart', function(e) {
										if ($(this)['scroll' + (fm.direction === 'ltr'? 'Right' : 'Left')]() > 5) {
											e.originalEvent._preventSwipeX = true;
										}
									})
									.appendTo(preview);
								ql.hideinfo();
							}
						},
						_Zlib;

					// this is our file - stop event propagation
					e.stopImmediatePropagation();
					
					loading = $('<div class="elfinder-quicklook-info-data"><span class="elfinder-spinner-text">'+fm.i18n('nowLoading')+'</span><span class="elfinder-spinner"/></div>').appendTo(ql.info.find('.elfinder-quicklook-info'));
					
					// stop loading on change file if not loaded yet
					preview.one('change', function() {
						jqxhr.state() === 'pending' && jqxhr.reject();
						loading.remove();
					});
					
					if (Zlib) {
						req();
					} else {
						if (window.Zlib) {
							_Zlib = window.Zlib;
							delete window.Zlib;
						}
						fm.loadScript(
							[ fm.options.cdns.zlibUnzip, fm.options.cdns.zlibGunzip ],
							function() {
								if (window.Zlib && (Zlib = window.Zlib)) {
									if (_Zlib) {
										window.Zlib = _Zlib;
									} else {
										delete window.Zlib;
									}
									req();
								} else {
									error();
								}
							}
						);
					}
				}
			});
		}
	},

	/**
	 * RAR Archive preview plugin using https://github.com/43081j/rar.js
	 *
	 * @param elFinder.commands.quicklook
	 **/
	function(ql) {
		"use strict";
		var fm      = ql.fm,
			mimes   = fm.arrayFlip(['application/x-rar']),
			preview = ql.preview,
			RAR;

		if (window.DataView) {
			preview.on(ql.evUpdate, function(e) {
				var file = e.file;
				if (mimes[file.mime] && fm.options.cdns.rar && RAR !== false) {
					var loading, url, archive, abort,
						getList = function(url) {
							if (abort) {
								loading.remove();
								return;
							}
							try {
								archive = RAR({
									file: url,
									type: 2,
									xhrHeaders: fm.customHeaders,
									xhrFields: fm.xhrFields
								}, function(err) {
									loading.remove();
									var filenames = [],
										header, doc;
									if (abort || err) {
										// An error occurred (not a rar, read error, etc)
										err && fm.debug('error', err);
										return;
									}
									$.each(archive.entries, function() {
										filenames.push(this.path + (this.size? ' (' + fm.formatSize(this.size) + ')' : ''));
									});
									if (filenames.length) {
										filenames = $.map(filenames, function(str) {
											return fm.decodeRawString(str);
										});
										filenames.sort();
										header = '<strong>'+fm.escape(file.mime)+'</strong> ('+fm.formatSize(file.size)+')'+'<hr/>';
										doc = $('<div class="elfinder-quicklook-preview-archive-wrapper">'+header+'<pre class="elfinder-quicklook-preview-text">'+fm.escape(filenames.join("\n"))+'</pre></div>')
											.on('touchstart', function(e) {
												if ($(this)['scroll' + (fm.direction === 'ltr'? 'Right' : 'Left')]() > 5) {
													e.originalEvent._preventSwipeX = true;
												}
											})
											.appendTo(preview);
										ql.hideinfo();
									}
								});
							} catch(e) {
								loading.remove();
							}
						},
						error = function() {
							RAR = false;
							loading.remove();
						},
						_RAR;

					// this is our file - stop event propagation
					e.stopImmediatePropagation();
					
					loading = $('<div class="elfinder-quicklook-info-data"><span class="elfinder-spinner-text">'+fm.i18n('nowLoading')+'</span><span class="elfinder-spinner"/></div>').appendTo(ql.info.find('.elfinder-quicklook-info'));
					
					// stop loading on change file if not loaded yet
					preview.one('change', function() {
						archive && (archive.abort = true);
						loading.remove();
						abort = true;
					});
					
					url = fm.openUrl(file.hash);
					if (!fm.isSameOrigin(url)) {
						url = fm.openUrl(file.hash, true);
					}
					if (RAR) {
						getList(url);
					} else {
						if (window.RarArchive) {
							_RAR = window.RarArchive;
							delete window.RarArchive;
						}
						fm.loadScript(
							[ fm.options.cdns.rar ],
							function() {
								if (fm.hasRequire) {
									require(['rar'], function(RarArchive) {
										RAR = RarArchive;
										getList(url);
									}, error);
								} else {
									if (RAR = window.RarArchive) {
										if (_RAR) {
											window.RarArchive = _RAR;
										} else {
											delete window.RarArchive;
										}
										getList(url);
									} else {
										error();
									}
								}
							},
							{
								tryRequire: true,
								error : error
							}
						);
					}
				}
			});
		}
	},

	/**
	 * CAD-Files and 3D-Models online viewer on sharecad.org
	 *
	 * @param elFinder.commands.quicklook
	 **/
	function(ql) {
		"use strict";
		var fm      = ql.fm,
			mimes   = fm.arrayFlip(ql.options.sharecadMimes || []),
			preview = ql.preview,
			win     = ql.window,
			node;
			
		if (ql.options.sharecadMimes.length) {
			ql.addIntegration({
				title: 'ShareCAD.org CAD and 3D-Models viewer',
				link: 'https://sharecad.org/DWGOnlinePlugin'
			});
		}

		preview.on(ql.evUpdate, function(e) {
			var file = e.file;
			if (mimes[file.mime.toLowerCase()] && !fm.option('onetimeUrl', file.hash)) {
				var win     = ql.window,
					loading, url;
				
				e.stopImmediatePropagation();
				if (file.url == '1') {
					preview.hide();
					$('<div class="elfinder-quicklook-info-data"><button class="elfinder-info-button">'+fm.i18n('getLink')+'</button></div>').appendTo(ql.info.find('.elfinder-quicklook-info'))
					.on('click', function() {
						var self = $(this);
						self.html('<span class="elfinder-spinner">');
						fm.request({
							data : {cmd : 'url', target : file.hash},
							preventDefault : true
						})
						.always(function() {
							self.html('');
						})
						.done(function(data) {
							var rfile = fm.file(file.hash);
							file.url = rfile.url = data.url || '';
							if (file.url) {
								preview.trigger({
									type: ql.evUpdate,
									file: file,
									forceUpdate: true
								});
							}
						});
					});
				}
				if (file.url !== '' && file.url != '1') {
					preview.one('change', function() {
						loading.remove();
						node.off('load').remove();
						node = null;
					}).addClass('elfinder-overflow-auto');
					
					loading = $('<div class="elfinder-quicklook-info-data"><span class="elfinder-spinner-text">'+fm.i18n('nowLoading')+'</span><span class="elfinder-spinner"/></div>').appendTo(ql.info.find('.elfinder-quicklook-info'));
					
					url = fm.convAbsUrl(fm.url(file.hash));
					node = $('<iframe class="elfinder-quicklook-preview-iframe" scrolling="no"/>')
						.css('background-color', 'transparent')
						.appendTo(preview)
						.on('load', function() {
							ql.hideinfo();
							loading.remove();
							ql.preview.after(ql.info);
							$(this).css('background-color', '#fff').show();
						})
						.on('error', function() {
							loading.remove();
							ql.preview.after(ql.info);
						})
						.attr('src', '//sharecad.org/cadframe/load?url=' + encodeURIComponent(url));
					
					ql.info.after(ql.preview);
				}
			}
			
		});
	},

	/**
	 * KML preview with GoogleMaps API
	 *
	 * @param elFinder.commands.quicklook
	 */
	function(ql) {
		"use strict";
		var fm      = ql.fm,
			mimes   = {
				'application/vnd.google-earth.kml+xml' : true,
				'application/vnd.google-earth.kmz' : true
			},
			preview = ql.preview,
			gMaps, loadMap, wGmfail, fail, mapScr;

		if (ql.options.googleMapsApiKey) {
			ql.addIntegration({
				title: 'Google Maps',
				link: 'https://www.google.com/intl/' + fm.lang.replace('_', '-') + '/help/terms_maps.html'
			});
			gMaps = (window.google && google.maps);
			// start load maps
			loadMap = function(file, node) {
				var mapsOpts = ql.options.googleMapsOpts.maps;
				fm.forExternalUrl(file.hash).done(function(url) {
					if (url) {
						try {
							new gMaps.KmlLayer(url, Object.assign({
								map: new gMaps.Map(node.get(0), mapsOpts)
							}, ql.options.googleMapsOpts.kml));
							ql.hideinfo();
						} catch(e) {
							fail();
						}
					} else {
						fail();
					}
				});
			};
			// keep stored error handler if exists
			wGmfail = window.gm_authFailure;
			// on error function
			fail = function() {
				mapScr = null;
			};
			// API script url
			mapScr = 'https://maps.googleapis.com/maps/api/js?key=' + ql.options.googleMapsApiKey;
			// error handler
			window.gm_authFailure = function() {
				fail();
				wGmfail && wGmfail();
			};

			preview.on(ql.evUpdate, function(e) {
				var file = e.file;
				if (mapScr && mimes[file.mime.toLowerCase()]) {
					var win     = ql.window,
						getLink = (file.url == '1' && !fm.option('onetimeUrl', file.hash)),
						loading, url, node;
				
					e.stopImmediatePropagation();
					if (getLink) {
						preview.hide();
						$('<div class="elfinder-quicklook-info-data"><button class="elfinder-info-button">'+fm.i18n('getLink')+'</button></div>').appendTo(ql.info.find('.elfinder-quicklook-info'))
						.on('click', function() {
							var self = $(this);
							self.html('<span class="elfinder-spinner">');
							fm.request({
								data : {cmd : 'url', target : file.hash},
								preventDefault : true
							})
							.always(function() {
								self.html('');
							})
							.done(function(data) {
								var rfile = fm.file(file.hash);
								file.url = rfile.url = data.url || '';
								if (file.url) {
									preview.trigger({
										type: ql.evUpdate,
										file: file,
										forceUpdate: true
									});
								}
							});
						});
					}
					if (file.url !== '' && !getLink) {
						node = $('<div style="width:100%;height:100%;"/>').appendTo(preview);
						preview.one('change', function() {
							node.remove();
							node = null;
						});
						if (!gMaps) {
							fm.loadScript([mapScr], function() {
								gMaps = window.google && google.maps;
								gMaps && loadMap(file, node);
							});
						} else {
							loadMap(file, node);
						}
					}
				}
			});
		}
	},

	/**
	 * Any supported files preview plugin using (Google docs | MS Office) online viewer
	 *
	 * @param elFinder.commands.quicklook
	 **/
	function(ql) {
		"use strict";
		var fm      = ql.fm,
			mimes   = Object.assign(fm.arrayFlip(ql.options.googleDocsMimes || [], 'g'), fm.arrayFlip(ql.options.officeOnlineMimes || [], 'm')),
			preview = ql.preview,
			win     = ql.window,
			navi    = ql.navbar,
			urls    = {
				g: 'docs.google.com/gview?embedded=true&url=',
				m: 'view.officeapps.live.com/op/embed.aspx?wdStartOn=0&src='
			},
			navBottom = {
				g: '56px',
				m: '24px'
			},
			mLimits = {
				xls  : 5242880, // 5MB
				xlsb : 5242880,
				xlsx : 5242880,
				xlsm : 5242880,
				other: 10485760 // 10MB
			},
			node, enable;
		
		if (ql.options.googleDocsMimes.length) {
			enable = true;
			ql.addIntegration({
				title: 'Google Docs Viewer',
				link: 'https://docs.google.com/'
			});
		}
		if (ql.options.officeOnlineMimes.length) {
			enable = true;
			ql.addIntegration({
				title: 'MS Online Doc Viewer',
				link: 'https://products.office.com/office-online/view-office-documents-online'
			});
		}

		if (enable) {
			preview.on(ql.evUpdate, function(e) {
				var file = e.file,
					type;
				// 25MB is maximum filesize of Google Docs prevew
				if (file.size <= 26214400 && (type = mimes[file.mime])) {
					var win     = ql.window,
						setNavi = function() {
							navi.css('bottom', win.hasClass('elfinder-quicklook-fullscreen')? navBottom[type] : '');
						},
						ext     = fm.mimeTypes[file.mime],
						getLink = (file.url == '1' && !fm.option('onetimeUrl', file.hash)),
						loading, url;
					
					if (type === 'm') {
						if ((mLimits[ext] && file.size > mLimits[ext]) || file.size > mLimits.other) {
							type = 'g';
						}
					}
					if (getLink) {
						preview.hide();
						$('<div class="elfinder-quicklook-info-data"><button class="elfinder-info-button">'+fm.i18n('getLink')+'</button></div>').appendTo(ql.info.find('.elfinder-quicklook-info'))
						.on('click', function() {
							var self = $(this);
							self.html('<span class="elfinder-spinner">');
							fm.request({
								data : {cmd : 'url', target : file.hash},
								preventDefault : true
							})
							.always(function() {
								self.html('');
							})
							.done(function(data) {
								var rfile = fm.file(file.hash);
								file.url = rfile.url = data.url || '';
								if (file.url) {
									preview.trigger({
										type: ql.evUpdate,
										file: file,
										forceUpdate: true
									});
								}
							});
						});
					}
					if (file.url !== '' && !getLink) {
						e.stopImmediatePropagation();
						preview.one('change', function() {
							win.off('viewchange.googledocs');
							loading.remove();
							node.off('load').remove();
							node = null;
						}).addClass('elfinder-overflow-auto');
						
						loading = $('<div class="elfinder-quicklook-info-data"><span class="elfinder-spinner-text">'+fm.i18n('nowLoading')+'</span><span class="elfinder-spinner"/></div>').appendTo(ql.info.find('.elfinder-quicklook-info'));
						
						node = $('<iframe class="elfinder-quicklook-preview-iframe"/>')
							.css('background-color', 'transparent')
							.appendTo(preview);

						fm.forExternalUrl(file.hash).done(function(url) {
							if (url) {
								if (file.ts) {
									url += (url.match(/\?/)? '&' : '?') + '_t=' + file.ts;
								}
								node.on('load', function() {
									ql.hideinfo();
									loading.remove();
									ql.preview.after(ql.info);
									$(this).css('background-color', '#fff').show();
								})
								.on('error', function() {
									loading.remove();
									ql.preview.after(ql.info);
								}).attr('src', 'https://' + urls[type] + encodeURIComponent(url));
							} else {
								loading.remove();
								node.remove();
							}
						});

						win.on('viewchange.googledocs', setNavi);
						setNavi();
						ql.info.after(ql.preview);
					}
				}
				
			});
		}
	},

	/**
	 * Texts preview plugin
	 *
	 * @param elFinder.commands.quicklook
	 **/
	function(ql) {
		"use strict";
		var fm      = ql.fm,
			preview = ql.preview,
			textMaxlen = parseInt(ql.options.textMaxlen) || 2000,
			prettify = function() {
				if (fm.options.cdns.prettify) {
					fm.loadScript([fm.options.cdns.prettify + (fm.options.cdns.prettify.match(/\?/)? '&' : '?') + 'autorun=false']);
					prettify = function() { return true; };
				} else {
					prettify = function() { return false; };
				}
			},
			PRcheck = function(node, cnt) {
				if (prettify()) {
					if (typeof window.PR === 'undefined' && cnt--) {
						setTimeout(function() { PRcheck(node, cnt); }, 100);
					} else {
						if (typeof window.PR === 'object') {
							node.css('cursor', 'wait');
							requestAnimationFrame(function() {
								PR.prettyPrint && PR.prettyPrint(null, node.get(0));
								node.css('cursor', '');
							});
						} else {
							prettify = function() { return false; };
						}
					}
				}
			};
		
		preview.on(ql.evUpdate, function(e) {
			var file = e.file,
				mime = file.mime,
				jqxhr, loading;
			
			if (fm.mimeIsText(file.mime) && (!ql.options.getSizeMax || file.size <= ql.options.getSizeMax)) {
				e.stopImmediatePropagation();
				
				(typeof window.PR === 'undefined') && prettify();
				
				loading = $('<div class="elfinder-quicklook-info-data"><span class="elfinder-spinner-text">'+fm.i18n('nowLoading')+'</span><span class="elfinder-spinner"/></div>').appendTo(ql.info.find('.elfinder-quicklook-info'));

				// stop loading on change file if not loadin yet
				preview.one('change', function() {
					jqxhr.state() == 'pending' && jqxhr.reject();
				});
				
				jqxhr = fm.request({
					data           : {cmd : 'get', target : file.hash, conv : 1, _t : file.ts},
					options        : {type: 'get', cache : true},
					preventDefault : true
				})
				.done(function(data) {
					var reg = new RegExp('^(data:'+file.mime.replace(/([.+])/g, '\\$1')+';base64,)', 'i'),
						text = data.content,
						part, more, node, m;
					ql.hideinfo();
					if (window.atob && (m = text.match(reg))) {
						text = atob(text.substr(m[1].length));
					}
					
					more = text.length - textMaxlen;
					if (more > 100) {
						part = text.substr(0, textMaxlen) + '...';
					} else {
						more = 0;
					}
					
					node = $('<div class="elfinder-quicklook-preview-text-wrapper"><pre class="elfinder-quicklook-preview-text prettyprint"></pre></div>');
					
					if (more) {
						node.append($('<div class="elfinder-quicklook-preview-charsleft"><hr/><span>' + fm.i18n('charsLeft', fm.toLocaleString(more)) + '</span></div>')
							.on('click', function() {
								var top = node.scrollTop();
								$(this).remove();
								node.children('pre').removeClass('prettyprinted').text(text).scrollTop(top);
								PRcheck(node, 100);
							})
						);
					}
					node.children('pre').text(part || text);
					
					node.on('touchstart', function(e) {
						if ($(this)['scroll' + (fm.direction === 'ltr'? 'Right' : 'Left')]() > 5) {
							e.originalEvent._preventSwipeX = true;
						}
					}).appendTo(preview);
					
					PRcheck(node, 100);
				})
				.always(function() {
					loading.remove();
				});
			}
		});
	}
];
