
var drawerOpen = false;
var duration = 400;

var init = function(opts) {
	if(opts.drawerContent) {
		drawerContent = opts.drawerContent;
		if(!OS_IOS) {
			drawer.add(opts.drawerContent);
		}
	}
};

var drawer, drawerpull, drawerContent;

// on iOS we have to set the drawer and drawerpull with each navigation, on others we can set the content once
if(OS_IOS) {
	drawerContent = null;
} else {
	drawer = $.drawer;
	drawerpull = $.drawerpull;
}

// TODO remove this debug code
var logObj = function(obj, name) {
	var logStr = (name+":\n");
	for(var i in obj) {
		logStr += "\t"+i+" == "+(null==obj[i]?"null":(typeof obj[i] === 'function'?'[function()]':obj[i].toString())) + '\n';
	}
	logStr += '\n';
	console.log(logStr);
};

if(OS_IOS) {
	var widgetViews = [];
	
	var removeWidgetView = function(e) {
		for(var i = widgetViews.length-1; i >= 0; i--) {
			if(widgetViews[i].window === e.source) {
				widgetViews.splice(i, 1);
				return;
			}
		}
	};
}

var advance = function(view) {

	drawer && closeDrawer(true);
	removeDrawerEvents();

	if(OS_IOS) {

		setTimeout(function() {

			var pageWidget, win;
	
			if(widgetViews.length === 0) {
				// adding the root to the widgets. Because Alloy requires NavigationWindow to have at least one child,
				// the widget already exists, we just add our stuff to it
				pageWidget = $.first;
				win = $.first.getView();
	
			} else {
				pageWidget = Widget.createWidget('com.capnajax.navigation', 'page');
				win = pageWidget.getView();
				
				//pageWidget.getView("drawer").remove(drawerContent);
			}
	
			widgetViews.push({window: win, widget: pageWidget, content:view});
			win.addEventListener("close", removeWidgetView);
			win.addEventListener("close", function() {closeDrawer(true);});
	
			// create window using the page widget
			pageWidget.content.add(view);
	
			win.addEventListener('swipe', function(e) {
				if (e.direction === 'right' && !drawerOpen) {
					openDrawer();
				}
				if (e.direction === 'left' && drawerOpen) {
					closeDrawer();	
				}
			});
	
			// move drawer to the new window
			drawer = pageWidget.getView("drawer");
			drawerpull = pageWidget.getView("drawerpull");
	
			drawerContent && drawer.add(drawerContent);
	
			if (widgetViews.length > 1 ) {
				win.leftNavButton = undefined;
			} else {
				setupDrawerEvents();
			}
	
			// advance animation
			if(widgetViews.length > 1) {
				$.widget.openWindow(win, {animated:true});
			}

		}, 0);
		
	} else {
		
		$.widget.addEventListener('swipe', function(e) {
			if (e.direction === 'right' && !drawerOpen) {
				openDrawer();
			}
			if (e.direction === 'left' && drawerOpen) {
				closeDrawer();	
			}
		});

		// place it to the right of the screen then slide it in over top of the existing content
		$.navigation.addView(view);
		
		$.navigation.scrollToView(view);		
		
		$.widget.title = _.last($.widget.children).title;
	}
	
};


/**
 * Goes back in the progression of screens.
 * @param {number|Ti.UI.View} how far back to go. If omitted, this will go back one screen. If negative, it'll go
 * 	back n screens. If positive, it'll go back to the nth screen. If the index is actually a view, it'l go back to
 * 	that view.
 */
var retreat = function(index) {
	
	var viewsArray = OS_IOS ? widgetViews : $.navigation.views;
	
	Ti.API.trace("com.capnajax.navigation::widget::retreat("+index+") called, viewsArray.length = " + viewsArray.length);
	
	// determine how many screens I need to retreat
	var steps = 0;
	if(undefined === index) {
		steps = 1;
		
	} else if(typeof index === 'object') {
		
		for(i = viewsArray.length-1; i >= 0; i--) {
			if(index === (OS_IOS ? viewsArray[i].content : viewsArray[i])) {
				steps = viewsArray.length - i - 1;
				break;
			}
		}
		
	} else if(index < 0) {
		steps = -index;
		
	} else if(index > 0) {
		steps = viewsArray.length - index;
		
	}
	
	Ti.API.trace("com.capnajax.navigation::widget::retreat("+index+") steps = " + steps);

	if(steps <= 0) {
		// zero or invalid input
		// do nothing;
		return;
	}
	
	if(steps >= viewsArray.length) {
		// ensure I am not going back beyond the beginning
		steps = viewsArray.length - 1;
		
	}
	
	drawer && closeDrawer(true);
	removeDrawerEvents();

	if(OS_IOS) {

		// remove the drawer from the about-to-be-closed window
		_.last(widgetViews).widget.getView("drawer").removeAllChildren();

		// close all the windows that are no longer needed, the current window must be closed last.
		windowsToClose = _.last(widgetViews, steps);
		_.each(windowsToClose, function(element) {
			// the setTimeout is to ensure that the operation doesn't occur before the closeDrawer has is complete.
			setTimeout(function() {
				$.widget.closeWindow(element.window);
			}, 0);
		});

		// set up the drawer
		var newCurrentWidget = _.first(_.last(widgetViews, steps+1)).widget;
		drawer = newCurrentWidget.getView("drawer");
		drawerpull = newCurrentWidget.getView("drawerpull");
		
		if(drawerContent) {
			setTimeout(function() {
				// the setTimeout is to ensure that the operation doesn't occur before the closeDrawer has is complete.
				drawer.add(drawerContent);
			}, 0);
		}
		setTimeout(setupDrawerEvents, 0);

	} else {

		$.navigation.scrollToView(_.first(_.last($.navigation.views, steps+1)));
		for(var i = 0; i < steps; i++) {
			Ti.API.trace("com.capnajax.navigation::widget::retreat("+index+") - removing view");
			$.navigation.removeView(_.last($.navigation.views));
		}
		Ti.API.trace("com.capnajax.navigation::widget::retreat("+index+") - scrolling to view");
		
	}

};

var home = function(newHome) {

	if(newHome) {
		
		closeDrawer();
		
		if(OS_IOS) {
			
			for(var i = 1; i < widgetViews.length; i++) {
				$.widget.closeWindow(widgetViews[i].window);
			}

			var oldContent = widgetViews[0].content;

			widgetViews = [];

			advance(newHome);
			
			$.first.content.remove(oldContent);
						
	
		} else {
	
			var oldViews = _.clone($.navigation.views);
			advance(newHome);
			setTimeout(function(){
				_.each(oldViews, function(element, index) {
					$.navigation.removeView(index);
				});
			},500);
		}

	} else {

		retreat(1);

	}
	
	
};


/**
 * Open drawer.
 */
var openDrawer = function() {

	// animate drawer openning -- both the drawer and the drawer pull, but the pull can lag slightly behind the drawer

	// the time for the animation, so that the drawer is moving at about the same speed no matter where the animation
	// starts from
	var animationDuration = duration * -drawer.rect.x / drawer.rect.width;

	drawer.visible = true;
	drawerOpen = true;
	
	drawerContent.fireEvent("draweropen");
	
	drawer.animate({left: 0, duration: animationDuration});
};

/**
 * Close the drawer
 * @param now set to true if the drawer is to close immediately without waiting for animation.
 */
var closeDrawer = function(now) {
	
	if(now) {
		drawer.applyProperties({
			left: -drawer.rect.width,
			visible: false
		});
		drawerOpen = false;	
		drawerContent.fireEvent("drawerclosed", {immediate: true});
	} else {
		drawer.animate({left: -drawer.rect.width, duration: duration}, function() {
			drawer.visible = false;
			drawerOpen = false;	
			drawerContent.fireEvent("drawerclosed", {immediate: false});
		});
	}
};

/**
 * if the drawer is closed, open it, if open, close it
 */
var toggleDrawer = function() {

	drawerOpen ? closeDrawer() : openDrawer();

};

var setupDrawerEvents = function() {

	if(OS_IOS) {	
		drawerpull.addEventListener("click", toggleDrawer);	
	}
	
};

var removeDrawerEvents = function() {

	drawerpull && drawerpull.removeEventListener("click", toggleDrawer);	

};

if(OS_ANDROID) {

	var back = function(e) {
		if($.navigation.views.length > 1) {
			retreat();
			e.cancelBubble = true;
		} else {
			$.widget.close();
		}
	};

	$.widget.addEventListener('androidback', back);

}
if(!OS_IOS) {

	setupDrawerEvents();	

}

_.extend($, {
	init: init,
	advance: advance,
	retreat: retreat,
	home: home
});

$.widget.open();
