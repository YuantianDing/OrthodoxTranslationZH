jQuery($=>{
	//Notification
	window.azNotify = (msg) => {
		let $panel = $('<div class="notification panel">'+msg+'</div>');
		$('#notification_container').prepend($panel);
		$panel.delay(10).slideDown().delay(3000).slideUp(() => {
			$panel.remove()
		});
	}
});