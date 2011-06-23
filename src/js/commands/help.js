

elFinder.prototype.commands.help = function() {
	
	this.alwaysEnabled  = true;
	this.updateOnSelect = false;
	this.state = 0;
	
	
	this.getstate = function() {
		return 0;
	}
	
	this.exec = function() {
		alert('Dont panic!?');
	}

}