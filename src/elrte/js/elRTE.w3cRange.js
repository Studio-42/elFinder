/**
 * @class w3cRange  - w3c text range emulation for "strange" browsers
 *
 * @param  elRTE  rte  объект-редактор
 *
 * @author:    Dmitry Levashov (dio) dio@std42.ru
 * Copyright: Studio 42, http://www.std42.ru
 **/
(function($) {
elRTE.prototype.w3cRange = function(rte) {
	var self                     = this;
	this.rte                     = rte;
	this.r                       = null;
	this.collapsed               = true;
	this.startContainer          = null;
	this.endContainer            = null;
	this.startOffset             = 0;
	this.endOffset               = 0;
	this.commonAncestorContainer = null;
	
	this.range = function() {
		try { 
			this.r = this.rte.window.document.selection.createRange(); 
		} catch(e) { 
			this.r = this.rte.doc.body.createTextRange(); 
		}
		return this.r;
	}
	
	this.insertNode = function(html) {
		this.range();
		self.r.collapse(false)
		var r = self.r.duplicate();
		r.pasteHTML(html);
	}
	
	this.getBookmark = function() {
		this.range();
		if (this.r.item) {
			var n = this.r.item(0);
			this.r = this.rte.doc.body.createTextRange();
			this.r.moveToElementText(n);
		}
		return this.r.getBookmark();
	}
	
	this.moveToBookmark = function(bm) {
		this.rte.window.focus();
		this.range().moveToBookmark(bm);
		this.r.select();
	}
	
	/**
	 * Обновляет данные о выделенных нодах
	 *
	 * @return void
	 **/
	this.update = function() {

		function _findPos(start) {
			var marker = '\uFEFF';
			var ndx = offset = 0;
			var r = self.r.duplicate();
			r.collapse(start);
			var p = r.parentElement();
			if (!p || p.nodeName == 'HTML') {
				return {parent : self.rte.doc.body, ndx : ndx, offset : offset};
			}

			r.pasteHTML(marker);
			
			childs = p.childNodes;
			for (var i=0; i < childs.length; i++) {
				var n = childs[i];
				if (i>0 && (n.nodeType!==3 || childs[i-1].nodeType !==3)) {
					ndx++;
				}
				if (n.nodeType !== 3) {
					offset = 0;
				} else {
					var pos = n.nodeValue.indexOf(marker);
					if (pos !== -1) {
						offset += pos;
						break;
					}
					offset += n.nodeValue.length;
				}
			};
			r.moveStart('character', -1);
			r.text = '';
			return {parent : p, ndx : Math.min(ndx, p.childNodes.length-1), offset : offset};
		}

		this.range();
		this.startContainer = this.endContainer = null;

		if (this.r.item) {
			this.collapsed = false;
			var i = this.r.item(0);
			this.setStart(i.parentNode, this.rte.dom.indexOf(i));
			this.setEnd(i.parentNode, this.startOffset+1);
		} else {
			this.collapsed = this.r.boundingWidth == 0;
			var start = _findPos(true); 
			var end   = _findPos(false);
			
			start.parent.normalize();
			end.parent.normalize();
			start.ndx = Math.min(start.ndx, start.parent.childNodes.length-1);
			end.ndx = Math.min(end.ndx, end.parent.childNodes.length-1);
			if (start.parent.childNodes[start.ndx].nodeType && start.parent.childNodes[start.ndx].nodeType == 1) {
				this.setStart(start.parent, start.ndx);
			} else {
				this.setStart(start.parent.childNodes[start.ndx], start.offset);
			}
			if (end.parent.childNodes[end.ndx].nodeType && end.parent.childNodes[end.ndx].nodeType == 1) {
				this.setEnd(end.parent, end.ndx);
			} else {
				this.setEnd(end.parent.childNodes[end.ndx], end.offset);
			}
			// this.dump();
			this.select();
		}
		return this;
	}
	
	this.isCollapsed = function() {
		this.range();
		this.collapsed = this.r.item ? false : this.r.boundingWidth == 0;
		return this.collapsed;
	}
	
	/**
	 * "Схлопывает" выделение
	 *
	 * @param  bool  toStart - схлопывать выделение к началу или к концу
	 * @return void
	 **/
	this.collapse = function(toStart) {
		this.range();
		if (this.r.item) {
			var n = this.r.item(0);
			this.r = this.rte.doc.body.createTextRange();
			this.r.moveToElementText(n);
		}
		this.r.collapse(toStart);
		this.r.select();
		this.collapsed = true;
	}

	this.getStart = function() {
		this.range();
		if (this.r.item) {
			return this.r.item(0);
		}
		var r = this.r.duplicate();
		r.collapse(true);
		var s = r.parentElement();
		return s && s.nodeName == 'BODY' ? s.firstChild : s;
	}
	
	
	this.getEnd = function() {
		this.range();
		if (this.r.item) {
			return this.r.item(0);
		}
		var r = this.r.duplicate();
		r.collapse(false);
		var e = r.parentElement();
		return e && e.nodeName == 'BODY' ? e.lastChild : e;
	}

	
	/**
	 * Устанавливает начaло выделения на указаную ноду
	 *
	 * @param  Element  node    нода
	 * @param  Number   offset  отступ от начала ноды
	 * @return void
	 **/
	this.setStart = function(node, offset) {
		this.startContainer = node;
		this.startOffset    = offset;
		if (this.endContainer) {
			this.commonAncestorContainer = this.rte.dom.findCommonAncestor(this.startContainer, this.endContainer);
		}
	}
	
	/**
	 * Устанавливает конец выделения на указаную ноду
	 *
	 * @param  Element  node    нода
	 * @param  Number   offset  отступ от конца ноды
	 * @return void
	 **/
	this.setEnd = function(node, offset) {
		this.endContainer = node;
		this.endOffset    = offset;
		if (this.startContainer) {
			this.commonAncestorContainer = this.rte.dom.findCommonAncestor(this.startContainer, this.endContainer);
		}
	}
	
	/**
	 * Устанавливает начaло выделения перед указаной нодой
	 *
	 * @param  Element  node    нода
	 * @return void
	 **/
	this.setStartBefore = function(n) {
		if (n.parentNode) {
			this.setStart(n.parentNode, this.rte.dom.indexOf(n));
		}
	}
	
	/**
	 * Устанавливает начaло выделения после указаной ноды
	 *
	 * @param  Element  node    нода
	 * @return void
	 **/
	this.setStartAfter = function(n) {
		if (n.parentNode) {
			this.setStart(n.parentNode, this.rte.dom.indexOf(n)+1);
		}
	}
	
	/**
	 * Устанавливает конец выделения перед указаной нодой
	 *
	 * @param  Element  node    нода
	 * @return void
	 **/
	this.setEndBefore = function(n) {
		if (n.parentNode) {
			this.setEnd(n.parentNode, this.rte.dom.indexOf(n));
		}
	}
	
	/**
	 * Устанавливает конец выделения после указаной ноды
	 *
	 * @param  Element  node    нода
	 * @return void
	 **/
	this.setEndAfter = function(n) {
		if (n.parentNode) {
			this.setEnd(n.parentNode, this.rte.dom.indexOf(n)+1);
		}
	}
	
	/**
	 * Устанавливает новое выделение после изменений
	 *
	 * @return void
	 **/
	this.select = function() {
		// thanks tinymice authors
		function getPos(n, o) {
			if (n.nodeType != 3) {
				return -1;
			}
			var c   ='\uFEFF';
			var val = n.nodeValue;
			var r   = self.rte.doc.body.createTextRange();
			n.nodeValue = val.substring(0, o) + c + val.substring(o);
			r.moveToElementText(n.parentNode);
			r.findText(c);
			var p = Math.abs(r.moveStart('character', -0xFFFFF));
			n.nodeValue = val;
			return p;
		};
		
		this.r = this.rte.doc.body.createTextRange(); 
		var so = this.startOffset;
		var eo = this.endOffset;
		var s = this.startContainer.nodeType == 1 
			? this.startContainer.childNodes[Math.min(so, this.startContainer.childNodes.length - 1)]
			: this.startContainer;
		var e = this.endContainer.nodeType == 1 
			? this.endContainer.childNodes[Math.min(so == eo ? eo : eo - 1, this.endContainer.childNodes.length - 1)]
			: this.endContainer;

		if (this.collapsed) {
			if (s.nodeType == 3) {
				var p = getPos(s, so);
				this.r.move('character', p);
			} else {
				this.r.moveToElementText(s);
				this.r.collapse(true);
			}
		} else {
			var r  = this.rte.doc.body.createTextRange(); 
			var sp = getPos(s, so);
			var ep = getPos(e, eo);
			if (s.nodeType == 3) {
				this.r.move('character', sp);
			} else {
				this.r.moveToElementText(s);
			}
			if (e.nodeType == 3) {
				r.move('character', ep);
			} else {
				r.moveToElementText(e);
			}
			this.r.setEndPoint('EndToEnd', r);
		}
		
		try {
			this.r.select();
		} catch(e) {
			
		}
		if (r) {
			r = null;
		}
	}
	
	this.dump = function() {
		this.rte.log('collapsed: '+this.collapsed);
		//this.rte.log('commonAncestorContainer: '+this.commonAncestorContainer.nodeName||'#text')
		this.rte.log('startContainer: '+(this.startContainer ? this.startContainer.nodeName : 'non'));
		this.rte.log('startOffset: '+this.startOffset);
		this.rte.log('endContainer: '+(this.endContainer ? this.endContainer.nodeName : 'none'));
		this.rte.log('endOffset: '+this.endOffset);
	}
	
}
})(jQuery);
