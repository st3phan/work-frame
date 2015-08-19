
	(function($) {

		/* custom selector --> :parents */
		jQuery.expr[':'].parents = function(a,i,m){
			return jQuery(a).parents(m[3]).length < 1;
		};


		$.fn.showDelay = function(duration, delay, callback, finish) {
			var wait = 0;
			var ln = this.length-1;

			return this.each(function(index) {
				$(this).delay(wait).css({ visibility: 'visible' }).hide().fadeIn(duration, function() {
					if (typeof callback == 'function') callback.call(this);
					if (index == ln && typeof finish == 'function') finish.call(this);
				});
				wait += delay;
			});
		};


		$.fn.hideDelay = function(duration, delay, callback, finish) {
			var wait = 0;
			var ln = this.length-1;

			return this.each(function(index) {
				$(this).delay(wait).fadeOut(duration, function() {
					$(this).show().css({ visibility: 'hidden' });
					if (typeof callback == 'function') callback.call(this);
					if (index == ln && typeof finish == 'function') finish.call(this);
				});
				wait += delay;
			});
		};


		$.wait = function(time) {
		  return $.Deferred(function(dfd) {
		    setTimeout(dfd.resolve, time);
		  });
		}

	})(jQuery);

	var photoHeader = {};

	(function(context) {

		var loadingTimer = [];
		var loadingInterval = 4000;
		var loadingFrames = 81;
		var loadingFrameHeight = 26;
		var loadingFrame = [];
		var playInterval = 6000;
		var pause = false;
		var loading = true;
		var resume;

		context.init = function() {

			$.when( context.loadImages() ).then( function() {
				$.when( context.loadThumbs() ).then( function() {
					$.when( context.showThumbs(), context.loadPhotos() ).then( function() {
						context.play();
						loading = false;
					} );
				} );
			} );

			$('#ph-thumbs figure').click(function() {
				if (loading) return false;
				context.pause( $(this) );
			});

			$('#ads-page-top').click(function(e) {
				if (pause) context.play();
				e.preventDefault();
			});

			$('#ph-zoom').click(function() {
				$(this).toggleClass('in');
				direction = $(this).hasClass('in') ? 'in' : 'out';
				context.zoom(direction);
			});

			$('#ph').mouseleave(function() {
				if (pause) resume = setTimeout(context.play, 5000);
			});

			$('#ph').mouseenter(function() {
				clearTimeout(resume);
			});

		};

		context._startLoading = function(obj, hash) {

			loadingFrame[hash] = 0;
			loadingTimer[hash] = setInterval(function() { context._animateLoading(obj, hash) }, (loadingInterval/loadingFrames));

		};

		context._stopLoading = function(obj, hash) {

			clearInterval( loadingTimer[hash] );
			$(obj).find('.loader').hide();

		};

		context._animateLoading = function(obj, hash) {

			$(obj).find('.loader').css({ backgroundPosition: '0 ' + (loadingFrame[hash] * (loadingFrameHeight*-1) ) + 'px' }).show();
			loadingFrame[hash] = (loadingFrame[hash] + 1) % loadingFrames;

		};

		context.loadImages = function() {

			return $.Deferred(function(dfd) {

				var images = ['img/loader_header_roze.png', 'img/loader_header_groen.png', 'img/loader_header_blauw.png'];
				var ln = images.length;
				var counter = 0;

				$.each(images, function(i, val) {
					var image = new Image();
					image.onload = function() {
						counter++;
						if (counter >= ln) dfd.resolve();
					}
					image.src = val;
				});

			}).promise();

		}

		context.loadPhotos = function(url) {

			return $.Deferred(function(dfd) {

				$thumbs = $('#ph-thumbs figure');
				ln = $thumbs.length;
				counter = 0;

				// Loop door alle thumbs en preload bijbehorde grote foto's
				$thumbs.each(function(i) {
					var $obj = $(this);
					var url = $obj.data('lSrc');
					var id = i;

					var image = new Image();
					image.onload = function() {

						$image = $(image, {
							width: image.width,
							height: image.height
						});

						orient = (image.width > image.height) ? 'hor' : 'ver';

						// maak een wrapper voor de grote foto
						$('<div />',{
							'class': 'vsl '+orient,
							rel: id,
							width: image.width,
							height: image.height
						}).html($image).appendTo( $('#ph-photo') );

						context._stopLoading($obj, 'thumb'+id);
						// toon thumb wanneer grote foto is geladen
						$obj.find('img').fadeIn();

						// toon de eerste foto
						if (i == 0) {
							context.showPhoto(0);
						}

						counter++;
						// alle grote foto's zijn geladen
						if (counter >= ln) dfd.resolve();
					};

					image.src = url;
				});

			}).promise();

		}

		context.showPhoto = function(index) {

			return $.Deferred(function(dfd) {

				$el = $('#ph-photo');
				$prev = $el.find('.vsl.active');
				$next = $el.find('.vsl[rel='+index+']');

				$thumb = $('#ph-thumbs figure').eq(index);
				link = $thumb.data('link');
				caption = $thumb.find('.title').html();
				portal = $thumb.data('portal');

				// verberg de grote foto en de tekst, behalve bij de allereerste keer
				if ($next.index() != $prev.index() ) $el.add('#ph-caption').fadeOut(400);

				$.when( $el ).then ( function() {
					// verberg de oude foto
					$prev.removeClass('active').hide();
					// toon nieuwe grote foto
					$next.addClass('active').show();

					// verwijder de portal class van de vorige foto
					$('#ph-inner').removeClass(function(index, c) {
						if (typeof(c) != 'undefined' ) {
							return c.replace(/\bbg.\d-*?\b/g, '');
						}
					});

					context._stopLoading($('#ph-photo-loader'), 'photo');

					// geef ph-inner de juiste portal class mee en pas de dimensies aan naar de breedte van de nieuwe foto
					$('#ph-inner').addClass(portal).animate({ width: $next.width(), marginLeft: ($next.width()/2)*-1 }, 400);

					$.when( $('#ph-inner') ).then( function() {
						// zet de hoogte van ph-inner weer terug want de oude foto kan ingezoomed zijn
						$el.css({ height: $('#ph-inner').height() }).fadeIn(400);
						// pas het onderschrift van de nieuwe foto aan
						$('#ph-caption a').attr('href', link);
						$('#ph-caption span').html(caption);
						$('#ph-caption').fadeIn(400);
						dfd.resolve()
					} );
				});
			}).promise();

		};

		context.loadThumbs = function() {

			var counter = 0;
			var photos = [];

			return $.Deferred(function(dfd) {

				context._startLoading($('#ph-photo-loader'), 'photo');

				// maak een object met info van een foto
				$('#ph-thumbs figure').each(function(i) {
					photos[i] = {};
					photos[i].el = $(this);
					photos[i].portal = $(this).data('portal');
					photos[i].sizes = [
						[ 'm', $(this).data('mSrc') ],
						[ 's', $(this).data('sSrc') ]
					];
					context._startLoading( $(this), 'thumb'+i );
				})

				var ln = photos.length * 2;

				// loop door alle foto's heen
				$.each(photos, function(i, photo) {
					var $el = photos[i].el;
					var id = i;

					// loop door alle afmetingen
					$.each(photo.sizes, function(i, size) {
						var image = new Image();
						image.onload = function() {
							$image = $(image, {
								width: image.width,
								height: image.height
							}).addClass(size[0]).appendTo( $el.find('.inner') );

							// geef de thumbnail de referentie voor orientatie en portal
							orient = (image.width > image.height) ? 'hor' : 'ver';
							$el.addClass(orient+' '+photos[id].portal);

							counter++;
							// alle thumbs zijn geladen
							if (counter >= ln) {
								dfd.resolve();
							}

						}
						image.src = size[1];
					});
				});
			}).promise();

		};

		context.showThumbs = function() {

			return $.Deferred(function(dfd) {

				$('#ph-thumbs figure').addClass('done');

				// toon alle thumbs 1 voor 1
				$('#ph-thumbs figure .outer').showDelay(2000, 400, false, function() {
					dfd.resolve();
				});
			}).promise();

		};


		context.play = function() {

			pause = false;

			// reset de zoom
			$('#ph-zoom').show().removeClass('in');

			if ( $('#ph-thumbs figure').length > 1) {
				context.next();
			}

		};

		context.pause = function($el, zoom) {

			zoom = typeof(zoom) != 'undefined' ? zoom : false;
			pause = true;
			loading = true;
			index = $el.index();

			// Activeer de geklikte thumb
			$el.addClass('active').find('.inner').stop(1,1).addClass('active');
			// Zet de siblings van de geklikte thumb op inactief
			$el.siblings().removeClass('active').find('.inner').stop(1,1).removeClass('active');

			if (zoom == false) {
				$('#ph-zoom').removeClass('in');

				// Toon de loader voor de geklikte thumb
				context._startLoading( $el, 'thumb'+index );

				// Toon de foto en verschuif daarna de thumb
				$.when( context.showPhoto( $el.index() ) ).then( function() {
					context._stopLoading($el, 'thumb'+index);
					loading = false;
				} );
			} else {
				loading = false;
			}

		};

		context.zoom = function(direction) {

			$thumb = $('#ph-thumbs figure.active');
			context.pause($thumb, true);

			// hoogte voor in of uitzoomen bepalen
			h = (direction != 'in') ? h = $('#ph-inner').height() : h = $('#ph-photo .vsl.active').outerHeight();
			// caption in of uit faden
			(direction == 'in') ? $('#ph-caption').fadeOut() : $('#ph-caption').fadeIn();
			// hoogte aanpassen
			$('#ph-photo').animate({ height: h }, 800, 'easeOutExpo');
		};

		context.next = function(interval) {

			return $.Deferred(function(dfd) {

				if (pause) return false;

				var $prev = $('#ph-thumbs figure.active').length == 0 ? $('#ph-thumbs figure:last') : $('#ph-thumbs figure.active');
				var $next = $prev.next().length == 0 ? $prev.prevAll().filter(':last') : $prev.next();
				var index = $next.index();

				$.when( context.showPhoto(index) ).then( function() {
					$prev.removeClass('active').find('.inner').removeClass('active', 2000, 'easeOutExpo');
					$next.addClass('active').find('.inner').addClass('active', playInterval, 'linear', function() {
						context.next();
					});
				} );

			}).promise();

		};

	})(photoHeader);

	var Calendar = {};

	(function(context) {

		var loading = false;
		var loadingTimer = [];
		var loadingInterval = 4000;
		var loadingFrames = 81;
		var loadingFrameHeight = 26;
		var loadingFrame = [];

		context._startLoading = function(obj, hash) {

			loadingFrame[hash] = 0;
			loadingTimer[hash] = setInterval(function() { context._animateLoading(obj, hash) }, (loadingInterval/loadingFrames));

		};

		context._stopLoading = function(obj, hash) {

			clearInterval( loadingTimer[hash] );
			$(obj).find('.loader').hide();

		};

		context._animateLoading = function(obj, hash) {

			$(obj).find('.loader').css({ backgroundPosition: '0 ' + (loadingFrame[hash] * (loadingFrameHeight*-1) ) + 'px' }).show();
			loadingFrame[hash] = (loadingFrame[hash] + 1) % loadingFrames;

		};

		context.loadItems = function(day) {

			loading = true;

			$loader = $('#agenda-detail-loading');
			$content = $('#agenda-detail-content');

			$content.hide();
			$loader.show();
			$loader.find('.msg').hide();

			context._stopLoading($loader, 'agenda');
			context._startLoading($loader, 'agenda');

			$.ajax({
				url: 'ajax/agenda.ajax.html',
				type: 'POST',
				data: ({ day: day }),
				dataType: 'html',
				success: function(data) {
					$.wait(1000).then(function() {
						$loader.hide();
						$content.html(data).show();
						context._stopLoading($loader, 'agenda');
						loading = false;
					});
				}
			});

		};

		context.init = function() {

			if ( $('#agenda .calendar ol li.today a').length ) {
				$('#agenda-detail-loading').hide();
				$('#agenda-detail-content').show();
			}

			$('#agenda .calendar ol li a').click(function(e) {
				if (loading == true || $(this).parent().hasClass('active') ) return false;

				day = $(this).data('day');
				context.loadItems(day);
				$(this).parent().addClass('active').siblings().removeClass('active');
				e.preventDefault();
			});

		};

	})(Calendar);

	var Subscriptions = {};

	(function(context) {

		context.init = function() {

			/**
			 * Inklappen van de subscriptions per magazine
			 */

			$('#subscriptions .subscription .startissue').hide();
			$('#subscriptions .magazines li .group').hide();

			/**
			 * Openklappen van de subscription per magazine
			 */

			$('#subscriptions .magazines li .mag').click(function(e) {
				$obj = $(this).parent();
				$obj.siblings().removeClass('active').find('.group').hide();
				$obj.toggleClass('active').find('.group').toggle();

				// scroll naar uitgeklapte groep
				offset = $obj.offset();
				// 110 is de offset top van wanneer het hoofdmenu sticky wordt
				offset.top = offset.top - 110;
				$('html, body').animate({ scrollTop: offset.top }, 'slow');

				e.preventDefault();
			});

			/**
			 * Toevoegen van subscription door 'add to cart'
			 */

			$('#subscriptions .subscription .btn').click(function(e)
			{
				// als renew is aangevinkt de link volgen, het startissue blok wordt niet uitgeklapt
				if ( $(this).hasClass('follow') || $(this).parent().find('.renew input').is(':checked') ) return;

				// voorzie alle siblings van de geklikt subscription met een transparante laag
				$obj =  $(this).closest('.group');
				$obj.add( $obj.siblings() ).find('.cover').css({ opacity: .9 }).show();
				$(this).closest('.subscription').find('.cover').hide().end()

				// toon het startissue blok
				$(this).closest('.subscription').find('.startissue').slideDown();

				// volg de link niet
				e.preventDefault();
			});

			/**
			 * Sluiten van het startissue blok
			 */

			$('#subscriptions .subscription .startissue .close').click(function(e)
			{
				//  verwijder de transparante lagen over de subscriptions
				$obj = $(this).closest('.group');
				$obj.add( $obj.siblings() ).find('.cover').hide();

				// verberg het startissue blok
				$(this).parent().slideUp();

				// volg de link niet
				e.preventDefault();
			});

			/**
			 * Renew de subscription
			 */

			$('#subscriptions .subscription .renew input').click(function(e) {
				if ( $(this).is(':checked') ) {
					$obj = $(this).closest('.group');
					$obj.add( $obj.siblings() ).find('.cover').hide();
					$(this).closest('.subscription').find('.startissue').slideUp();
				}
			});
		}

	})(Subscriptions);

	var alignMenu = {};

	(function(context) {

		var browserclass = ' ';
		var ua = $.browser;

		context.init = function() {

			if (ua.mozilla) {
				browserclass = ' moz';
			} else if (ua.msie && ua.version.slice(0,3) == '9.0') {
				browserclass = ' ie9';
			}

			/* __TIJDELIJK (info@SvO||Koen): Quickfix om subnavs uit te lijnen met de hoofdnavs */
			$('#nav-main ol > li:eq(4) ol').addClass('temp_books'+browserclass);
			$('#nav-main ol > li:eq(5) ol').addClass('temp_store'+browserclass);
			$('#nav-main ol > li:eq(6) ol').addClass('temp_service'+browserclass);

		};

	})(alignMenu);

	/*
	 * Related items
	 */

	var relatedItems = {};
	(function(context) {

		var loading = false;
		var loadingTimer = [];
		var loadingInterval = 4000;
		var loadingFrames = 81;
		var loadingFrameHeight = 26;
		var loadingFrame = [];
		var $container = $('#related-items');
		var id = $container.data('id');
		var page = 0;

		context.init = function() {

			context.loadItems(page);

			$container.find('a.prev').click(function(e) {
				context.loadItems(page-1);
				e.preventDefault();
			});

			$container.find('a.next').click(function(e) {
				context.loadItems(page+1);
				e.preventDefault();
			});

		};

		context.loadItems = function(page) {

			$container.find('figure').remove();
			context._startLoading($container,'related');

			$.ajax({
				url: 'http://frame.sjopet.dev1.netvlies.net/ajax/related.ajax.php',
				type: 'GET',
				data: ({ id: id, page : page }),
				dataType: 'jsonp',
				success: function(data) {

					if (data.items.length) {
						page = data.page;
						$container.show();

						$.each(data.items, function() {
							$(this.item.html).appendTo($container.find('.related-items-wrapper')).hide();
						});

						context._stopLoading($container, 'related');
						$container.find('figure').showDelay(400, 400, false);

						if (data.next == 'true') {
							$container.find('a.next').show();
							$container.find('span.next').hide();
						} else {
							$container.find('a.next').hide();
							$container.find('span.next').show();
						}

						if (data.prev == 'true') {
							$container.find('a.prev').show();
							$container.find('span.prev').hide();
						} else {
							$container.find('a.prev').hide();
							$container.find('span.prev').show();
						}
					}
				}
			});

		};

		context._startLoading = function(obj, hash) {

			loadingFrame[hash] = 0;
			loadingTimer[hash] = setInterval(function() { context._animateLoading(obj, hash) }, (loadingInterval/loadingFrames));

		};

		context._stopLoading = function(obj, hash) {

			clearInterval( loadingTimer[hash] );
			$(obj).find('.loader').hide();

		};

		context._animateLoading = function(obj, hash) {

			$(obj).find('.loader').css({ backgroundPosition: '0 ' + (loadingFrame[hash] * (loadingFrameHeight*-1) ) + 'px' }).show();
			loadingFrame[hash] = (loadingFrame[hash] + 1) % loadingFrames;

		};

	})(relatedItems);

	/*
	 * Ready, set, let's go!
	 */

	$(document).ready(function(){

		photoHeader.init();
		Calendar.init();
		Subscriptions.init();
		alignMenu.init();

		if ($('#related-items').length) {
			//relatedItems.init();
		}

		/* login blokje pas verwijderen als er naast wordt geklikt */
		$('#login .login').hover(function(e) {
			$(this).addClass('show');
			e.stopPropagation();
		});

		/* enter submit het formulier */
		$('#login form').keypress(function(e) {
			if (e.keyCode == 13) {
				$(this).submit();
				e.preventDefault();
			}
		});

		$(document).click(function() {
			$('#login .login').removeClass('show');
			$('#home-magazines .xitem').removeClass('closed open').addClass('clickme');
		});

		/* open links met rel=external in een nieuw venster */
		$('a.external').attr('target', '_blank');

		/* Vervang de default submit buttons met een fancy button */

		$('.submit').find('input[type=submit]').hide().parent().find('.btn, a').filter(':parents(.btn)').show().click(function(e) {

			// hidden submit field toevoegen zodat bij meerdere submit buttons gekeken kan worden waar op geklikt is
			name = $(this).prev().attr('name');
			val = $(this).prev().val();
			$('<input />', {
				type: 'hidden',
				name: name,
				value: val
			}).appendTo( $(this).closest('form') );

			$(this).closest('form').submit();
			e.preventDefault();
		});

		/* vergroot de clickearea's */

		$('.xitem').filter(':parents(#detail, .cta, #home-magazines)').add('#related-items article, #search-results article').click(function(e) {
			url = $(this).find('a:eq(0)').attr('href');
			document.location = url;
		}).addClass('clickme');

		/* toon/verberg afleveradres in bestelproces */

		$('#account-delivery-address:not(.show)').hide();
		$('#account-delivery-address-toggle').click(function() {
			$('#account-delivery-address').toggle();
		});

		/* toon infinite scroll bij nieuws overzicht */

		if($('#news').length) {
			$('#news').addClass('infinite_scroll');
			//$('#news .nav-paging ol').empty();
			init_infinite_scroll();
		}

		/* magazine blokken op homepage in/uitklappen */

		if ($('#home-magazines .xitem').length) {
			$('#home-magazines .xitem').addClass('clickme').click(function(e) {
				$(this).removeClass('closed clickme').addClass('open ');
				$(this).siblings().addClass('closed clickme')
				e.stopPropagation();
			});
		}

		/* magazines blokken uitrekken adhv hoogte excerpt tekst */

		if ($('#magazines').length) {
			var h = 0;
			$('#magazines .xitem .excerpt').each(function() {
				t = $(this).outerHeight();
				if (t > h) h = t;
			});
			$('#magazines .xitem .excerpt').css({ height: h });
		}

		/* store blokken per regel dezelfde hoogte maken */

		if ($('#store .xitem').length) {

			var h = 0;
			var t = 0;
			var x = 0;
			var y = 0;
			var n = 0;

			$elems = $('#store > .xitem');

			$elems.each(function(i) {

				// header hoogte van hoogste blok berekenen
				t = $(this).find('.main-header').height();
				if (t > h) h = t;

				// tekst hoogte van hoogste blok berekenen
				x = $(this).find('.excerpt').height();
				if (x > y) y = x;

				// bij elke 3e de hoogte van alle blokken op dezelfde regel aanpassen
				if ((i++ % 3) == 2) {
					$(this).add( $(this).prev() ).add( $(this).prev().prev() ).find('.main-header').css({ height: h });
					$(this).add( $(this).prev() ).add( $(this).prev().prev() ).find('.excerpt').css({ height: y });
					h = 0;
					y = 0;
				}

				n = i;

			});

			// wanneer op de laatste regel 2 blokken staan
			if (n % 3 == 2) {
				$elems.eq(n-1).add( $elems.eq(n-2) ).find('.main-header').css({ height: h });
				$elems.eq(n-1).add( $elems.eq(n-2) ).find('.excerpt').css({ height: y });
				h = 0;
				y = 0;
			}
		}

		/* magazine blokken per regel dezelfde hoogte maken */

		if ($('#magazines .xitem').length) {

			var h = 0;
			var t = 0;
			var x = 0;
			var y = 0;
			var n = 0;

			$elems = $('#magazines > .xitem');

			$elems.each(function(i) {

				// header hoogte van hoogste blok berekenen
				t = $(this).find('.main-header').height();
				if (t > h) h = t;

				// tekst hoogte van hoogste blok berekenen
				x = $(this).find('.buy .ext').height();
				if (x > y) y = x;

				// bij elke 3e de hoogte van alle blokken op dezelfde regel aanpassen
				if ((i++ % 3) == 2) {
					$(this).add( $(this).prev() ).add( $(this).prev().prev() ).find('.main-header').css({ height: h });
					$(this).add( $(this).prev() ).add( $(this).prev().prev() ).find('.buy .ext').css({ height: y });
					h = 0;
					y = 0;
				}

				n = i;

			});

			// wanneer op de laatste regel 2 blokken staan
			if (n % 3 == 2) {
				$elems.eq(n-1).add( $elems.eq(n-2) ).find('.main-header').css({ height: h });
				$elems.eq(n-1).add( $elems.eq(n-2) ).find('.buy .ext').css({ height: y });
				h = 0;
				y = 0;
			}
		}

		/* toon juiste formulier bij nieuwe of bestaande klant in stap 2 van de winkelwagen */

		if($('input[name="shop-account-type"]').length > 0) {

			$('#clients form').hide();
			frmId = "#shop-frm-"+$('input[name="shop-account-type"]:checked').val()+"-client";
			$(frmId).show();

			$('input[name="shop-account-type"]').click( function() {
				frmId = "#shop-frm-"+$('input[name="shop-account-type"]:checked').val()+"-client";
				$('#clients form').hide();
				$(frmId).show();
			})
		}

		/*
		 * Maak de navigatie sticky
		 */

		function stickyNav() {
			pos = $(window).scrollTop();
			if (pos >= 110) {
				$('#nav-main').css({ position: 'fixed', top: 0 });
			} else {
				$('#nav-main').css({  position: 'relative', top: 0 });
			}
		}

		var didScroll = false;
		$(window).scroll(function() {
			if (!didScroll) {
				timer = setInterval(function() {
					if (didScroll) {
						didScroll = false;
						clearTimeout(timer);
						stickyNav();
					}
				}, 100);
			}
			didScroll = true;
		});

	});
