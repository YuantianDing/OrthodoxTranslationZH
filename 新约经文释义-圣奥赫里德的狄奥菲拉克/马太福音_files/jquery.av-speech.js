/*--------------------------------------------------------------
# HTML5 Speech Recognition API
--------------------------------------------------------------*/
(function(){
	let audioStart, audioFin;
	let initEvts = ['mousemove', 'touchstart', 'scroll'];
	
	initEvts.forEach(evt=>window.addEventListener(evt, initAudio));
	function initAudio(e){
		initEvts.forEach(evt=>window.removeEventListener(evt, initAudio));
		audioStart = new Audio('//cdn.azbyka.ru/wp-content/themes/azbyka/assets/sound/bling1.mp3');
		audioFin = new Audio('//cdn.azbyka.ru/wp-content/themes/azbyka/assets/sound/bling2.mp3');
	}
	
	function startDictation() {
		let searchForm = this.closest('form');
		let searchField = searchForm.querySelector('input[type="search"]');
		
		if(!searchField){
			console.log('no search field');
			
			return false;
		}

		if (window.hasOwnProperty('webkitSpeechRecognition')) {
			if(audioStart)audioStart.play();
			if(searchForm)searchForm.classList.add('voice-search');
			
			var recognition = new webkitSpeechRecognition();
			recognition.continuous = false;
			recognition.interimResults = false;
			recognition.lang = "ru-RU";
			recognition.start();

			recognition.onresult = function(e) {
				if(audioFin)audioFin.play();
			
				searchField.value = e.results[0][0].transcript;
				recognition.stop();
				
				if(searchForm){
					searchForm.classList.remove('voice-search');
					searchForm.submit();
				}
			};

			recognition.onerror = function(e) {
				recognition.stop();
				if(searchForm)searchForm.classList.remove('voice-search');
			}
		}
	}
	
	jQuery(document).ready( function($){
		let body = $('body');
		let srch = $('input[type="search"]');
		$('.speech, .start-dictation').click(startDictation);
		
		showMic();
		
		srch.on('change input propertychange focus mouseover', srch, e=>{
			let t = $(e.target), sp = t.closest('.search-form').find('.speech'), v = t.val();
			if(v && v!=='')
				sp.hide();
			else
				sp.show();
		});
		srch.on('blur', srch, e=>{
			if(!e.target.value || e.target.value === '')
				$(e.target).closest('.search-form').find('.speech').show();
		});
	});	

	function showMic() {
		if (window.hasOwnProperty('webkitSpeechRecognition')) {
			if (!(navigator.userAgent.search(/OPR/) > 0)) {	// в Opera функции есть, но не работают
				jQuery('.speech').show();
			};
		}
	}
})();