(function scrollToChapter(undefined) {
	'use strict';
	
	$('#loading_screen').show();

	var $to = false,
		jump = true,
		loaded = false,
		checkInterval,
		scrollDone = false,
		observer;
	
	let finalize = ()=>{
		if(scrollDone) return;
		
		$('#loading_screen').hide();
		scrollDone = true;
		if(observer) observer.disconnect();
		clearInterval(checkInterval);
		console.log('Finalized intial scrolling');
	};
	
	let needScrollResult = null;
	let needScroll = ()=>{
		if(needScrollResult === null){
			let hashMatch = !!location.hash && location.hash.indexOf('#sel=') < 0,	//Маша прокрутит сама
				jumpMatch = !!book.jump,
				pathnameMatch = !!location.pathname.match(/\d{1,3}_\d{1,3}$/),
				lsMatch = !!localStorage.getItem('az_ot_highlight');
		
			console.log('needScroll :: ', 'hash', hashMatch, 'jump', jumpMatch, 'pathname', pathnameMatch, 'LS', lsMatch);
			needScrollResult = hashMatch || jumpMatch || pathnameMatch || lsMatch;
		}
		
		return needScrollResult;
	};
	
	let chooseScrollMethod = ()=>{
		if(scrollDone) return false;
	
		if( !needScroll() || scrollToHash() || scrollToJump() || highlightByLocalStorage() )
			finalize();
	};
	
	//init
	if(window.az_book_ready){
		console.log('az_book_ready');
		chooseScrollMethod();
	}else{
		//Проверяем по мере подгрузки, появился ли элемент, к которому нужно прокрутить
		var MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
		if(MutationObserver){
			observer = new MutationObserver(mutationsList=>{ 
				console.log('Mutation');
				chooseScrollMethod(); 
			});
			observer.observe(document.querySelector('body'), { childList:true, subtree:true });
		}else{
			checkInterval = setInterval(chooseScrollMethod, 150);
		}
		
		$(window).on('load', ()=>{
			loaded = true;
			chooseScrollMethod();
			finalize();
		});
	}
	
	// scroll methods
	
	function scrollToHash (){
		if ('scrollRestoration' in history)
			history.scrollRestoration = 'auto';
		
		var path = location.hash.substr(1);
		if (path && (/^p(\d+-)+\d+$/.test(path) || /^z(\d+-)*\d+$/.test(path))) {
			path = path.substr(1).split('-');
			path[0]++;	//Индекс почему-то всегда попадает в заголовок, а должен в div за ним.
			$to = $('.book > :nth-child(' + path.join(') > :nth-child(') + ')');
			if (!$to.length && path.length > 1 && path[0] >= 15 && path[0] <= 20) {
				// @fixme: первому сдвигу нельяз доверять (зависит от наличия формы в шаблоне)
				$to = $('.book > .img-ico').first().nextAll('div:visible').first().find(' > :nth-child(' + path.slice(1).join(') > :nth-child(') + ')');
			}
			if (!$to.length && path.length > 1) {
				// @fixme: последнему сдвигу нельяз доверять (зависит от наличия выделения маши/поиска)
				$to = $('.book > :nth-child(' + path.slice(0,-1).join(') > :nth-child(') + ')');
			}
			if ($to.length) {
				jump = false;
				console.log('scrollToHash found');
				
				return scrollToJump();
			}
		}
		
		return false;
	}

	function scrollToJump() {
		
		if (!$to) $to = find();
		if (!$to || !$to.length){
			console.log('scrollToJump target not found');
			
			return false;
		}
		
		console.log('scrollToJump go');
			
		if (!loaded && ('scrollRestoration' in history)) history.scrollRestoration = 'manual';
		if ($to[0].scrollIntoView) $to[0].scrollIntoView({behavior: jump ? 'instant' : 'smooth', block: 'start'});
		else $('html, body').animate({scrollTop: $to.offset().top}, jump ? 0 : 400);
		
		return true;
	}

	function find() {
		if (book.jump) {
			var $jump = $(book.jump), $hash;
			if (!$jump.attr('id')) $(function() {$(document).triggerHandler('clearHighlight')});
			if (/^#\w+$/.test(location.hash) && ($hash = $(location.hash)).length && $hash[0].className === $jump[0].className) {
				book.jump = location.hash;
				$jump = $hash;
			}
			return $jump;
		}

		var base = location.pathname.match(/\/([\d_]+)$/), anchor,
			exact = [], $target;

		if (!base) return false;
		base = base[1].split('_');
		if (base.length < 2) return false;
		// доверяем якорям только если в документе есть якорь первой главы или нет якоря текущей главы
		// - https://azbyka.ru/otechnik/Istorija_Tserkvi/tserkovnaja-revolyutsija-1917-goda/5_1
		// + https://azbyka.ru/otechnik/pravila/dejanija-vselenskikh-soborov-tom2/1_2_67 (1_2_66_1)
		if ($('a[id$="_1"]').filter(function() {return /\d+_1$/.test(this.id)}).length || !$('a[id="'+base[0]+'"]').length)
			while (base.length && !(anchor = document.getElementById(base.join('_')))) exact.unshift(base.pop());
		else
			exact = base;

		if (anchor) {
			$target = $(anchor).find('~ div').first();
		} else if ((exact = exact.slice(book.part)).length) {
			$target = $('h1 + div').has('p');
		} else {
			return false;
		}

		var i, h,
			hClass = '.text-center'; // для фильтрации заголовков, являющихся частью содержимого, например в
			                         // https://azbyka.ru/otechnik/Nikolaj_Pestov/sovremennaja-praktika-pravoslavnogo-blagochestija-tom-2/4_4_3
		
		if(exact.length === 1){
			let headers = $target.find('h2.text-center');
			let $found = headers.eq(exact[0] - 1).next('div');
			
			if(loaded && !$found.length){ //Поиск по всем заголовкам (могут быть не только h2 если некорректно составлены оглавления)
				let headers = $target.find('h2,h3,h4,h5,h6').filter('.text-center');
				$found = headers.eq(exact[0] - 1).next('div');
			}
			
			$target = $found;
		}else{	//Многоуровневый поиск		
			for (i in exact) {
				// @todo: проверить, остались ли ещё книги с разделением на div'ы без инкремента уровня заголовков (<div><h2><div><h2>...</>)
				if (h = $target.find('> :header'+hClass+':first')[0]) 
					h = h.tagName; 
				else 
					break;
				
				$target = $target.find(h+hClass).eq(exact[i] - 1).next('div');
			}
		}

		$target = $target.prev();
		
		if (!$target[0]) return false;
		
		return $target;
	}
	
	// search localstorage highlight (хак для старых цитат без обратных ссылок на отрывок)
	let highligtDone = false;
	
	function highlightByLocalStorage(){
		if(highligtDone || scrollDone) return false;
		
		let phrase = localStorage.getItem('az_ot_highlight');
		if(phrase){
			let pts = phrase.split(' '), first = pts[0], last = pts[pts.length-1];
			let firstNode = null, lastNode = null, firstIndex, lastIndex;
			
			$('p.txt').each(function(){
				for(let node of this.childNodes){
					if(node.nodeType == Node.TEXT_NODE){
						if(!firstNode && ( firstIndex = node.textContent.indexOf(first) ) > -1){
							firstNode = node;
						}else if(firstNode && !lastNode && ( lastIndex = node.textContent.indexOf(last) ) > -1 ){
							lastNode = node;
						}
					}
				}
			});
			
			if(firstNode && lastNode){
				console.log('highlightByLocalStorage go');
				
				var r = document.createRange();
				r.setStart(firstNode, firstIndex);
				r.setEnd(lastNode, lastIndex + last.length);

				var s = window.getSelection();
				s.removeAllRanges();
				s.addRange(r);
				
				$('html, body').animate({scrollTop: $(firstNode.parentNode).offset().top }, 500 );
				
				highligtDone = true;
				
				return true;
			}
		}
		
		return false;
	}
})();