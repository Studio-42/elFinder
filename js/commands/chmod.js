/**
 * @class elFinder command "chmod".
 * Chmod files.
 *
 * @type  elFinder.command
 * @author Naoki Sawada
 */
elFinder.prototype.commands.chmod = function() {
	"use strict";
	this.updateOnSelect = false;
	var fm  = this.fm,
		level = {
			0 : 'owner',
			1 : 'group',
			2 : 'other'
		},
		msg = {
			read     : fm.i18n('read'),
			write    : fm.i18n('write'),
			execute  : fm.i18n('execute'),
			perm     : fm.i18n('perm'),
			kind     : fm.i18n('kind'),
			files    : fm.i18n('files')
		},
		isPerm = function(perm){
			return (!isNaN(parseInt(perm, 8) && parseInt(perm, 8) <= 511) || perm.match(/^([r-][w-][x-]){3}$/i));
		};

	this.tpl = {
		main       : '<div class="ui-helper-clearfix elfinder-info-title"><span class="elfinder-cwd-icon {class} ui-corner-all"></span>{title}</div>'
					+'{dataTable}',
		itemTitle  : '<strong>{name}</strong><span id="elfinder-info-kind">{kind}</span>',
		groupTitle : '<strong>{items}: {num}</strong>',
		dataTable  : '<table id="{id}-table-perm"><tr><td>{0}</td><td>{1}</td><td>{2}</td></tr></table>'
					+'<div class="">'+msg.perm+': <input class="elfinder-tabstop elfinder-focus" id="{id}-perm" type="text" size="4" maxlength="3" value="{value}"></div>',
		fieldset   : '<fieldset id="{id}-fieldset-{level}"><legend>{f_title}{name}</legend>'
					+'<input type="checkbox" value="4" class="elfinder-tabstop" id="{id}-read-{level}-perm"{checked-r}> <label for="{id}-read-{level}-perm">'+msg.read+'</label><br>'
					+'<input type="checkbox" value="6" class="elfinder-tabstop" id="{id}-write-{level}-perm"{checked-w}> <label for="{id}-write-{level}-perm">'+msg.write+'</label><br>'
					+'<input type="checkbox" value="5" class="elfinder-tabstop" id="{id}-execute-{level}-perm"{checked-x}> <label for="{id}-execute-{level}-perm">'+msg.execute+'</label><br>'
	};

	this.shortcuts = [{
		//pattern     : 'ctrl+p'
	}];

	this.getstate = function(sel) {
		var fm = this.fm;
		sel = sel || fm.selected();
		if (sel.length == 0) {
			sel = [ fm.cwd().hash ];
		}
		return this.checkstate(this.files(sel)) ? 0 : -1;
	};
	
	this.checkstate = function(sel) {
		var cnt = sel.length;
		if (!cnt) return false;
		var chk = $.grep(sel, function(f) {
			return (f.isowner && f.perm && isPerm(f.perm) && (cnt == 1 || f.mime != 'directory')) ? true : false;
		}).length;
		return (cnt == chk)? true : false;
	};

	this.exec = function(select) {
		var hashes  = this.hashes(select),
			files   = this.files(hashes);
		if (! files.length) {
			hashes = [ this.fm.cwd().hash ];
			files   = this.files(hashes);
		}
		var fm  = this.fm,
		dfrd    = $.Deferred().always(function() {
			fm.enable();
		}),
		tpl     = this.tpl,
		cnt     = files.length,
		file    = files[0],
		id = fm.namespace + '-perm-' + file.hash,
		view    = tpl.main,
		checked = ' checked="checked"',
		buttons = function() {
			var buttons = {};
			buttons[fm.i18n('btnApply')] = save;
			buttons[fm.i18n('btnCancel')] = function() { dialog.elfinderdialog('close'); };
			return buttons;
		},
		save = function() {
			var perm = $.trim($('#'+id+'-perm').val()),
				reqData;
			
			if (!isPerm(perm)) return false;
			
			dialog.elfinderdialog('close');
			
			reqData = {
				cmd     : 'chmod',
				targets : hashes,
				mode    : perm
			};
			fm.request({
				data : reqData,
				notify : {type : 'chmod', cnt : cnt}
			})
			.fail(function(error) {
				dfrd.reject(error);
			})
			.done(function(data) {
				if (data.changed && data.changed.length) {
					data.undo = {
						cmd : 'chmod',
						callback : function() {
							var reqs = [];
							$.each(prevVals, function(perm, hashes) {
								reqs.push(fm.request({
									data : {cmd : 'chmod', targets : hashes, mode : perm},
									notify : {type : 'undo', cnt : hashes.length}
								}));
							});
							return $.when.apply(null, reqs);
						}
					};
					data.redo = {
						cmd : 'chmod',
						callback : function() {
							return fm.request({
								data : reqData,
								notify : {type : 'redo', cnt : hashes.length}
							});
						}
					};
				}
				dfrd.resolve(data);
			});
		},
		setperm = function() {
			var perm = '';
			var _perm;
			for (var i = 0; i < 3; i++){
				_perm = 0;
				if ($("#"+id+"-read-"+level[i]+'-perm').is(':checked')) {
					_perm = (_perm | 4);
				}
				if ($("#"+id+"-write-"+level[i]+'-perm').is(':checked')) {
					_perm = (_perm | 2);
				}
				if ($("#"+id+"-execute-"+level[i]+'-perm').is(':checked')) {
					_perm = (_perm | 1);
				}
				perm += _perm.toString(8);
			}
			$('#'+id+'-perm').val(perm);
		},
		setcheck = function(perm) {
			var _perm;
			for (var i = 0; i < 3; i++){
				_perm = parseInt(perm.slice(i, i+1), 8);
				$("#"+id+"-read-"+level[i]+'-perm').prop("checked", false);
				$("#"+id+"-write-"+level[i]+'-perm').prop("checked", false);
				$("#"+id+"-execute-"+level[i]+'-perm').prop("checked", false);
				if ((_perm & 4) == 4) {
					$("#"+id+"-read-"+level[i]+'-perm').prop("checked", true);
				}
				if ((_perm & 2) == 2) {
					$("#"+id+"-write-"+level[i]+'-perm').prop("checked", true);
				}
				if ((_perm & 1) == 1) {
					$("#"+id+"-execute-"+level[i]+'-perm').prop("checked", true);
				}
			}
			setperm();
		},
		makeperm = function(files) {
			var perm = '777', ret = '', chk, _chk, _perm;
			var len = files.length;
			for (var i2 = 0; i2 < len; i2++) {
				chk = getPerm(files[i2].perm);
				if (! prevVals[chk]) {
					prevVals[chk] = [];
				}
				prevVals[chk].push(files[i2].hash);
				ret = '';
				for (var i = 0; i < 3; i++){
					_chk = parseInt(chk.slice(i, i+1), 8);
					_perm = parseInt(perm.slice(i, i+1), 8);
					if ((_chk & 4) != 4 && (_perm & 4) == 4) {
						_perm -= 4;
					}
					if ((_chk & 2) != 2 && (_perm & 2) == 2) {
						_perm -= 2;
					}
					if ((_chk & 1) != 1 && (_perm & 1) == 1) {
						_perm -= 1;
					}
					ret += _perm.toString(8);
				}
				perm = ret;
			}
			return perm;
		},
		makeName = function(name) {
			return name? ':'+name : '';
		},
		makeDataTable = function(perm, f) {
			var _perm, fieldset;
			var value = '';
			var dataTable = tpl.dataTable;
			for (var i = 0; i < 3; i++){
				_perm = parseInt(perm.slice(i, i+1), 8);
				value += _perm.toString(8);
				fieldset = tpl.fieldset.replace('{f_title}', fm.i18n(level[i])).replace('{name}', makeName(f[level[i]])).replace(/\{level\}/g, level[i]);
				dataTable = dataTable.replace('{'+i+'}', fieldset)
				                     .replace('{checked-r}', ((_perm & 4) == 4)? checked : '')
				                     .replace('{checked-w}', ((_perm & 2) == 2)? checked : '')
				                     .replace('{checked-x}', ((_perm & 1) == 1)? checked : '');
			}
			dataTable = dataTable.replace('{value}', value).replace('{valueCaption}', msg['perm']);
			return dataTable;
		},
		getPerm = function(perm){
			if (isNaN(parseInt(perm, 8))) {
				var mode_array = perm.split('');
				var a = [];

				for (var i = 0, l = mode_array.length; i < l; i++) {
					if (i === 0 || i === 3 || i === 6) {
						if (mode_array[i].match(/[r]/i)) {
							a.push(1);
						} else if (mode_array[i].match(/[-]/)) {
							a.push(0);
						}
					} else if ( i === 1 || i === 4 || i === 7) {
						 if (mode_array[i].match(/[w]/i)) {
							a.push(1);
						} else if (mode_array[i].match(/[-]/)) {
							a.push(0);
						}
					} else {
						if (mode_array[i].match(/[x]/i)) {
							a.push(1);
						} else if (mode_array[i].match(/[-]/)) {
							a.push(0);
						}
					}
				}
			
				a.splice(3, 0, ",");
				a.splice(7, 0, ",");

				var b = a.join("");
				var b_array = b.split(",");
				var c = [];
			
				for (var j = 0, m = b_array.length; j < m; j++) {
					var p = parseInt(b_array[j], 2).toString(8);
					c.push(p);
				}

				perm = c.join('');
			} else {
				perm = parseInt(perm, 8).toString(8);
			}
			return perm;
		},
		opts    = {
			title : this.title,
			width : 'auto',
			buttons : buttons(),
			close : function() { $(this).elfinderdialog('destroy'); }
		},
		dialog = fm.getUI().find('#'+id),
		prevVals = {},
		tmb = '', title, dataTable;

		if (dialog.length) {
			dialog.elfinderdialog('toTop');
			return $.Deferred().resolve();
		}

		view  = view.replace('{class}', cnt > 1 ? 'elfinder-cwd-icon-group' : fm.mime2class(file.mime));
		if (cnt > 1) {
			title = tpl.groupTitle.replace('{items}', fm.i18n('items')).replace('{num}', cnt);
		} else {
			title = tpl.itemTitle.replace('{name}', file.name).replace('{kind}', fm.mime2kind(file));
			tmb = fm.tmb(file);
		}

		dataTable = makeDataTable(makeperm(files), files.length == 1? files[0] : {});

		view = view.replace('{title}', title).replace('{dataTable}', dataTable).replace(/{id}/g, id);

		dialog = this.fmDialog(view, opts);
		dialog.attr('id', id);

		// load thumbnail
		if (tmb) {
			$('<img/>')
				.on('load', function() { dialog.find('.elfinder-cwd-icon').addClass(tmb.className).css('background-image', "url('"+tmb.url+"')"); })
				.attr('src', tmb.url);
		}

		$('#' + id + '-table-perm :checkbox').on('click', function(){setperm('perm');});
		$('#' + id + '-perm').on('keydown', function(e) {
			var c = e.keyCode;
			if (c == $.ui.keyCode.ENTER) {
				e.stopPropagation();
				save();
				return;
			}
		}).on('focus', function(e){
			$(this).trigger('select');
		}).on('keyup', function(e) {
			if ($(this).val().length == 3) {
				$(this).trigger('select');
				setcheck($(this).val());
			}
		});
		
		return dfrd;
	};
};
