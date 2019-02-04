/**
 * @class elFinder command "download". 
 * Download selected files.
 * Only for new api
 *
 * @author Dmitry (dio) Levashov, dio@std42.ru
 **/
elFinder.prototype.commands.zipdl = function() {};
elFinder.prototype.commands.download = function() {
	"use strict";
	var self   = this,
		fm     = this.fm,
		czipdl = null,
		zipOn  = false,
		mixed  = false,
		dlntf  = false,
		cpath  = window.location.pathname || '/',
		filter = function(hashes, inExec) {
			var volumeid, mixedCmd;
			
			if (czipdl !== null) {
				if (fm.searchStatus.state > 1) {
					mixed = fm.searchStatus.mixed;
				} else if (fm.leafRoots[fm.cwd().hash]) {
					volumeid = fm.cwd().volumeid;
					$.each(hashes, function(i, h) {
						if (h.indexOf(volumeid) !== 0) {
							mixed = true;
							return false;
						}
					});
				}
				zipOn = (fm.isCommandEnabled('zipdl', hashes[0]));
			}

			if (mixed) {
				mixedCmd = czipdl? 'zipdl' : 'download';
				hashes = $.grep(hashes, function(h) {
					var f = fm.file(h),
						res = (! f || (! czipdl && f.mime === 'directory') || ! fm.isCommandEnabled(mixedCmd, h))? false : true;
					if (f && inExec && ! res) {
						fm.cwdHash2Elm(f.hash).trigger('unselect');
					}
					return res;
				});
				if (! hashes.length) {
					return [];
				}
			} else {
				if (!fm.isCommandEnabled('download', hashes[0])) {
					return [];
				}
			}
			
			return $.grep(self.files(hashes), function(f) { 
				var res = (! f.read || (! zipOn && f.mime == 'directory')) ? false : true;
				if (inExec && ! res) {
					fm.cwdHash2Elm(f.hash).trigger('unselect');
				}
				return res;
			});
		};
	
	this.linkedCmds = ['zipdl'];
	
	this.shortcuts = [{
		pattern     : 'shift+enter'
	}];
	
	this.getstate = function(select) {
		var sel    = this.hashes(select),
			cnt    = sel.length,
			maxReq = this.options.maxRequests || 10,
			mixed  = false,
			croot  = '';
		
		if (cnt < 1) {
			return -1;
		}
		cnt = filter(sel).length;
		
		return  (cnt && (zipOn || (cnt <= maxReq && ((!fm.UA.IE && !fm.UA.Mobile) || cnt == 1))) ? 0 : -1);
	};
	
	fm.bind('contextmenu', function(e){
		var fm = self.fm,
			helper = null,
			targets, file, link,
			getExtra = function(file) {
				var link = file.url || fm.url(file.hash);
				return {
					icon: 'link',
					node: $('<a/>')
						.attr({href: link, target: '_blank', title: fm.i18n('link')})
						.text(file.name)
						.on('mousedown click touchstart touchmove touchend contextmenu', function(e){
							e.stopPropagation();
						})
						.on('dragstart', function(e) {
							var dt = e.dataTransfer || e.originalEvent.dataTransfer || null;
							helper = null;
							if (dt) {
								var icon  = function(f) {
										var mime = f.mime, i, tmb = fm.tmb(f);
										i = '<div class="elfinder-cwd-icon '+fm.mime2class(mime)+' ui-corner-all"/>';
										if (tmb) {
											i = $(i).addClass(tmb.className).css('background-image', "url('"+tmb.url+"')").get(0).outerHTML;
										}
										return i;
									};
								dt.effectAllowed = 'copyLink';
								if (dt.setDragImage) {
									helper = $('<div class="elfinder-drag-helper html5-native">').append(icon(file)).appendTo($(document.body));
									dt.setDragImage(helper.get(0), 50, 47);
								}
								if (!fm.UA.IE) {
									dt.setData('elfinderfrom', window.location.href + file.phash);
									dt.setData('elfinderfrom:' + dt.getData('elfinderfrom'), '');
								}
							}
						})
						.on('dragend', function(e) {
							helper && helper.remove();
						})
				};
			};
		self.extra = null;
		if (e.data) {
			targets = e.data.targets || [];
			if (targets.length === 1 && (file = fm.file(targets[0])) && file.mime !== 'directory') {
				if (file.url != '1') {
					self.extra = getExtra(file);
				} else {
					// Get URL ondemand
					var node;
					self.extra = {
						icon: 'link',
						node: $('<a/>')
							.attr({href: '#', title: fm.i18n('getLink'), draggable: 'false'})
							.text(file.name)
							.on('click touchstart', function(e){
								if (e.type === 'touchstart' && e.originalEvent.touches.length > 1) {
									return;
								}
								var parent = node.parent();
								e.stopPropagation();
								e.preventDefault();
								parent.removeClass('ui-state-disabled').addClass('elfinder-button-icon-spinner');
								fm.request({
									data : {cmd : 'url', target : file.hash},
									preventDefault : true
								})
								.always(function(data) {
									parent.removeClass('elfinder-button-icon-spinner');
									if (data.url) {
										var rfile = fm.file(file.hash);
										rfile.url = data.url;
										node.replaceWith(getExtra(file).node);
									} else {
										parent.addClass('ui-state-disabled');
									}
								});

							})
					};
					node = self.extra.node;
					node.ready(function(){
						requestAnimationFrame(function(){
							node.parent().addClass('ui-state-disabled').css('pointer-events', 'auto');
						});
					});
				}
			}
		}
	}).one('open', function() {
		if (fm.api >= 2.1012) {
			czipdl = fm.getCommand('zipdl');
		}
		dlntf = fm.api > 2.1038 && !fm.isCORS;
	});
	
	this.exec = function(select) {
		var hashes  = this.hashes(select),
			fm      = this.fm,
			base    = fm.options.url,
			files   = filter(hashes, true),
			dfrd    = $.Deferred(),
			iframes = '',
			cdata   = '',
			targets = {},
			i, url,
			linkdl  = false,
			getTask = function(hashes) {
				return function() {
					var dfd = $.Deferred(),
						root = fm.file(fm.root(hashes[0])),
						single = (hashes.length === 1),
						volName = root? (root.i18 || root.name) : null,
						dir, dlName, phash;
					if (single) {
						if (dir = fm.file(hashes[0])) {
							dlName = (dir.i18 || dir.name);
						}
					} else {
						$.each(hashes, function() {
							var d = fm.file(this);
							if (d && (!phash || phash === d.phash)) {
								phash = d.phash;
							} else {
								phash = null;
								return false;
							}
						});
						if (phash && (dir = fm.file(phash))) {
							dlName = (dir.i18 || dir.name) + '-' + hashes.length;
						}
					}
					if (dlName) {
						volName = dlName;
					}
					volName && (volName = ' (' + volName + ')');
					fm.request({
						data : {cmd : 'zipdl', targets : hashes},
						notify : {type : 'zipdl', cnt : 1, hideCnt : true, msg : fm.i18n('ntfzipdl') + volName},
						cancel : true,
						eachCancel : true,
						preventDefault : true
					}).done(function(e) {
						var zipdl, dialog, btn = {}, dllink, form, iframe, m,
							uniq = 'dlw' + (+new Date());
						if (e.error) {
							fm.error(e.error);
							dfd.resolve();
						} else if (e.zipdl) {
							zipdl = e.zipdl;
							if (dlName) {
								m = fm.splitFileExtention(zipdl.name || '');
								dlName += m[1]? ('.' + m[1]) : '.zip';
							} else {
								dlName = zipdl.name;
							}
							if ((html5dl && (!fm.UA.Safari || fm.isSameOrigin(fm.options.url))) || linkdl) {
								url = fm.options.url + (fm.options.url.indexOf('?') === -1 ? '?' : '&')
								+ 'cmd=zipdl&download=1';
								$.each([hashes[0], zipdl.file, dlName, zipdl.mime], function(key, val) {
									url += '&targets%5B%5D='+encodeURIComponent(val);
								});
								$.each(fm.customData, function(key, val) {
									url += '&'+encodeURIComponent(key)+'='+encodeURIComponent(val);
								});
								url += '&'+encodeURIComponent(dlName);
								dllink = $('<a/>')
									.attr('href', url)
									.attr('download', fm.escape(dlName))
									.on('click', function() {
										dfd.resolve();
										dialog && dialog.elfinderdialog('destroy');
									});
								if (linkdl) {
									dllink.attr('target', '_blank')
										.append('<span class="elfinder-button-icon elfinder-button-icon-download"></span>'+fm.escape(dlName));
									btn[fm.i18n('btnCancel')] = function() {
										dialog.elfinderdialog('destroy');
									};
									dialog = self.fmDialog(dllink, {
										title: fm.i18n('link'),
										buttons: btn,
										width: '200px',
										destroyOnClose: true,
										close: function() {
											(dfd.state() !== 'resolved') && dfd.resolve();
										}
									});
								} else {
									click(dllink.hide().appendTo('body').get(0));
									dllink.remove();
								}
							} else {
								form = $('<form action="'+fm.options.url+'" method="post" target="'+uniq+'" style="display:none"/>')
								.append('<input type="hidden" name="cmd" value="zipdl"/>')
								.append('<input type="hidden" name="download" value="1"/>');
								$.each([hashes[0], zipdl.file, dlName, zipdl.mime], function(key, val) {
									form.append('<input type="hidden" name="targets[]" value="'+fm.escape(val)+'"/>');
								});
								$.each(fm.customData, function(key, val) {
									form.append('<input type="hidden" name="'+key+'" value="'+fm.escape(val)+'"/>');
								});
								form.attr('target', uniq).appendTo('body');
								iframe = $('<iframe style="display:none" name="'+uniq+'">')
									.appendTo('body')
									.ready(function() {
										form.submit().remove();
										dfd.resolve();
										setTimeout(function() {
											iframe.remove();
										}, 20000); // give 20 sec file to be saved
									});
							}
						}
					}).fail(function(error) {
						error && fm.error(error);
						dfd.resolve();
					});
					return dfd.promise();
				};
			},
			// use MouseEvent to click element for Safari etc
			click = function(a) {
				var clickEv;
				if (typeof MouseEvent === 'function') {
					clickEv = new MouseEvent('click');
				} else {
					clickEv = document.createEvent('MouseEvents');
					clickEv.initMouseEvent('click', true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
				}
				fm.pauseUnloadCheck(true);
				a.dispatchEvent(clickEv);
			},
			checkCookie = function(id) {
				var name = 'elfdl' + id,
					parts;
				parts = document.cookie.split(name + "=");
				if (parts.length === 2) {
					ntftm && clearTimeout(ntftm);
					document.cookie = name + '=; path=' + cpath + '; max-age=0';
					closeNotify();
				} else {
					setTimeout(function() { checkCookie(id); }, 200);
				}
			},
			closeNotify = function() {
				if (fm.ui.notify.children('.elfinder-notify-download').length) {
					fm.notify({
						type : 'download',
						cnt : -1
					});
				}
			},
			reqids = [],
			link, html5dl, fileCnt, clickEv, cid, ntftm, reqid;
			
		if (!files.length) {
			return dfrd.reject();
		}
		
		fileCnt = $.grep(files, function(f) { return f.mime === 'directory'? false : true; }).length;
		link = $('<a>').hide().appendTo('body');
		html5dl = (typeof link.get(0).download === 'string');
		
		if (zipOn && (fileCnt !== files.length || fileCnt >= (this.options.minFilesZipdl || 1))) {
			link.remove();
			linkdl = (!html5dl && fm.UA.Mobile);
			if (mixed) {
				targets = {};
				$.each(files, function(i, f) {
					var p = f.hash.split('_', 2);
					if (! targets[p[0]]) {
						targets[p[0]] = [ f.hash ];
					} else {
						targets[p[0]].push(f.hash);
					}
				});
				if (!linkdl && fm.UA.Mobile && Object.keys(targets).length > 1) {
					linkdl = true;
				}
			} else {
				targets = [ $.map(files, function(f) { return f.hash; }) ];
			}
			dfrd = fm.sequence($.map(targets, function(t) { return getTask(t); })).always(
				function() {
					fm.trigger('download', {files : files});
				}
			);
			return dfrd;
		} else {
			reqids = [];
			for (i = 0; i < files.length; i++) {
				url = fm.openUrl(files[i].hash, true);
				if (dlntf && url.substr(0, fm.options.url.length) === fm.options.url) {
					reqid = fm.getRequestId();
					reqids.push(reqid);
					url += '&cpath=' + cpath + '&reqid=' + reqid;
					ntftm = setTimeout(function() {
						fm.notify({
							type : 'download',
							cnt : 1,
							cancel : (fm.UA.IE || fm.UA.Edge)? void(0) : function() {
								if (reqids.length) {
									$.each(reqids, function() {
										fm.request({
											data: {
												cmd: 'abort',
												id: this
											},
											preventDefault: true
										});
									});
								}
								reqids = [];
							}
						});
					}, fm.notifyDelay);
					checkCookie(reqid);
				}
				if (html5dl && (!fm.UA.Safari || fm.isSameOrigin(url))) {
					click(link.attr('href', url)
						.attr('download', fm.escape(files[i].name))
						.get(0)
					);
				} else {
					if (fm.UA.Mobile) {
						setTimeout(function(){
							if (! window.open(url)) {
								fm.error('errPopup');
								ntftm && cleaerTimeout(ntftm);
								closeNotify();
							}
						}, 100);
					} else {
						iframes += '<iframe class="downloader" id="downloader-' + files[i].hash+'" style="display:none" src="'+url+'"/>';
					}
				}
			}
			link.remove();
			$(iframes)
				.appendTo('body')
				.ready(function() {
					setTimeout(function() {
						$(iframes).each(function() {
							$('#' + $(this).attr('id')).remove();
						});
					}, 20000 + (10000 * i)); // give 20 sec + 10 sec for each file to be saved
				});
			fm.trigger('download', {files : files});
			return dfrd.resolve();
		}
	};

};
