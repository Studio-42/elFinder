"use strict";
/**
 * @class elFinder command "download". 
 * Download selected files.
 * Only for new api
 *
 * @author Dmitry (dio) Levashov, dio@std42.ru
 **/
elFinder.prototype.commands.download = function() {
	var self   = this,
		fm     = this.fm,
		filter = function(hashes) {
			return $.map(self.files(hashes), function(f) { return f.mime == 'directory' ? null : f; });
		};
	
	this.shortcuts = [{
		pattern     : 'shift+enter'
	}];
	
	this.getstate = function() {
		var sel = this.fm.selected(),
			cnt = sel.length;
		
		return  !this._disabled && cnt && ((!fm.UA.IE && !fm.UA.Mobile) || cnt == 1) && cnt == filter(sel).length ? 0 : -1;
	};
	
	this.fm.bind('contextmenu', function(e){
		var fm = self.fm,
			helper = null,
			targets, file, link;
		self.extra = null;
		if (e.data) {
			targets = e.data.targets || [];
			if (targets.length === 1) {
				if (file = fm.file(targets[0])) {
					if (file.mime !== 'directory' && file.url != '1') {
						link = file.url || fm.url(file.hash);
						self.extra = {
							icon: 'link',
							node: $('<a/>')
								.attr({href: link, target: '_blank', title: fm.i18n('link')})
								.text(file.name)
								.on('mousedown click touchstart touchmove touchend contextmenu', function(e){
									var cm = fm.getUI('contextmenu');
									e.stopPropagation();
									// 'mouseEvInternal' for Firefox's bug (maybe)
									cm.data('mouseEvInternal', true);
									setTimeout(function(){
										cm.data('mouseEvInternal', false);
									}, 500);
								})
								.on('dragstart', function(e) {
									var dt = e.dataTransfer || e.originalEvent.dataTransfer || null;
									helper = null;
									if (dt) {
										var icon  = function(f) {
												var mime = f.mime, i;
												i = '<div class="elfinder-cwd-icon '+fm.mime2class(mime)+' ui-corner-all"/>';
												if (f.tmb && f.tmb !== 1) {
													i = $(i).css('background', "url('"+fm.option('tmbUrl')+f.tmb+"') center center no-repeat").get(0).outerHTML;
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
					}
				}
			}
		}
	});
	
	
	this.exec = function(hashes) {
		var fm      = this.fm,
			base    = fm.options.url,
			files   = filter(hashes),
			dfrd    = $.Deferred(),
			iframes = '',
			cdata   = '',
			i, url;
			
		if (this.disabled()) {
			return dfrd.reject();
		}
		
		var url,
			link    = $('<a>').hide().appendTo($('body')),
			html5dl = (typeof link.get(0).download === 'string');
		for (i = 0; i < files.length; i++) {
			url = fm.openUrl(files[i].hash, true);
			if (html5dl) {
				link.attr('href', url)
				.attr('download', files[i].name)
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
				}, fm.UA.Firefox? (20000 + (10000 * i)) : 1000); // give mozilla 20 sec + 10 sec for each file to be saved
			});
		fm.trigger('download', {files : files});
		return dfrd.resolve(hashes);
	};

};