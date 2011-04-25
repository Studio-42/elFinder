elFinder.prototype.commands.rename = function() {
	var self = this;
	
	this.input = $('<input type="text"/>')
		.bind('keydown keypress', function(e) {
			e.stopPropagation();
			if (e.type == 'keydown' && e.keyCode == 13) {
				e.preventDefault();
				$(this).blur();
			}
		})
		.bind('click dblclick', function(e) {
			e.stopPropagation()
		})
		.blur(function() {
			var input, name, prev, parent;
			
			if (self.input.is(':visible')) {
				// alert('rename')
				input  = self.input;
				parent = input.parent();
				name   = $.trim(input.val());
				prev   = input.data('name');
				input.after(name).detach();
				if (name != prev && !self.fm.rename(self.input.data('hash'), name)) {
					parent.text(prev)
				}
				
				
			}
			
			
		})
	
	this._handlers = {
		select : function() { self.input.blur(); self._update(); }
	}
	
	// this._shortcuts = [{
	// 	pattern     : 'delete ctrl+backspace',
	// 	description : 'Delete',
	// 	callback    : function() { self.exec(); }
	// }];
	
	this._getstate = function() {
		return this.fm.selected().length == 1 ? this._state.enabled : this._state.disabled;
	}
	
	this._exec = function() {
		var fm = this.fm,
			selected = fm.selected(),
			hash = selected.length == 1 ? selected[0] : '',
			file, ui, node, input, place;
		
		if (hash && (file = fm.file(hash))) {
			// fm.log(file)
			ui = fm.getUIDir();
			node = ui.getFile(hash)
			// fm.log(node)
			place = node.find('.elfinder-cwd-filename');
			
			if (place.length) {
				
				place.text('').append(this.input.val(file.name).data({hash : hash, name : file.name}))
				this.input.focus().select();
			}
			
			
		}

	}

}