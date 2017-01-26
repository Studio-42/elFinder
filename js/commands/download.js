"use strict";
/**
 * @class elFinder command "download". 
 * Download selected files.
 * Only for new api
 *
 * @author Dmitry (dio) Levashov, dio@std42.ru
 **/
elFinder.prototype.commands.zipdl = function() {};
elFinder.prototype.commands.download = function() {
	var self   = this,
		fm     = this.fm,
		zipOn  = false,
		mixed  = false,
		filter = function(hashes, inExec) {
			var czipdl = (fm.api > 2)? fm.getCommand('zipdl') : null,
				volumeid, mixedCmd;
			
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
				hashes = $.map(hashes, function(h) {
					var f = fm.file(h),
						res = (! f || (! czipdl && f.mime === 'directory') || ! fm.isCommandEnabled(mixedCmd, h))? null : h;
					if (f && inExec && ! res) {
						$('#' + fm.cwdHash2Id(f.hash)).trigger('unselect');
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
			
			return $.map(self.files(hashes), function(f) { 
				var res = (! f.read || (! zipOn && f.mime == 'directory')) ? null : f;
				if (inExec && ! res) {
					$('#' + fm.cwdHash2Id(f.hash)).trigger('unselect');
				}
				return res;
			});
		};
	
	this.linkedCmds = ['zipdl'];
	
	this.shortcuts = [{
		pattern     : 'shift+enter'
	}];
	
	this.getstate = function(sel) {
		var sel    = this.hashes(sel),
			cnt    = sel.length,
			maxReq = this.options.maxRequests || 10,
			czipdl = (fm.api > 2)? fm.getCommand('zipdl') : null,
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
						setTimeout(function(){
							node.parent().addClass('ui-state-disabled').css('pointer-events', 'auto');
						}, 10);
					});
				}
			}
		}
	});
	
	this.exec = function(hashes) {
		var hashes  = this.hashes(hashes),
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
						volName = root? ' ('+(root.i18 || root.name)+')' : '';
					fm.request({
						data : {cmd : 'zipdl', targets : hashes},
						notify : {type : 'zipdl', cnt : 1, hideCnt : true, msg : fm.i18n('ntfzipdl') + volName},
						cancel : true,
						preventDefault : true
					}).done(function(e) {
						var zipdl, dialog, btn = {}, dllink, form, iframe,
							uniq = 'dlw' + (+new Date());
						if (e.error) {
							fm.error(e.error);
							dfd.resolve();
						} else if (e.zipdl) {
							zipdl = e.zipdl;
							if (linkdl || (!html5dl && fm.UA.Mobile)) {
								url = fm.options.url + (fm.options.url.indexOf('?') === -1 ? '?' : '&')
								+ 'cmd=zipdl&download=1';
								$.each([hashes[0], zipdl.file, zipdl.name, zipdl.mime], function(key, val) {
									url += '&targets%5B%5D='+encodeURIComponent(val);
								});
								$.each(fm.options.customData, function(key, val) {
									url += '&'+encodeURIComponent(key)+'='+encodeURIComponent(val);
								});
								url += '&'+encodeURIComponent(zipdl.name);
								dllink = $('<a/>')
									.attr('href', url)
									.attr('download', encodeURIComponent(zipdl.name))
									.attr('target', '_blank')
									.on('click', function() {
										dfd.resolve();
										dialog.elfinderdialog('destroy');
									})
									.append('<span class="elfinder-button-icon elfinder-button-icon-download"></span>'+fm.escape(zipdl.name));
								btn[fm.i18n('btnCancel')] = function() {
									dialog.elfinderdialog('destroy');
								};
								dialog = fm.dialog(dllink, {
									title: fm.i18n('link'),
									buttons: btn,
									width: '200px',
									destroyOnClose: true,
									close: function() {
										(dfd.state() !== 'resolved') && dfd.resolve();
									}
								});
							} else {
								form = $('<form action="'+fm.options.url+'" method="post" target="'+uniq+'" style="display:none"/>')
								.append('<input type="hidden" name="cmd" value="zipdl"/>')
								.append('<input type="hidden" name="download" value="1"/>');
								$.each([hashes[0], zipdl.file, zipdl.name, zipdl.mime], function(key, val) {
									form.append('<input type="hidden" name="targets[]" value="'+fm.escape(val)+'"/>');
								});
								$.each(fm.options.customData, function(key, val) {
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
			link, html5dl;
			
		if (!files.length) {
			return dfrd.reject();
		}
		
		link = $('<a>').hide().appendTo($('body'));
		html5dl = (typeof link.get(0).download === 'string');
		
		if (zipOn && (files.length > 1 || files[0].mime === 'directory')) {
			link.remove();
			if (mixed) {
				linkdl = fm.UA.Mobile;
				targets = {};
				$.each(files, function(i, f) {
					var p = f.hash.split('_', 2);
					if (! targets[p[0]]) {
						targets[p[0]] = [ f.hash ];
					} else {
						targets[p[0]].push(f.hash);
					}
				});
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
			for (i = 0; i < files.length; i++) {
				url = fm.openUrl(files[i].hash, true);
				if (html5dl) {
					link.attr('href', url)
					.attr('download', encodeURIComponent(files[i].name))
					.attr('target', '_blank')
					.get(0).click();
				} else {
					if (fm.UA.Mobile) {
						setTimeout(function(){
							if (! window.open(url)) {
								fm.error('errPopup');
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
