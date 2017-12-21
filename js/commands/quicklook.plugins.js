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
			WebP;
		
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
			
		preview.on('update', function(e) {
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
					
					loading.remove();
					// hide info/icon
					ql.hideinfo();
					//show image
					img.fadeIn(100);
				},
				url, img, loading, m;

			if (ql.dispInlineRegex.test(file.mime) && $.inArray(file.mime, mimes) !== -1) {
				// this is our file - stop event propagation
				e.stopImmediatePropagation();

				loading = $('<div class="elfinder-quicklook-info-data"> '+fm.i18n('nowLoading')+'<span class="elfinder-info-spinner"></div>').appendTo(ql.info.find('.elfinder-quicklook-info'));

				url = fm.openUrl(file.hash);
				
				img = $('<img/>')
					.hide()
					.appendTo(preview)
					.on('load', show)
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
			mimes   = ['image/vnd.adobe.photoshop', 'image/x-photoshop'],
			preview = ql.preview,
			load    = function(url, img, loading) {
				try {
					fm.replaceXhrSend();
					PSD.fromURL(url).then(function(psd) {
						var prop;
						img.attr('src', psd.image.toBase64());
						setTimeout(function() {
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
						}, 1);
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
		
		preview.on('update', function(e) {
			var file = e.file,
				url, img, loading, m,
				_define, _require;

			if (fm.options.cdns.psd && ! fm.UA.ltIE10 && ql.dispInlineRegex.test(file.mime) && $.inArray(file.mime, mimes) !== -1) {
				// this is our file - stop event propagation
				e.stopImmediatePropagation();

				loading = $('<div class="elfinder-quicklook-info-data"> '+fm.i18n('nowLoading')+'<span class="elfinder-info-spinner"></div>').appendTo(ql.info.find('.elfinder-quicklook-info'));
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
		var mimes   = ['text/html', 'application/xhtml+xml'],
			preview = ql.preview,
			fm      = ql.fm;
			
		preview.on('update', function(e) {
			var file = e.file, jqxhr, loading;
			
			if (ql.dispInlineRegex.test(file.mime) && $.inArray(file.mime, mimes) !== -1) {
				e.stopImmediatePropagation();

				loading = $('<div class="elfinder-quicklook-info-data"> '+fm.i18n('nowLoading')+'<span class="elfinder-info-spinner"></div>').appendTo(ql.info.find('.elfinder-quicklook-info'));

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
	 * Texts preview plugin
	 *
	 * @param elFinder.commands.quicklook
	 **/
	function(ql) {
		"use strict";
		var fm      = ql.fm,
			mimes   = fm.res('mimes', 'text'),
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
							setTimeout(function() {
								PR.prettyPrint && PR.prettyPrint(null, node.get(0));
								node.css('cursor', '');
							}, 0);
						} else {
							prettify = function() { return false; };
						}
					}
				}
			};
		
		preview.on('update', function(e) {
			var file = e.file,
				mime = file.mime,
				jqxhr, loading;
			
			if (fm.mimeIsText(mime) || $.inArray(mime, mimes) !== -1) {
				e.stopImmediatePropagation();
				
				(typeof window.PR === 'undefined') && prettify();
				
				loading = $('<div class="elfinder-quicklook-info-data"> '+fm.i18n('nowLoading')+'<span class="elfinder-info-spinner"></div>').appendTo(ql.info.find('.elfinder-quicklook-info'));

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
			active  = false;
			
		if ((fm.UA.Safari && fm.OS === 'mac' && !fm.UA.iOS) || fm.UA.IE) {
			active = true;
		} else {
			$.each(navigator.plugins, function(i, plugins) {
				$.each(plugins, function(i, plugin) {
					if (plugin.type == mime) {
						return !(active = true);
					}
				});
			});
		}

		active && preview.on('update', function(e) {
			var file = e.file, node;
			
			if (ql.dispInlineRegex.test(file.mime) && file.mime == mime) {
				e.stopImmediatePropagation();
				ql.hideinfo();
				node = $('<object class="elfinder-quicklook-preview-pdf" data="'+fm.openUrl(file.hash)+'" type="application/pdf" />')
					.appendTo(preview);
			}
			
		});
		
			
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
				if (plugin.type == mime) {
					return !(active = true);
				}
			});
		});
		
		active && preview.on('update', function(e) {
			var file = e.file,
				node;
				
			if (ql.dispInlineRegex.test(file.mime) && file.mime == mime) {
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
		var preview  = ql.preview,
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
				'audio/flac'    : 'flac',
				'audio/x-flac'  : 'flac'
			},
			node,
			win  = ql.window,
			navi = ql.navbar;

		preview.on('update', function(e) {
			var file = e.file,
				type = mimes[file.mime],
				autoplay = ql.autoPlay(),
				setNavi = function() {
					navi.css('bottom', win.hasClass('elfinder-quicklook-fullscreen')? '50px' : '');
				};

			if (ql.dispInlineRegex.test(file.mime) && ql.support.audio[type]) {
				e.stopImmediatePropagation();
				
				node = $('<audio class="elfinder-quicklook-preview-audio" controls preload="auto" autobuffer><source src="'+ql.fm.openUrl(file.hash)+'" /></audio>')
					.on('change', function(e) {
						// Firefox fire change event on seek or volume change
						e.stopPropagation();
					})
					.appendTo(preview);
				autoplay && node[0].play();
				
				win.on('viewchange.audio', setNavi);
				setNavi();
			}
		}).on('change', function() {
			if (node && node.parent().length) {
				var elm = node[0];
				win.off('viewchange.audio');
				try {
					elm.pause();
					elm.src = '';
					elm.load();
				} catch(e) {}
				node.remove();
				node= null;
			}
		});
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
				'video/ogg'       : 'ogg',
				'application/ogg' : 'ogg',
				'video/webm'      : 'webm',
				'application/vnd.apple.mpegurl' : 'm3u8',
				'application/x-mpegurl' : 'm3u8',
				'application/dash+xml'  : 'mpd'
			},
			node,
			win  = ql.window,
			navi = ql.navbar,
			cHls, cDash;

		preview.on('update', function(e) {
			var file = e.file,
				autoplay = ql.autoPlay(),
				type = mimes[file.mime.toLowerCase()],
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
				render = function(opts) {
					opts = opts || {};
					ql.hideinfo();
					node = $('<video class="elfinder-quicklook-preview-video" controls preload="auto" autobuffer playsinline>'
							+'</video>')
						.on('change', function(e) {
							// Firefox fire change event on seek or volume change
							e.stopPropagation();
						});
					if (opts.src) {
						node.append('<source src="'+opts.src+'" type="'+file.mime+'"/><source src="'+opts.src+'"/>');
					}
					
					node.appendTo(preview);

					win.on('viewchange.video', setNavi);
					setNavi();
				},
				loadHls = function() {
					var hls;
					render();
					hls = new cHls();
					hls.loadSource(fm.openUrl(file.hash));
					hls.attachMedia(node[0]);
					if (autoplay) {
						hls.on(cHls.Events.MANIFEST_PARSED,function() {
							node[0].play();
						});
					}
				},
				loadDash = function() {
					var player;
					render();
					player = cDash.MediaPlayer().create();
					player.initialize(node[0], fm.openUrl(file.hash), autoplay);
				};
			
			if (ql.dispInlineRegex.test(file.mime) && (((type === 'm3u8' || type === 'mpd') && !fm.UA.ltIE10) || ql.support.video[type])) {
				if (ql.support.video[type] && (type !== 'm3u8' || fm.UA.Safari)) {
					e.stopImmediatePropagation();
					render({ src: fm.openUrl(file.hash) });
					autoplay && node[0].play();
				} else {
					if (fm.options.cdns.hls && type === 'm3u8') {
						e.stopImmediatePropagation();
						if (cHls) {
							loadHls();
						} else {
							fm.loadScript(
								[ fm.options.cdns.hls ],
								function(res) { 
									cHls = res || window.Hls;
									loadHls();
								},
								{tryRequire: true}
							);
						}
					} else if (fm.options.cdns.dash && type === 'mpd') {
						e.stopImmediatePropagation();
						if (cDash) {
							loadDash();
						} else {
							fm.loadScript(
								[ fm.options.cdns.dash ],
								function() { 
									cDash = window.dashjs;
									loadDash();
								},
								{tryRequire: true}
							);
						}
					}
				}
			}
		}).on('change', function() {
			if (node && node.parent().length) {
				var elm = node[0];
				win.off('viewchange.video');
				try {
					elm.pause();
					elm.src = '';
					elm.load();
				} catch(e) {}
				node.remove();
				node= null;
			}
		});
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
		
		preview.on('update', function(e) {
			var file  = e.file,
				mime  = file.mime,
				video,
				setNavi = function() {
					navi.css('bottom', win.hasClass('elfinder-quicklook-fullscreen')? '50px' : '');
				};
			
			if (ql.dispInlineRegex.test(file.mime) && $.inArray(file.mime, mimes) !== -1) {
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
		var mimes   = ['application/zip', 'application/x-gzip', 'application/x-tar'],
			preview = ql.preview,
			fm      = ql.fm,
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
			preview.on('update', function(e) {
				var file = e.file,
					doc, xhr, loading, url,
					req = function() {
						xhr = new XMLHttpRequest();
						xhr.onload = function(e) {
							var unzip, filenames;
							if (this.readyState === 4 && this.response) {
								try {
									if (file.mime === 'application/zip') {
										unzip = new Zlib.Unzip(new Uint8Array(xhr.response));
										//filenames = unzip.getFilenames();
										filenames = unzipFiles.call(unzip);
									} else if (file.mime === 'application/x-gzip') {
										unzip = new Zlib.Gunzip(new Uint8Array(xhr.response));
										filenames = tarFiles(unzip.decompress());
									} else if (file.mime === 'application/x-tar') {
										filenames = tarFiles(new Uint8Array(xhr.response));
									}
									makeList(filenames);
								} catch (e) {
									loading.remove();
									fm.debug('error', e);
								}
							} else {
								loading.remove();
							}
						};
						url = fm.openUrl(file.hash);
						if (!fm.isSameOrigin(url)) {
							url = fm.openUrl(file.hash, true);
						}
						xhr.open('GET', url, true);
						xhr.responseType = 'arraybuffer';
						fm.replaceXhrSend();
						xhr.send();
						fm.restoreXhrSend();
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
					isTar = (file.mime === 'application/x-tar'),
					_Zlib;

				if ($.inArray(file.mime, mimes) !== -1 && (
						isTar
						|| ((typeof Zlib === 'undefined' || Zlib) && (file.mime === 'application/zip' || file.mime === 'application/x-gzip'))
					)) {
					// this is our file - stop event propagation
					e.stopImmediatePropagation();
					
					loading = $('<div class="elfinder-quicklook-info-data"> '+fm.i18n('nowLoading')+'<span class="elfinder-info-spinner"></div>').appendTo(ql.info.find('.elfinder-quicklook-info'));
					
					// stop loading on change file if not loaded yet
					preview.one('change', function() {
						loading.remove();
						xhr && xhr.readyState < 4 && xhr.abort();
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
		var mimes   = ['application/x-rar'],
			preview = ql.preview,
			fm      = ql.fm,
			RAR;

		if (window.DataView) {
			preview.on('update', function(e) {
				var file = e.file,
					loading, url, archive, abort,
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

				if (fm.options.cdns.rar && RAR !== false && $.inArray(file.mime, mimes) !== -1) {
					// this is our file - stop event propagation
					e.stopImmediatePropagation();
					
					loading = $('<div class="elfinder-quicklook-info-data"> '+fm.i18n('nowLoading')+'<span class="elfinder-info-spinner"></div>').appendTo(ql.info.find('.elfinder-quicklook-info'));
					
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
	 * Any supported files preview plugin using Google docs online viewer
	 *
	 * @param elFinder.commands.quicklook
	 **/
	function(ql) {
		"use strict";
		var fm      = ql.fm,
			mimes   = ql.options.googleDocsMimes || [],
			preview = ql.preview,
			win     = ql.window,
			navi    = ql.navbar,
			node;
			
		preview.on('update', function(e) {
			var win     = ql.window,
				file    = e.file,
				setNavi = function() {
					navi.css('bottom', win.hasClass('elfinder-quicklook-fullscreen')? '56px' : '');
				},
				loading;
			
			if ($.inArray(file.mime, mimes) !== -1) {
				if (file.url == '1') {
					preview.hide();
					$('<div class="elfinder-quicklook-info-data"><button class="elfinder-info-button">'+fm.i18n('getLink')+'</button></div>').appendTo(ql.info.find('.elfinder-quicklook-info'))
					.on('click', function() {
						var self = $(this);
						self.html('<span class="elfinder-info-spinner">');
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
									type: 'update',
									file: file,
									forceUpdate: true
								});
							}
						});
					});
				}
				if (file.url !== '' && file.url != '1') {
					e.stopImmediatePropagation();
					preview.one('change', function() {
						win.off('viewchange.googledocs');
						loading.remove();
						node.off('load').remove();
						node = null;
					}).addClass('elfinder-overflow-auto');
					
					loading = $('<div class="elfinder-quicklook-info-data"> '+fm.i18n('nowLoading')+'<span class="elfinder-info-spinner"></div>').appendTo(ql.info.find('.elfinder-quicklook-info'));
					
					node = $('<iframe class="elfinder-quicklook-preview-iframe"/>')
						.css('background-color', 'transparent')
						.appendTo(preview)
						.on('load', function() {
							ql.hideinfo();
							loading.remove();
							$(this).css('background-color', '#fff').show();
						})
						.attr('src', '//docs.google.com/gview?embedded=true&url=' + encodeURIComponent(fm.convAbsUrl(fm.url(file.hash))));
					
					win.on('viewchange.googledocs', setNavi);
					setNavi();
				}
			}
			
		});
	}

];
