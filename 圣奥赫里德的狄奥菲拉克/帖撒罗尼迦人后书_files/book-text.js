(function textIndent() {
	'use strict';
	
	if (!('Map' in window)) return; // Chrome < 38, IE < 11 // @todo: use https://github.com/paulmillr/es6-shim
	
	var init = false;
	
	if (window.book && book.html) {
		run();
	} else {
		$(run);
		$(document).on('bookReady', run);
	}
	
	function run() {
		if (init) return;
		init = true;
		
		var $book = $('.book'),
			markers = [
				0x2022, 0x2023, 0x2043, 0x204C, 0x204D, 0x2219, 0x25E6, // bullet
				0x2d, 0x2010, 0x2011, 0x2012, 0x2013, 0x2014, 0x2015, 0x2212, 0xFE63, // dash
				0xab, 0xbb, 0x2018, 0x2019, 0x201a, 0x201b, 0x201c, 0x201d, 0x201e, 0x201f // quote
			];
		
		var ps = $book.find('.txt').not('.note .txt').get().filter(function(p) {
			var empty = !p.innerHTML.trim();
			if (empty) p.removeAttribute('class');
			return !empty;
		});
		if (!ps.length) return;
		
		var i, p, $p, text, code, div,
			uls = new Map(), // <div>, выполняющие функцию списков (с однострочными/маркированными <p>)
			childs = new Map();
		
		 $book.addClass('np');
		for (i = 0; i < ps.length; i++) {
			p = ps[i];
			$p = $(p);
			div = p.parentElement;
			
			if (Math.round($p.innerHeight() / parseFloat($p.css('line-height'))) === 1) {
				uls.set(div, uls.has(div) ? uls.get(div) + 1 : 1);
				if (!childs.has(div)) childs.set(div, div.childElementCount);
			} else {
				text = p.textContent.trim();
				code = text.charCodeAt(0);
				if (markers.indexOf(code) !== -1 ||
					(code >= 48 && code <= 57 && (/^\d+[.)]\s/.test(text) || /^\d{4}\s/.test(text))) ||
					(code >= 1072 && code <= 1105 && /^[а-яё][.)]\s/.test(text))
				) {
					uls.set(div, uls.has(div) ? uls.get(div) + 1 : 1);
					if (!childs.has(div)) childs.set(div, div.childElementCount);
					// @todo: в этом случае убрать indent, но оставить margin
					// @todo: проверка на text.indexOf(' \u2013 ')? (список определений)
				}
			}
		}
		$book.removeClass('np');
		
		uls.forEach(function(k, div) {
			if (childs.get(div) < 5) return;
			if (k / childs.get(div) > 0.9) $(div).not(':has(.foreign.lang)').addClass('np');
			// @todo: перенести проверку foreign.lang на уровень <p>
			// @todo: 0.9 не подходит для словарей, уменьшить // проверять indexOf(' \u2013 ')
		});
	}
})();
