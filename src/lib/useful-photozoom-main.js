/*
	Source:
	van Creij, Maurice (2014). "useful.photozoom.js: Overlays a full screen preview of a thumbnail", version 20141127, http://www.woollymittens.nl/.

	License:
	This work is licensed under a Creative Commons Attribution 3.0 Unported License.
*/

// create the constructor if needed
var useful = useful || {};
useful.Photozoom = useful.Photozoom || function () {};

// extend the constructor
useful.Photozoom.prototype.Main = function (config, context) {

	// PROPERTIES

	"use strict";
	this.config = config;
	this.context = context;
	this.element = config.element;

	// METHODS

	this.init = function () {
		var a, b;
		// apply the default values
		this.config.container = this.config.container || document.body;
		this.config.zoom = this.config.zoom || 1;
		this.config.sizer = this.config.sizer || null;
		this.config.slicer = this.config.slicer || '{src}';
		// construct the spinner
		this.busy = new this.context.Busy(this.config.container).init();
		// apply the event handlers
		this.element.addEventListener('click', this.onShow());
		// return the object
		return this;
	};

	this.hide = function () {
		var _this = this;
		// if there is a popup
		if (this.popup) {
			// unreveal the popup
			this.popup.className = this.popup.className.replace(/-active/gi, '-passive');
			// and after a while
			setTimeout(function () {
				// remove it
				_this.config.container.removeChild(_this.popup);
				// remove its reference
				_this.popup = null;
				_this.image = null;
				_this.gestures = null;
			}, 500);
		}
	};

	this.show = function (url, desc, aspect) {
		// if the popup doesn't exist
		if (!this.popup) {
			// show the busy indicator
			this.busy.show();
			// create a container for the popup
			this.popup = document.createElement('figure');
			this.popup.className = (this.config.container === document.body) ?
				'photozoom-popup photozoom-popup-fixed photozoom-popup-passive':
				'photozoom-popup photozoom-popup-passive';
			// add a close gadget
			this.addCloser();
			// add a locator gadget
			this.addLocator();
			// add the popup to the document
			this.config.container.appendChild(this.popup);
			// add the touch events
			this.translation = [0,0];
			this.scaling = [1,1];
			this.gestures = new useful.Gestures().init({
				'element' : this.popup,
				'drag' : this.onTransformed(),
				'pinch' : this.onTransformed(),
				'doubleTap' : this.onDoubleTapped()
			});
			// use a blank description if not given
			desc = desc || '';
			// figure out the aspect ratio of the image
			this.checkImage(url, desc, aspect);
		}
	};

	this.zoom = function (coords) {
		// apply the scaling
		if (coords.scale !== undefined) {
			this.scaling[0] = Math.min( Math.max( this.scaling[0] + coords.scale, 1 ), config.zoom );
			this.scaling[1] = Math.min( Math.max( this.scaling[1] + coords.scale, 1 ), config.zoom );
		}
		// apply the translation
		if (coords.horizontal !== undefined && coords.vertical !== undefined) {
			this.translation[0] = this.translation[0] + coords.horizontal / 2 / this.scaling[0];
			this.translation[1] = this.translation[1] + coords.vertical / 2 / this.scaling[1];
		}
		// limit the translation
		var overscanX = Math.max((this.image.offsetWidth * this.scaling[0] / this.popup.offsetWidth - 1) * 50 / this.scaling[0], 0),
			overscanY = Math.max((this.image.offsetHeight * this.scaling[1] / this.popup.offsetHeight - 1) * 50 / this.scaling[1], 0);
		this.translation[0] = Math.min( Math.max( this.translation[0] , -overscanX), overscanX );
		this.translation[1] = Math.min( Math.max( this.translation[1] , -overscanY), overscanY );
		// formulate the style rule
		var scaling = 'scale(' + this.scaling.join(',') + ')',
			translation = 'translate(' + this.translation.join('%,') + '%)';
		// apply the style rule
		this.image.style.transform = scaling + ' ' + translation;
		this.image.style.webkitTransform = scaling + ' ' + translation;
		this.image.style.msTransform = scaling + ' ' + translation;
	};

	this.addCloser = function () {
		var closer;
		// build a close gadget
		closer = document.createElement('a');
		closer.className = 'photozoom-closer';
		closer.innerHTML = 'x';
		closer.href = '#close';
		// add the close event handler
		closer.onclick = this.onHide();
		// add the close gadget to the image
		this.popup.appendChild(closer);
	};

	this.addLocator = function (url) {
		var parent = this.parent, config = this.config, locator;
		// build the geo marker icon
		locator = document.createElement('a');
		locator.className = 'photozoom-locator';
		locator.innerHTML = 'Show on a map';
		locator.href = '#map';
		// add the event handler
		locator.onclick = this.onLocate();
		// add the location marker to the image
		this.popup.appendChild(locator);
	};

	this.checkImage = function (url, desc, aspect) {
		// if the aspect is known
		if (aspect) {
			// add the image
			this.addImage(url, desc, aspect);
		// else if the size web-service is available
		} else if (this.config.sizer) {
			// retrieve the dimensions first
			var _this = this;
			useful.request.send({
				url : this.config.sizer.replace(/{src}/g, url),
				post : null,
				onProgress : function () {},
				onFailure : function () {},
				onSuccess : function (reply) {
					var dimensions = JSON.parse(reply.responseText);
					_this.addImage(url, desc, dimensions.y[0] / dimensions.x[0]);
				}
			});
		}
	};

	this.addImage = function (url, desc, aspect) {
		var caption, image, size,
			width = this.popup.offsetWidth,
			height = this.popup.offsetHeight;
		// add the caption
		caption = document.createElement('figcaption');
		caption.className = 'photozoom-caption';
		caption.innerHTML = desc;
		// add the zoomed image
		image = document.createElement('img');
		image.className = 'photozoom-image';
		image.setAttribute('alt', desc);
		image.onload = this.onReveal();
		image.onerror = this.onFail();
		// pick the dimensions based on the aspect ratio
		if (aspect > height / width) {
			image.removeAttribute('width');
			image.setAttribute('height', '100%');
			size = 'height=' + (height * this.config.zoom);
		} else {
			image.setAttribute('width', '100%');
			image.removeAttribute('height');
			size = 'width=' + (width * this.config.zoom);
		}
		// add the components to the popup
		this.popup.appendChild(image);
		this.popup.appendChild(caption);
		this.image = image;
		// load the image
		image.src = (this.config.slicer) ? this.config.slicer.replace('{src}', url).replace('{size}', size) : url;
	};

	// EVENTS

	this.onLocate = function () {
		var _this = this;
		return function () {
			var config = _this.config;
			console.log('located', config.located);
			// trigger the located event if available
			if (config.located) { config.located(_this.element); }
		};
	};

	this.onHide = function () {
		var _this = this;
		return function (evt) {
			var config = _this.config;
			// cancel the click
			evt.preventDefault();
			// close the popup
			_this.hide();
			// trigger the closed event if available
			if (config.closed !== null) { config.closed(_this.element); }
		};
	};

	this.onShow = function () {
		var _this = this;
		return function (event) {
			var config = _this.config;
			// cancel the click
			event.preventDefault();
			// try to scrape together the required properties
			var url = _this.element.getAttribute('href') || _this.element.getAttribute('src'),
				desc = _this.element.getAttribute('title') || _this.element.getAttribute('alt'),
				image = (_this.element.nodeName === 'IMG') ? _this.element : _this.element.getElementsByTagName('img')[0],
				aspect = image.offsetHeight / image.offsetWidth;
			// trigger the opened event if available
			var allowed = (config.opened) ? config.opened(_this.element) : function () { return true; };
			// show the popup if allowed by the open event
			if (allowed) { _this.show(url, desc, aspect); }
		};
	};

	this.onFail = function (index) {
		var _this = this;
		return function () {
			var config = _this.config;
			// give up on the popup
			if (_this.popup) {
				// remove the popup
				config.container.removeChild(_this.popup);
				// remove its reference
				_this.popup = null;
				_this.image = null;
				_this.gestures = null;
			}
			// trigger the located handler directly
			if (config.located) { config.located(_this.element); }
			// hide the busy indicator
			_this.busy.hide();
		};
	};

	this.onReveal = function () {
		var _this = this;
		return function () {
			var image, popup = _this.popup;
			// if there is a popup
			if (popup) {
				// find the image in the popup
				image = _this.popup.getElementsByTagName('img')[0];
				// hide the busy indicator
				_this.busy.hide();
				// centre the image
				image.style.marginTop = Math.round((popup.offsetHeight - image.offsetHeight) / 2) + 'px';
				// reveal it
				popup.className = popup.className.replace(/-passive/gi, '-active');
			}
		};
	};

	this.onDoubleTapped = function () {
		var _this = this;
		return function () {
			_this.zoom({
				'scale' : (_this.scaling[0] === 1) ? _this.config.zoom : -_this.config.zoom,
			});
		};
	};

	this.onTransformed = function () {
		var _this = this;
		return function (coords) {
			_this.zoom(coords);
		};
	};
};

// return as a require.js module
if (typeof module !== 'undefined') {
	exports = module.exports = useful.Photozoom.Main;
}
