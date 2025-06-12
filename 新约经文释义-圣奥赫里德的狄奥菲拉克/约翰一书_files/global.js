//TOP MENU
(function(){
	$(document).on('click', e=>{
		if(e.target){
			// top menu
			
			if(e.target.closest('.to-sitemap'))
				$('#nav-box').slideToggle();
			else{
				if(!e.target.closest('#nav-box') && window.innerWidth <= 768)
					$('#nav-box').slideUp();
				
				if(e.target.closest('.to-search'))
					$('input[type="search"]').focus();
			}
			
			// helper: toggle 'active' class on click
			let clickActive = $(e.target).closest('.click-active');
			let wasActive = false; 
			if(clickActive.length){
				wasActive = clickActive.is('.active');
			}
			$('.active').removeClass('active'); 
			if(clickActive.length){
				clickActive.toggleClass('active', !wasActive);
			}
		}
		
		return true;
	});
})();

//LIMIT requests per second
(function(){
	let search_input = $('input[type=search]');
    if(!search_input.length)
		return;

    let search_form = search_input.closest('form');
	
	let lastSubmit = localStorage.getItem('azBibSearchLastSubmit');
	let now = Date.now();
	const LIMIT = 5000;
	let delta = now - lastSubmit;
	let enableForm = ()=>search_form.removeClass('disabled');
	let disableForm = (time)=>{
		search_form.addClass('disabled');
		setTimeout(enableForm, time);
	};
	
	if(lastSubmit && delta < LIMIT)
		disableForm(delta);
	
	search_form.submit(e=>{
		if(search_form.is('.disabled')){
			e.preventDefault();
			return false;
		}
		localStorage.setItem('azBibSearchLastSubmit', Date.now());
		disableForm(LIMIT);
	});
})();

// Показываем панели при скролле и наведении на них
(function(){
	let isMobile = window.innerWidth < 768,
		lastScrollTop = 0, 
		scrollTimeout, 
		$body = $('body'), 
		scrolled = ()=>{
			if(isMobile)
				$('.active').removeClass('active');
		
			clearTimeout(scrollTimeout);
			$body.addClass('scrolling');
			$body.removeClass('non-scrolling');
			scrollTimeout = setTimeout(removeScrollingClass, 4000);
		}, 
		removeScrollingClass = ()=>{
			$body.removeClass('scrolling');
			$body.addClass('non-scrolling');
		},
		fixMenus = e=>{$body.addClass('fixed-menus')},
		unfixMenus = e=>{$body.removeClass('fixed-menus')}
		topMenu = $('#top_menu'),
		scrollTopButton = $('#totop');
	
	document.addEventListener('scroll', e => {
		let st = window.scrollY;
		
		if(st < 200)
			scrollTopButton.addClass('invert');
		else
			scrollTopButton.removeClass('invert');
		
		if (st > lastScrollTop)
			topMenu.addClass('hidden-on-scroll');
		else
			topMenu.removeClass('hidden-on-scroll');
		
		if (Math.abs(st - lastScrollTop) > 5) {
			scrolled();
		}
		lastScrollTop = st <= 0 ? 0 : st;
	}, { passive: true });
	
	$(document).on('click touchstart', e=>{
		if(!e.target.closest('#top_menu, #bottom_menu, #nav-box')){
			scrolled();
			unfixMenus();
		}
		
		return true;
	});
	
	//Наведение на меню
	$('#top_menu, #bottom_menu').mouseenter(fixMenus).mouseleave(unfixMenus);

	//Наверх
	scrollTopButton.click(function(e) {
		e.preventDefault();
		$("html, body").stop().animate({ scrollTop: scrollTopButton.is('.invert') ? document.body.scrollHeight : 0 }, 500);
		return false;
	});
})();

function copyTextToClipboard(text) {
	let res = false;

  var textArea = document.createElement("textarea");
  textArea.value = text;
  
  // Avoid scrolling to bottom
  textArea.style.top = "0";
  textArea.style.left = "0";
  textArea.style.position = "fixed";

  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
	res = document.execCommand('copy');
	var msg = res ? 'successful' : 'unsuccessful';
	console.log('Копирование ' + msg);
  } catch (err) {
	console.error('Ошибка копирования', err);
  }

  document.body.removeChild(textArea);
  
  return res;
}