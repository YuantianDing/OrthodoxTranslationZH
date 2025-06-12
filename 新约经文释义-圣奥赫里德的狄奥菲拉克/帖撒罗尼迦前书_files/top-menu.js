(function() {
	const itemSelector = "#main-nav .menu-item";
	const activeClass = 'active-menu-item';
    document.querySelectorAll(itemSelector).forEach(el=>{
		el.onclick = function(e) {
			let wasActive = this.classList.contains(activeClass);
			document.querySelectorAll(itemSelector + "." + activeClass).forEach(active => active.classList.remove(activeClass));
			if (!wasActive) this.classList.add(activeClass);
		}
    });
})();