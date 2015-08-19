
var nvs_infinite_scroll = { 'offset': 20, 'loading': false, 'url': '', 'count': 0, 'preload': 0, 'position': 0, 'end_msg': 'No more results' }

/**
 *
 * Initialiseren van de infinite scroll
 * 
 */   
function init_infinite_scroll() {
	/**
	 *
	 * URL setten, en eventuele meegegeven scroll positie verwijderen
	 * 
	 */	 	 	 	
	nvs_infinite_scroll.url = document.URL.replace(/&scroll=[0-9]+?\|[0-9]+/i, "");
	
	/**
	 *
	 * Als er een infinite_scroll element is
	 * 
	 */	 	 	 	
	if ($('.infinite_scroll').length > 0) {
		/**
		 *
		 * Click event om terug naar boven te gaan
		 *		 		 
		 */	 		
		$('.infinite_scroll .infinite_scroll_top a').live('click', function() {
			$(window).scrollTop(0);
			return false;
		});
		
		/**
		 *
		 * Als er een preload is meegegeven in de URL, items preloaden
		 * 
		 */		 		 		 		
		if (nvs_infinite_scroll.preload > 0) {
			infinite_scroll_load(infinite_scroll_preload_callback);
		/**
		 *
		 * Anders infinite scroll enablen
		 * 
		 */		 		 		 		
		} else {
			infinite_scroll_enable();
		}
	}
}

/**
 *
 * Laden van het volgende deel
 *  
 */ 
function infinite_scroll_load(callback) {
	nvs_infinite_scroll.loading = true;
	nvs_infinite_scroll.count++;
	$.get(nvs_infinite_scroll.url + '?&offset=' + $('#news article').length , function(data) { infinite_scroll_callback(data) }, 'html'); 	
	
}

/**
 *
 * Enablen van het scrollen
 * 
 */   
function infinite_scroll_enable() {
	$(window).scroll(function (e) {
		if (!nvs_infinite_scroll.loading && $(this).scrollTop() >= (($(document).height() - $(window).height()) - nvs_infinite_scroll.offset)) {
			infinite_scroll_load(function() { infinite_scroll_callback(this); });
		}
	});
}

/**
 *
 * Callback bij preloaden
 * 
 */   
var infinite_scroll_preload_callback = function() {
	infinite_scroll_callback(this);
	nvs_infinite_scroll.preload--;
	if (nvs_infinite_scroll.preload > 0) {
		infinite_scroll_load(infinite_scroll_preload_callback);
	} else {
		$(window).scrollTop(nvs_infinite_scroll.position);
		infinite_scroll_enable();
	}
}

/**
 *
 * Callback bij scrollen
 * 
 */
var infinite_scroll_callback = function(obj) {
	if ($('article', obj).length == 0) {	
		$('<article>').html(nvs_infinite_scroll.end_msg).appendTo($('.infinite_scroll'));
	} else {		
		$('#news article', obj).insertBefore($('.infinite_scroll .nav-paging'));		
		nvs_infinite_scroll.loading = false;
	}
} 

/**
 *
 * Herlaad de huidige URL
 *
 */
function refresh() {
	if ($('.infinite_scroll').length > 0 && nvs_infinite_scroll.count > 0) {
		nvs_infinite_scroll.url+= '&scroll=' + nvs_infinite_scroll.count + '|' + $(window).scrollTop();
	}
	redirect(nvs_infinite_scroll.url);
}

/**
 *
 * Redirect naar de meegegeven URL 
 *
 */
function redirect(url) {
	document.location.href = url;
}