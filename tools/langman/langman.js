window.elFinder = function(){};
elFinder.prototype.i18 = {};
(function($){
	$(document).ready(function(){
		var tbl = $('#content');
		var cl = 'even';
		var elf = new elFinder();
		var asMaster = '2.1';
		var src = {}, keys = {}, tpl, locprms, hash, branch, lang;
		var glbs = {
			'translator'      : 'Your name &lt;translator@email.tld&gt;',
			'language'        : 'Name of this language',
			'direction'       : '"ltr"(Left to right) or "rtl"(Right to left)',
			'dateFormat'      : 'For example: "d.m.Y H:i", "M d, Y h:i A", "Y/m/d h:i A" etc.',
			'fancyDateFormat' : '"$1" is replaced "Today" or "Yesterday"'
		};
		var setTitle = function(){
			$('title').text($('title').text().replace(/(elFinder)( [0-9.]+)?/, '$1 '+branch));
			$('#title').html($('#title').html().replace(/(elFinder)( [0-9.]+)?/, '$1 '+branch));
		};
		var init = function(){
			setTitle();
			$("#selbr").val(branch);
			$('#glbs').empty();
			$('#content').empty();
			$('#step').hide();
			src = {};
			keys = {};
			$.getScript('./'+branch+'/i18n/elfinder.LANG.js', function() {
				var hTable;
				$.each(elf.i18.REPLACE_WITH_xx_OR_xx_YY_LANG_CODE.messages, function(k, v){
					var key = k.replace(/[ \.]/g, '_');
					src[key] = v;
					keys[key] = k;
				});
				
				$.get('./'+branch+'/i18n/elfinder.LANG.js', {}, function(data){
					tpl = data;
				});
				$('#lngbtn').on('click focus', function(){
					lang = $('#lng').val();
					
					var slng = elf.i18.REPLACE_WITH_xx_OR_xx_YY_LANG_CODE;
					var make;
					var filename = './'+branch+'/i18n/elfinder.'+lang+'.js';
					var tgt = (branch == asMaster)? 'master' : branch + '-src';
					var isNew = false;

					$('#made').val('');
					location.hash = '#'+branch+':'+lang;

					$.getScript(filename)
					.done(function(){
						make = $.extend(true, {}, slng, elf.i18[lang]);
						$('a.editgh').attr('href', 'https://github.com/Studio-42/elFinder/edit/'+tgt+'/js/i18n/elfinder.'+lang+'.js');
					})
					.fail(function(){
						isNew = true;
						make = $.extend(true, {}, slng);
						$('a.editgh').attr('href', 'https://github.com/Studio-42/elFinder/new/'+tgt+'/js/i18n');
						$('#step .step-edit-or-new').html('Input "elfinder.'+lang+'.js" to new file name.');
					})
					.always(function(){
						$('span.langname').text(lang);
						$('span.targetb').text(tgt);
						$.each(glbs, function(k, v){
							var t = $('#glbs-txt-' + k);
							var val = make[k].replace(/&lt;/g, '<').replace(/&gt;/g, '>');
							if (!isNew && t.length > 0) {
								$('#glbs-' + k).data('default', val);
								t.html(make[k] + ', <br>');
							} else {
								$('#glbs-' + k).data('default', '');
								if (!isNew) {
									$('#glbs-' + k).val(val);
								} else {
									if (k === 'translator' || k === 'language') {
										$('#glbs-' + k).val('');
									} else {
										$('#glbs-' + k).val(val);
									}
								}
								t.html('');
							}
							if (k === 'translator') {
								$('#glbs-' + k).val('').attr('placeholder', slng[k].replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
							}
						});
						$.each(src, function(k, v){
							$('#inp-'+k).val(make.messages[keys[k]])[(make.messages[keys[k]] == src[k])?'addClass':'removeClass']('same');
						});
					});
				});
				$('#lng').on('keydown', function(e){
					if (e.keyCode == 13) {
						$('#lngbtn').trigger('click');
					}
				});
				$('#make').on('click', function(){
					var date = new Date();
					var year = date.getFullYear();
					var month = date.getMonth() + 1;
					var day = date.getDate();
					  
					if ( month < 10 ) {
						month = '0' + month;
					}  
					if ( day < 10 ) {
						day = '0' + day;
					}  

					var lng = $('#lng').val();
					var made = tpl;
					var language = $('#glbs-language').val();
					var head = '/**\n * '+language+' translation\n';
					var authors = ($('#glbs-translator').data('default') || '').split(',').concat($('#glbs-translator').val().split(','));
					$.each(authors, function(k, v){
						if (v.trim()) {
							head += ' * @author '+v.trim()+'\n';
						}
					});
					head += ' * @version '+year+'-'+month+'-'+day+'\n';
					head += ' */\n';
					made = head + made.replace(/^[\s\S]+?(\(function)/, '$1')
					.replace(/(elFinder\.prototype\.i18\.)REPLACE_WITH_xx_OR_xx_YY_LANG_CODE( = {)/, '$1'+lng+'$2')
					.replace(/(\/\*\*\s+\* )XXXXX( translation)/, '$1'+language+'$2');
					$.each(glbs, function(k, v){
						var reg = new RegExp('(\\b'+k+'\\b\\s*:\\s*\').+(\')');
						var def = $('#glbs-'+k).data('default');
						var val = $('#glbs-'+k).val();
						if (def) {
							val = def + (val? ', ' + val : '');
						}
						made = made.replace(reg, function(str, p1, p2){return p1+val.replace(/\\(?=')/, '').replace('\\', '\\\\').replace(/'/g, "\\'").replace(/</g, '&lt;').replace(/>/g, '&gt;')+p2;});
					});
					$.each(src, function(k, v){
						var reg = new RegExp('(\''+keys[k]+'\'\\s*:\\s*\').+(\')');
						made = made.replace(reg, function(str, p1, p2){return p1+$('#inp-'+k).val().replace(/\\(?=')/, '').replace('\\', '\\\\').replace(/'/g, "\\'")+p2;});
					});
					$('#step').show();
					$('#made').val(made.replace(/[ \t]+([\r\n])/g, '$1'));
				});
				$('#content').on('change', 'input', function(){
					var k = this.id.substr(4);
					$(this)[($(this).val() == src[k])?'addClass':'removeClass']('same');
				});

				hTable = $('<table class="header"/>').appendTo($('#glbs'));
				$.each(glbs, function(k, v){
					var inp = '';
					if (k === 'translator') {
						inp = '<span id="glbs-txt-'+k+'"></span>';
					}
					inp += '<input id="glbs-'+k+'" class="'+k+'" type="text"><span class="note">'+v+'</span>';
					$('<tr/>').append('<td class="caption">'+k+'</td><td class="input">'+inp+'</td>').appendTo(hTable);
				});
				$.each(src, function(k, v){
					cl = (cl == 'even')? 'odd' : 'even';
					tbl.append($('<tr class="'+cl+'"><td id="en-'+k+'" title="'+keys[k]+'">'+v+'</td><td id="lng-'+k+'"><input id="inp-'+k+'" class="mesinp" type="text" title="'+keys[k]+'"></input></td></tr>'));
				});
				$('span.branch').text(branch);
				
				if (lang) {
					$('#lng').val(lang);
					$('#lngbtn').trigger('click');
				}
				$('#made').val('Please click a button [Make it!] .');
				
			});
		};

		hash = location.hash.replace(/^#/, '').match(/(2\.[01])(?::([a-zA-Z0-9-]{2,5}))/);
		branch = (hash && hash[1])? hash[1] : '2.1';
		lang = (hash && hash[2])? hash[2] : '';

		$('#selbr').on('change', function(e){
			branch = $(this).find('option:selected').val();
			init();
			$('#lngbtn').trigger('click');
		});

		init();
	});
})(jQuery);
