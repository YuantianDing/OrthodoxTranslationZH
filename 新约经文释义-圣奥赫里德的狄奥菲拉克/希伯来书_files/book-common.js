window.localStorage && localStorage.removeItem('search'); // tmp, @see assets/js/scroll-target.js

if (!window.book) window.book = {};
$(function() {
	if (!book.div) book.div = document.querySelector('.book');
});

//$(window).on('load', function imageZoom() {
	var $book = $('.book'),
		bookWidth = $book.innerWidth();
	$book.find('img[id]').filter(function() {
		return this.naturalWidth ? this.naturalWidth > bookWidth : this.width >= bookWidth; // width уже max:100%
	}).wrap(function() {
		return '<a href="'+this.src+'" target="_blank"></a>';
	})
	.parent()
	.addClass('zoomed-out')
	.on('click', function(ev) {
		var $link = $(this),
			img = $link.find('img')[0];
		if ($link.hasClass('zoomed-out') && (ev.which === 2 || (ev.which === 1 && img.naturalWidth > $(window).innerWidth()))) {
			return true; // по уменьшенной: ( средний клик  ||  левый клик, но она не влезет )
		}
		ev.preventDefault();
		$link.toggleClass('zoomed-out zoomed-in');
		return false;
	});
//});


// === from views/layouts/book: ===

$(function masha() {
	console.log('Ждём Машу');
		
	if (g_is_maker !== undefined && g_is_maker == 0) {
		console.log('g_is_maker = 0 -- МАШИ НЕ БУДЕТ');
		return;
	}
	if (book.find){	//|| book.size > 800 * 1024 //TODO: узнать для чего было это условие
		console.log((book.find ? 'book_find' : '') + ' -- МАШИ НЕ БУДЕТ'); //(book.size > 800 * 1024 ? 'слишком большой book.size ('+book.size+')' : '') + 
		return; // @fixme: научить машу не сдвигать якоря при book.find
	}
	
	var timeout_hover = null,
		$sp = $('#share-popup');
	$sp.hover(
		function() {
			window.clearTimeout(timeout_hover);
		},
		function() {
			timeout_hover = window.setTimeout(function() {
				hideSharePopup();
			}, 2000);
		}
	);
	
	function az_initMasha(){
		if(window.MaSha){
			console.log('az_initMasha');
			MaSha.instance = new MaSha({
				selectable: $('#selectable-content')[0],
				onMark: function() {
					updateSharePopupContent();
					showSharePopup($('.num' + (this.counter - 1), $(this.selectable))[0])
				},
				onUnmark: function() {
					typeof hideSharePopup !== 'undefined' && hideSharePopup('', !0);
					updateSharePopupContent()
				},
				ignored: '.google-form, .download'
			});
		}else{
			setTimeout(az_initMasha,100);
		}
	}
	
	az_initMasha();

	updateSharePopupContent();

	function updateSharePopupContent() {
		$sp.find('.btn-close').click(e=>{
			hideSharePopup();
			if(window.MaSha && MaSha.instance){
				MaSha.instance.clearAllSelections();
			}
		});
		
		$sp.find('.link a').html(location + '<ins></ins>').attr('href', location);
		var b = encodeURI($('h1').text()),
			a = encodeURIComponent(location),
			$social = $sp.find('.social');
		
		$social.find('.vk').attr('href', '//vkontakte.ru/share.php?url=' + a);
		$social.find('.fb').attr('href', '//www.facebook.com/share.php?u=' + a);
		$social.find('.wa').attr('href', '//api.whatsapp.com/send?text=' + a);
		$social.find('.tg').attr('href', '//t.me/share/url?url=' + a);
		
		let $add = $('.add_quote').show();
		let quoteArea = $add.find('textarea');
		quoteArea.val(quoteArea.val() + '<a class="marked-link" href="'+location+'">Перейти к цитате</a>');
		
		if ($add.data('submitting')){
			console.log('already submitting');
			$add.removeClass('ok');
		}else{
			let selectionArray = []; 
			$('#selectable-content .user_selection_true').each(function(){
				selectionArray.push($.trim(this.textContent));
			});
			quoteArea.val(selectionArray.join(' ') +'<a class="marked-link" href="' + location + '">Перейти к цитате</a>');
			$add.addClass('ok');
		}
		
		if(!$.contains($sp, $add))
			$sp.append($add);
		
		if(copyTextToClipboard(location))
			$sp.find('.link-copy-message').text('Ссылка скопирована в буфер обмена.');
	}

	function showSharePopup(b) {
		var a = $(b).offset();
		$sp.addClass('show').css({
			left: a.left + 5 + $sp.width() >= $(window).width() ? $(window).width() - $sp.width() - 15 : a.left + 5,
			top: a.top - $sp.height() - 25
		});
	}

	function hideSharePopup() {
		$sp.removeClass('show');
	}
});

$(function f02() {
	$('hr').attr('align', 'left').css({'margin': '15px', 'border-left': 'none', 'border-right': 'none'});
	$('.podpisR').next('br').remove();
	/*$('.podpisR').next('.podpisR').css('margin-top', '-10px'); зачем? От этого так http://joxi.ru/ZrJVyEDT90Md8r */
	$('.vd a').attr('target', '_blank');
});

function open_feed_form() {
	$('.feed_email').slideToggle('300');
}

// === from modules/books/views/book: ===

$(function f03() {
	$('.download a:not([href$="/users/register"])').attr('target', '_blank');
});

if (window.site_auth) {

	$(function f04() {
		$('.favorites').on('click', function(e) {
			let isAdding = this.id == 'add_favorite';
			$.ajax({
				url: $(this).attr('href'),
				cache: false,
				dataType: 'json',
				success: function(data) {
					if (data.status === 'success'){
						$('.favorites').toggleClass('hide');
						if(window.azNotify) azNotify( isAdding ? 'Добавлено в избранное' : 'Удалено из избранного');
					}else{
						if(window.azNotify) azNotify('Ошибка');
					}
				}
			});
			
			e.preventDefault();
		});
	});

	$(function f05() {
		var list_block = '';
		
		$('.bottom-submenu a[data-key]').click(function(e) {
			var $el = $(this),
				type = $el.hasClass('add_list') ? 'add' : 'delete',
				key = $el.data('key');
			$.ajax({
				url: $(this).attr('href'),
				cache: false,
				dataType: 'json',
				success: function(data) {
					if (data.status === 'success') {
						if (type === 'add') {
							$('.bottom-submenu a.delete_list').each(function() {
								var t_key = $(this).data('key');
								$(this).removeClass('delete_list').addClass('add_list');
								$(this).attr('href', book.lists_links[t_key]['url']);
								$(this).attr('title', book.lists_links[t_key]['title']['name']);
								$(this).html(book.lists_links[t_key]['title']['icon'] + book.lists_links[t_key]['title']['name']);
							});
							$el.html(book.delete_from_lists[key]['icon'] + book.delete_from_lists[key]['name']);
							$el.attr('title', book.delete_from_lists[key]['name']);
							$el.attr('href', book.delete_from_lists_link);
							$el.removeClass('add_list').addClass('delete_list');
							if(window.azNotify) azNotify('Добавлено в список');
						} else {
							$el.html(book.lists_links[key]['title']['icon'] + book.lists_links[key]['title']['name']);
							$el.attr('title', book.lists_links[key]['title']['name']);
							$el.attr('href', book.lists_links[key]['url']);
							$el.removeClass('delete_list').addClass('add_list');
							if(window.azNotify) azNotify('Удалено из списка');
						}
					}else{
						if(window.azNotify) azNotify('Ошибка');
					}
				}
			});
			e.preventDefault();
		});
	});

	$(function f06() {
		$('#add_quote_form').on('submit', function(e) {
			console.log('submit');
			e.preventDefault();
			var $form = $(this),
				$wrap = $('.add_quote'),
				$save = $form.find('input[type=submit]');
			$wrap.data('submitting', true);
			$save.prop('disabled', true).css('cursor', 'wait');
			$.ajax({
				type: $form.attr('method'),
				url: $form.attr('action'),
				data: $form.serialize()
			}).always(function() {
				$('#share-popup').removeClass('show');
				$wrap.data('submitting', false);
				$save.prop('disabled', '').css('cursor', '');
				if(window.azNotify) azNotify('Цитата сохранена');
			});
			return false;
		});
	});

	$(function f07() {
		let isMobile = window.innerWidth < 768, $bookmark = $('.bookmark');

		function getTarget() {
			var top = $bookmark.position().top,
				left = Math.round((window.innerWidth || $(window).innerWidth())/2),
				target = document.elementFromPoint(left, top);
			if (!book.div.contains(target)) return $();
			for (var i = 5, t; i <= 25; i += 5) {
				// target может оказаться book.div или другим глобальным div'ом если {left,top} попадёт в отступ p+p
				t = document.elementFromPoint(left, top+i);
				if (t !== target && target.contains(t)) {target = t; break;}
			}
			var $target = $(target);
			return $target.is(':only-child') && $target.parent().is('p') ? $target.parent() : $target;
			// @todo: выходить из подсветок и многоуровневого :only-child до parent().is('p') || parent().siblings('p').length
		}

		function getHeader() {
			var $for = $target;
			if ($for.is(':header')) return $for;
			var $h = $(),
				$parent;
			do {
				$parent = $for.parent();
				$h = filterHeaders($parent.find('> :header'));
				if ($h.length) break;
				$for = $parent;
			} while ($for.length && !$for.is('.book'));
			return $h;
		}

		// фильтрация h* элементов через filterPaths, относительно текущего глобального $target
		function filterHeaders($hs) {
			if (!$hs.length) return $hs;
			var hPaths = {},
				tPath = getPath($target[0]);
			$hs.each(function(i) {hPaths[i] = getPath(this)});
			for (var i = 0, len = Math.min(tPath.length, hPaths[0].length); i < len; i++) hPaths = filterPaths(hPaths, i, tPath[i]);
			for (var k in hPaths) break; // Object.keys(hPaths).length = 1 или 0
			if (k === undefined) return $();
			return $hs.eq(k);
		}

		// фильтрация getPath-путей; оставляет только пути в которых сегмент `i` ближе всего к `num`
		function filterPaths(paths, i, num) {
			var val = null, p,
				cmp, closest = Infinity;
			for (p in paths) {
				cmp = num - paths[p][i];
				if (cmp < 0) continue; // заголовок `p` находится ниже элемента с сегментом пути `num`
				if (cmp < closest) {
					closest = cmp;
					val = paths[p][i];
				}
			}
			var filtered = {};
			for (p in paths) {
				if (paths[p][i] !== val) continue;
				filtered[p] = paths[p];
			}
			return filtered;
		}

		var $target = $(),
			$header = $target,
			title0 = $bookmark.attr('title'),
			title1 = 'Добавить в закладки «%h»',
			mainHeader = $('.book :header:first')[0];

		let getTargetText = ()=>{
			let lim = 77, content = $target.text(), title = (content.length < lim) ? content : ( content.slice(0, lim) + '…' );
			
			return title ?? title0;
		};

		$bookmark.hover(
			function() {
				$target = getTarget();
				if (!$target.length) return;
				$target = $target.addClass('bookmarked');
				$bookmark.attr('title', getTargetText());
			},
			function() {
				$target.removeClass('bookmarked');
				$bookmark.attr('title', title0);
			}
		);

		function getPath(child) {
				var parent = child.parentElement,
					path   = [];
				while (child !== book.div) {
					path.push(Array.prototype.indexOf.call(parent.children, child) + 1);
					child  = parent;
					parent = parent.parentElement;
					if (!parent) throw 'getPath err';
				}
				return path.reverse();
		}

		$bookmark.click(function() {
			$target = getTarget();
			
			$.ajax({
				url: book.mark,
				cache: false,
				type: 'post',
				dataType: 'json',
				data: {
					chap: book.chap,
					path: getPath($target[0] || mainHeader),
					title: getTargetText(),
				},
				success: function(data) {
					if (!data.message) return;
					
					if(window.azNotify){
						azNotify(data.message);
					}else{
						console.log(data.message);
					}
				}
			});
		});
	});
}

$(function f08() {
	function section_hash() {
		var hash = window.location.hash.substring(1);
		if (!hash || document.getElementById(hash) || document.querySelector('a[name="'+hash+'"]')) return;
		if (/^[0-9_]+$/.test(hash)) {
			var indexes = hash.split('_');
			var start = [];
			$('.text a[name]').each(function() {
				var name = $(this).attr('name');
				if (/^[0-9_]+$/.test(name)) {
					var name_idexes = name.split('_');
					for (var i = start.length; i < name_idexes.length; i++) start[i] = name_idexes[i];
					if (indexes.length === name_idexes.length) return false;
				}
			});
			for (var i in start) indexes[i] = parseInt(indexes[i]) + parseInt(start[i]) - 1;
			var link = indexes.join('_');
			var aTag = $("a[name='" + link + "'], a#" + link);
			$('html, body').animate({scrollTop: aTag.offset().top}, 0);
		}
	}
	section_hash();
	$(window).bind('hashchange', section_hash);
});

$(function f09() {
	var base = location.href.match(/^[^#]*/)[0];
	Array.prototype.forEach.call(document.querySelectorAll('a[id$="_return"]'), function(srcLink) {
        var note = document.querySelector('a[href$="#' + srcLink.id + '"]'),
            noteLink = note, txt = '';
        if (noteLink) {
            srcLink.setAttribute('href', base + srcLink.getAttribute('href'));
            noteLink.setAttribute('href', base + noteLink.getAttribute('href'));
            note = note.parentElement || note.parentNode;
            if (!note.tagName || note.tagName.toLowerCase() !== 'div') return;
            for (var cn, i = 0; i < note.childNodes.length; i++) {
                cn = note.childNodes[i];
                if (cn === noteLink) continue;
                txt += cn.textContent;
            }
            if (txt = txt.trim()) srcLink.title = txt;
        }
	});
});


$(function f10() {
	var pathname = window.location.pathname;
	var hash = window.location.hash;
	if(pathname.indexOf('otechnik/Lopuhin/tolkov') + 1) {
		bgGoToBibleVerse(pathname, hash);
	}
	function bgGoToBibleVerse(pathname, hash) {
		var the_verse = hash.substr(3);
		var bgBibleVerse = document.getElementsByClassName("h5");

		// Расставляем якори
		for (var i = 0; i < bgBibleVerse.length; i++) {
			if (bgBibleVerse[i].hasAttribute('id')) {
				if (bgBibleVerse[i].getAttribute('id') == the_verse) return;
				continue;
			}
			var elems = bgBibleVerse[i].getElementsByTagName('a');
			if (elems && elems[0]) {
				var href = elems[0].getAttribute('href');
				var verses = href.match(/:(\d+(-\d+)?)/);
				if (verses && verses[1]) bgBibleVerse[i].setAttribute('id', 'v_'+verses[1]);
			}
		}
		// Переход на толкование стиха
		for (var i = 0; i < bgBibleVerse.length; i++) {
			if (bgBibleVerse[i].hasAttribute('id')) {
				verses = bgBibleVerse[i].getAttribute('id');
				var verse = verses.match(/(\d+)-?(\d+)?/);
				if (verse) {
					if (verse[2] && the_verse >= verse[1] && the_verse <= verse[2]) window.location.href=pathname+"#"+verses;
					else if (verse[1]&& the_verse == verse[1]) window.location.href=pathname+"#"+verses;
				}
			}
		}
		return;
	}
});

// Разворачивание и перетаскивание таблиц
(function(){
	if(window.innerWidth > 600){
		let dragTable = false, dragStartMouseX = 0, dragStartScrollX = 0;
		let limit = $('.book').width();
		$('table').each(function(){
			let table = $(this);
			if(table.width() > limit){
				let wrap = table.parent(); //wrapper added via php
				let expander = $('<div class="table-expander" title="Развернуть таблицу"><i class="fa fa-expand"></i></div>');
				expander.click(e=>{wrap.toggleClass('expanded')});
				wrap.before(expander);
				
				wrap.mousedown(function(e){
					dragTable = this;
					dragStartMouseX = e.screenX;
					dragStartScrollX = wrap[0].scrollLeft;
				});
			}
		});
		$('body').mousemove(e=>{
			if(dragTable){
				dragTable.scrollLeft = dragStartScrollX + (dragStartMouseX - e.screenX);
			}
		});
		$('body').mouseup(e=>{dragTable = false;});
	}
})();