//Динамическая смена URL после загрузки полного текста.
(function(){
	console.log('initObservation');

	//Prepare headers
	let headers = [], h1 = [], h2 = [], currentHeader = 0, urlBase = document.querySelector('link[rel="canonical"]').getAttribute('href');
	//INTERACTION
	const intersectionObserver = new IntersectionObserver((entries, observer) => {
		let mainHeader = false;
		entries.forEach(entry => {
			//const bottom = entry.boundingClientRect.bottom;
			 if (entry.isIntersecting) {
				mainHeader = entry.target;
			 }else if(entry.target === currentHeader && entry.boundingClientRect.bottom > window.innerHeight){
				const index = headers.indexOf(entry.target);
				if(index>0)
					mainHeader = headers[index-1];
			 }
		});
		if(mainHeader){
			currentHeader = mainHeader;
			history.pushState(null, mainHeader.textContent, urlBase+mainHeader.dataset['index']);
		}
	}, {root: null, rootMargin: '0px', threshold: .9});

	
	let resetIntersectionObserver = ()=>{
		intersectionObserver.disconnect();
		
		headers = []; h1 = []; h2 = [];
		let h1Index = 0;
		let h2Index = 0;
		const arr = document.querySelectorAll('h1, h2');
		arr.forEach(i => {
			if(i.tagName == 'H1'){
				h1Index++;
				h2Index = 0;
			}else if(i.tagName == 'H2'){
				h2Index++;
				headers.push(i);
				intersectionObserver.observe(i)
			}
			
			i.setAttribute('data-index', h1Index + (h2Index ? '_' + h2Index : ''));
			
		});
	};
	
	resetIntersectionObserver();
	
	//MUTATION (on load etc)
	const mutationObserver = new MutationObserver((mutationList, observer) => {
		resetIntersectionObserver();
	});
	mutationObserver.observe(document.querySelector(".book"), { attributes: false, childList: true, subtree: true });

})();