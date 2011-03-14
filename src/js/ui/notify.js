
$.fn.elfindernotify = function(fm) {
	
	var types = {
		rm : {
			one  : 'Removing file.',
			many : 'Removing files.'
		},
		mkdir : {
			one  : 'Creating folder.',
			many : 'Creating folders.'
		},
		mkfile : {
			one  : 'Creating file.',
			many : 'Creating files.'
		},
		duplicate : {
			one  : 'Duplicate file.',
			many : 'Duplicate files.'
		},
		paste : {
			one  : 'Copy file.',
			many : 'Copy files.'
		}
	}
	
	return this.each(function() {
		var counter = {},
			count = function(cmd, data) {
				switch (cmd) {
					case 'mkdir':
					case 'mkfile':
						return 1;
					case 'rm':
					case 'paste':
						return data.targets.length;
				}
				return 0;
			},
			content = $('<div class="ui-widget-content ui-corner-bottom ui-clearfix"/>'),
			win = $(this).addClass('ui-helper-reset ui-widget ui-widget-content ui-corner-all elfinder-dialog elfinder-dialog-notify')
				.append('<div class="ui-widget-header ui-corner-top">&nbsp;</div>')
				.append(content)
				.hide()
				.draggable();
			
		
		fm.bind('ajaxstart ajaxstop ajaxerror', function(e) {
			var cmd = e.data.request.cmd,
				num, n, c, msg;
			
			if (types[cmd]) {
				c = 'elfinder-notify-'+cmd;
				num = count(cmd, e.data.request);
				
				if (!counter[cmd]) {
					counter[cmd] = 0;
				}
				if (e.type == 'ajaxstart') {
					counter[cmd] += count(cmd, e.data.request);
				} else {
					counter[cmd] -= count(cmd, e.data.request);
				}

				n = content.find('.'+c);
				
				if (counter[cmd] > 0) {
					if (!n.length) {
						n = $('<div class="elfinder-notify-type '+c+'"><div class="elfinder-notify-msg"/><div class="elfinder-notify-spinner"/><span class="elfinder-dialog-icon"/></div>')
							.appendTo(content);
					}
					msg = counter[cmd] == 1
						? fm.i18n(types[cmd].one)
						: fm.i18n(types[cmd].many) + ' ('+counter[cmd]+')';
					n.children('.elfinder-notify-msg').text(msg);
				} else {
					counter[cmd] = 0;
					n.remove();
				}
				win[content.children().length ? 'show' : 'hide']();
			}
			
		});
			
	});
}