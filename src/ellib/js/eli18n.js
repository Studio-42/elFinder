/**
 * @class eli18n
 * Javascript applications localization 
 *
 * @param Object o - class options. Object. {textdomain : 'имя_группы_сообщений', messages : {textdomain1 : {}[, textdomain2 : {}]...}}
 *
 * Usage:
 * 
 * var msgs = { Hello : 'Превэд', 'Hello %user' : 'Превед %user' };
 * //load messages and set default textdomain
 * var translator = new eli18n( {textdomain : 'test', messages : {test : msgs}} )
 * window.console.log(translator.translate('Hello'));
 * window.console.log(translator.format('Hello %user', {user : 'David Blain'}))
 * // create new textdomain
 * translator.load({test2 : {'Goodbye' : 'Ja, deva mata!'} })
 * // and use it, without changing default one
 * window.console.log(translator.translate('Goodbye', 'test2'));
 *
 * @author:    Dmitry (dio) Levashov dio@std42.ru
 * license:   BSD license
 **/
function eli18n(o) {
	
	/**
	 * Get/set default textdomain
	 *
	 * @param String d new textdomain name
	 * @return String  default textdomain
	 **/
	this.textdomain = function(d) {
		return this.messages[d] ? this._domain = d : this._domain;
	}
	
	o && o.messages   && this.load(o.messages);
	o && o.textdomain && this.textdomain(o.textdomain);
}

eli18n.prototype = new function() {
	
	/**
	 * @var Object messages (key - messages in English or message handler, value - message in selected language)
	 **/
	this.messages = {};
	/**
	 * @var String default textdomain
	 **/
	this._domain   = '';
	
	/**
	 * Load new messages
	 *
	 * @param Object msgs - messages (key - textdomain name, value - messages Object)
	 * @return Object this
	 **/
	this.load = function(msgs) {
		if (typeof(msgs) == 'object') {
			for (var d in msgs) {
				var _msgs = msgs[d];
				if (typeof(_msgs) == 'object') {
					if (!this.messages[d]) {
						this.messages[d] = {}; 
					}
					for (var k in _msgs) {
						if (typeof(_msgs[k]) == 'string') {
							this.messages[d][k] = _msgs[k];
						}
					}
				}
			}
		}
		return this;
	}

	/**
	 * Return translated message, if message exists in required or default textdomain, otherwise returns original message
	 *
	 * @param  String msg - message
	 * @param  String d - textdomain. If empty, default textdomain will be used
	 * @return String translated message
	 **/
	this.translate = function(msg, d) {
		var d = d && this.messages[d] ? d : this._domain;
		return this.messages[d] && this.messages[d][msg] ? this.messages[d][msg] : msg;
		
	}
	
	/**
	 * Translate message and replace placeholders (%placeholder)
	 *
	 * @param  String  msg - message
	 * @param  Object  replacement for placeholders (keys - placeholders name without leading %, values - replacements)
	 * @param  String  d - textdomain. If empty, default textdomain will be used
	 * @return String  translated message
	 **/
	this.format = function(msg, data, d) {
		msg = this.translate(msg, d);
		if (typeof(data) == 'object') {
			for (var i in data) {
				msg = msg.replace('%'+i, this.translate(data[i], d));
			}
		}
		return msg;
	}
}
