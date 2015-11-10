window.elFinder = function(){};
elFinder.prototype.i18 = {};
(function($){
	$(document).ready(function(){
		var tbl = $('#content');
		var cl = 'even';
		var elf = new elFinder();
		var as2x = '2.1';
		var src = {}, keys = {}, tpl, locprms, hash, branch, lang;
		var glbs = ['translator', 'language', 'direction', 'dateFormat', 'fancyDateFormat'];
		var setTitle = function(){
			$('title').text($('title').text().replace(/(elFinder)( [0-9.]+)?/, '$1 '+branch));
			$('#title').html($('#title').html().replace(/(elFinder)( [0-9.]+)?/, '$1 '+branch));
		};
		var init = function(branch){
			setTitle();
			$('#glbs').empty();
			$('#content').empty();
			src = {};
			keys = {};
			$.getScript('./'+branch+'/i18n/elfinder.LANG.js', function() {
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
					var tgt = (branch == as2x)? '2.x' : branch;

					$('#made').val('');
					location.hash = '#'+branch+':'+lang;

					$.getScript(filename)
					.done(function(){
						make = $.extend(true, {}, slng, elf.i18[lang]);
						$('#editgh').attr('href', 'https://github.com/Studio-42/elFinder/edit/'+tgt+'/js/i18n/elfinder.'+lang+'.js');
					})
					.fail(function(){
						make = $.extend(true, {}, slng);
						$('#editgh').attr('href', 'https://github.com/Studio-42/elFinder/new/'+tgt+'/js/i18n');
					})
					.always(function(){
						$('.langname').text(lang);
						$.each(glbs, function(k, v){
							$('#glbs-'+v).val(make[v].replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
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
					var authors = $('#glbs-translator').val().split(',');
					$.each(authors, function(k, v){
						head += ' * @author '+v.trim()+'\n';
					});
					head += ' * @version '+year+'-'+month+'-'+day+'\n';
					head += ' */\n';
					made = head + made.replace(/^[\s\S]+(if \(elFinder)/, '$1')
					.replace(/(elFinder\.prototype\.i18\.)REPLACE_WITH_xx_OR_xx_YY_LANG_CODE( = {)/, '$1'+lng+'$2')
					.replace(/(\/\*\*\s+\* )XXXXX( translation)/, '$1'+language+'$2');
					$.each(glbs, function(k, v){
						var reg = new RegExp('(\\b'+v+'\\b\\s*:\\s*\').+(\')');
						made = made.replace(reg, function(str, p1, p2){return p1+$('#glbs-'+v).val().replace(/'/g, "\\'").replace(/</g, '&lt;').replace(/>/g, '&gt;')+p2;});
					});
					$.each(src, function(k, v){
						var reg = new RegExp('(\''+keys[k]+'\'\\s*:\\s*\').+(\')');
						made = made.replace(reg, function(str, p1, p2){return p1+$('#inp-'+k).val().replace(/'/g, "\\'")+p2;});
					});
					$('#made').val(made.replace(/[ \t]+([\r\n])/g, '$1'));
				});
				$('#content').on('change', 'input', function(){
					var k = this.id.substr(4);
					$(this)[($(this).val() == src[k])?'addClass':'removeClass']('same');
				});

				$.each(glbs, function(k, v){
					$('#glbs').append($('<div>')).append(v+': <input id="glbs-'+v+'" class="'+v+'" type="text">');
				});
				$.each(src, function(k, v){
					cl = (cl == 'even')? 'odd' : 'even';
					tbl.append($('<tr class="'+cl+'"><td id="en-'+k+'" title="'+k+'">'+v+'</td><td id="lng-'+k+'"><input id="inp-'+k+'" class="mesinp" type="text" title="'+k+'"></input></td></tr>'));
				});
				$('span.branch').text(branch);
				
				if (lang) {
					$('#lng').val(lang);
					$('#lngbtn').trigger('click');
				}
				$('#made').val('');
				
			});
		};

		hash = location.hash.replace(/^#/, '').match(/(2\.[01])(?::([a-zA-Z0-9-]{2,5}))/);
		branch = (hash && hash[1])? hash[1] : '2.1';
		lang = (hash && hash[2])? hash[2] : '';

		$('#selbr').on('change', function(e){
			branch = $(this).find('option:selected').val();
			init(branch);
			$('#lngbtn').trigger('click');
		});

		init(branch);
	});
})(jQuery);
