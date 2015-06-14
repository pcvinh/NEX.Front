angular.module('nexengine.directives', [])
.directive("autoGrow", ['$window', function($window){
    return {
        link: function (scope, element, attr, $window) {
            var update = function () {
                var scrollLeft, scrollTop;
                scrollTop = window.pageYOffset;
                scrollLeft = window.pageXOffset;

                element.css("height", "auto");
                var height = element[0].scrollHeight;
                if (height > 0) {
                    element.css("height", height + "px");
                }
                window.scrollTo(scrollLeft, scrollTop);
            };
            scope.$watch(attr.ngModel, function () {
                update();
            });
            attr.$set("ngTrim", "false");
        }
    };
}])
.directive('mainCardHeader', function() {
	return {
		restrict: 'E',
		/*scope: {
		  trimcontent: '=item'
		},*/
        link: function(scope, element, attrs) {
			var t = scope.myitem.type;
			if(t === 0) {
				ret = '<h2 style="display:inline !important"><a href="#/tab/main/profile/'+scope.myitem.owner.id+'" style="text-decoration: none;color: #222; font-weight: bold;">'+scope.myitem.owner.nickname+'</a></h2>';
				element.html(ret);
			} else {
				ret = '<h2 style="display:inline !important"><a href="#/tab/main/profile/'+scope.myitem.owner.id+'" style="text-decoration: none;color: #222; font-weight: bold;">'+scope.myitem.owner.nickname+'</a> <span style="color: #777;font-size:small">ask a question</span> <i class="icon ion-chatboxes"></i></h2>';
				element.html(ret);
			}
        }
    };
})
.directive('detailCardHeader', function() {
	return {
		restrict: 'E',
		scope: {
		  page: '=',
		  user: '='
		},
        link: function(scope, element, attrs) {
			var t = scope.page;
			function update() {
				if(t === 0) { // 0 = main page, 1=notification, 2 = me 
					ret = '<h2 style="display:inline !important"><a href="#/tab/main/profile/'+scope.user.id+'" style="text-decoration: none;color: #222; font-weight: bold;">'+scope.user.nickname+'</a></h2>';
					element.html(ret);
				} else {
					ret = '<h2 style="display:inline !important"><a href="#/tab/notify/profile/'+scope.user.id+'" style="text-decoration: none;color: #222; font-weight: bold;">'+scope.user.nickname+'</a></h2>';
					element.html(ret);
				}
			}
			
			scope.$watch('user.id', function(newValue, oldValue) {
				if ( typeof newValue !== 'undefined') {
					update();
				}
			});
        }
    };
})
.directive('trimDatetime', function() {
	function gui_datetime_difference(sdt) {
		var now = new Date();
		var dt = new Date(sdt);
		var delta = Math.round((now - dt) / 1000);
		if (delta < 60) {
			return delta + " seconds ago";
		} else if (delta < 60 * 60) {
			return Math.round(delta / 60) + " minutes ago";
		} else if (delta < 60 * 60 * 24) {
			return Math.round(delta / (60 * 60)) + " hours ago";
		} else if (delta < 60 * 60 * 24 * 7) {
			return Math.round(delta / (60 * 60 * 24)) + " days ago";
		} else if(delta < 60 * 60 * 24 * 7 * 365){
			var options = {
				month: "long", day: "numeric"
			};
			return dt.toLocaleDateString("en-US",options);
		} else {
			var options = {
				year: "numeric", month: "long", day: "numeric"
			};
			return dt.toLocaleDateString("en-US",options);		
		}
	}
	
	return {
		restrict: 'E',
		scope: {
		  datetime: '=createDatetime'
		},
        link: function(scope, element, attrs) {
			function update() {
				var sdt = scope.datetime;

				ret = '<p style="font-size:small">'+gui_datetime_difference(sdt)+'</p>';
				element.html(ret);
			}
			
			scope.$watch('datetime', function(newValue, oldValue) {
				if ( typeof newValue !== 'undefined') {
					update();
				}
			});
        }
    };
})
.directive('mainCardContentTrim', function() {
	return {
		restrict: 'E',
		/*scope: {
		  trimcontent: '=item'
		},*/
        link: function(scope, element, attrs) {
			var minimized_elements = element;
			function minimize(element, id) {
				//var t = element.text();        
				var t = scope.myitem.content;
				if(t.length < 100) {
					element.html('<a href="#/tab/main/detail/'+id+'" style="text-decoration: none;color: #444;">'+t+'</a>');
					return;
				}
				element.html(
					'<a href="#/tab/main/detail/'+id+'" style="text-decoration: none;color: #444;">'+t.slice(0,100)+'</a>'+'<span>... </span><a href="#" class="more">More</a>'+
					'<span style="display:none;"><a href="#/tab/main/detail/'+id+'" style="text-decoration: none;color: #444;">'+ t.slice(100,t.length)+'</a></span>'
				);
				
				$('a.more', element).click(function(event){
					event.preventDefault();
					$(this).hide().prev().hide();
					$(this).next().fadeIn("slow");        
				});
				
				$('a.less', element).click(function(event){
					event.preventDefault();
					$(this).parent().hide().prev().show().prev().fadeOut("slow");    
				});
			}
	
			minimize(minimized_elements, attrs.id);
        }
    };

})
.directive('mainCardInteractiveCount', function() {
	return {
		restrict: 'E',
		/*scope: {
		  trimcontent: '=item'
		},*/
        link: function(scope, element, attrs) {
			function update() {
				var t = scope.myitem.type;
				if(t === 0 || t == null) {
					ret = '<p style="font-size:small"><a href="#" class="subdued">'+scope.myitem.i.l+' Like</a><a href="#" class="subdued">'+scope.myitem.i.c+' Comments</a><a href="#" class="subdued">'+scope.myitem.i.r+' Relay</a></p>';
					element.html(ret);
				} else if(t === 1){
					ret = '<p style="font-size:small"><a href="#" class="subdued">'+scope.myitem.i.c+' Answers</a><a href="#" class="subdued">'+scope.myitem.i.r+' Relay</a></p>';
					element.html(ret);
				}
			}
			
			scope.$watch('myitem.type', function(newValue, oldValue) {
				if ( typeof newValue !== 'undefined') {
					update();
				}
			});
        }
    };
})
.directive('headerShrink', function($document) {
  var fadeAmt;

  var shrink = function(subHeader, header, amt, dir) {
    ionic.requestAnimationFrame(function() { 
      //amt = 2.0*Math.round(amt/2.0);
      if(dir === 1) {
        var _amt = Math.min(44, amt - 44);
      } else if(dir === -1) {
        var _amt = Math.max(0, amt - 44);
      }
      header.style[ionic.CSS.TRANSFORM] = 'translate3d(0,-' + _amt + 'px, 0)';
      subHeader.style[ionic.CSS.TRANSFORM] = 'translate3d(0,-' + amt + 'px, 0)';
    });
  };

  return {
    restrict: 'A',
    link: function($scope, $element, $attr) {
      var starty = $scope.$eval($attr.headerShrink) || 0;
      var shrinkAmt;
      
      var header = $document[0].body.querySelector('.bar-header');
      var subHeader = $document[0].body.querySelector('.bar-subheader');
      var headerHeight = header.offsetHeight;
      var subHeaderHeight = subHeader.offsetHeight;

      var prev = 0
        , delta = 0
        , dir = 1
        , prevDir = 1
        , prevShrinkAmt = 0;
      
      $element.bind('scroll', function(e) {
        delta = e.detail.scrollTop - prev;
        dir = delta >= 0 ? 1 : -1;
        // Capture change of direction
        if(dir !== prevDir) 
          starty = e.detail.scrollTop;
        // If scrolling up
        if(dir === 1) {
          // Calculate shrinking amount
          shrinkAmt = headerHeight + subHeaderHeight - Math.max(0, (starty + headerHeight + subHeaderHeight) - e.detail.scrollTop);
          // Start shrink
          shrink(subHeader, header, Math.min(88, shrinkAmt), dir);
          // Save prev shrink amount
          prevShrinkAmt = Math.min(88, shrinkAmt);
        }
        // If scrolling down
        else {
          // Calculate expansion amount
          shrinkAmt = prevShrinkAmt - Math.min(88, (starty - e.detail.scrollTop));
          shrink(subHeader, header, shrinkAmt, dir);
        }
        prevDir = dir;
        prev = e.detail.scrollTop;
      });
    }
  }
})
// .directive('notifyItem', function ($compile) {
    // var imageTemplate = '<div class="entry-photo"><h2>&nbsp;</h2><div class="entry-img"><span><a href="{{rootDirectory}}{{content.data}}"><img ng-src="{{rootDirectory}}{{content.data}}" alt="entry photo"></a></span></div><div class="entry-text"><div class="entry-title">{{content.title}}</div><div class="entry-copy">{{content.description}}</div></div></div>';
    // var videoTemplate = '<div class="entry-video"><h2>&nbsp;</h2><div class="entry-vid"><iframe ng-src="{{content.data}}" width="280" height="200" frameborder="0" webkitAllowFullScreen mozallowfullscreen allowFullScreen></iframe></div><div class="entry-text"><div class="entry-title">{{content.title}}</div><div class="entry-copy">{{content.description}}</div></div></div>';
    // var noteTemplate = '<div class="entry-note"><h2>&nbsp;</h2><div class="entry-text"><div class="entry-title">{{content.title}}</div><div class="entry-copy">{{content.data}}</div></div></div>';

    // var getTemplate = function(contentType) {
        // var template = '';

        // switch(contentType) {
            // case 'image':
                // template = imageTemplate;
                // break;
            // case 'video':
                // template = videoTemplate;
                // break;
            // case 'notes':
                // template = noteTemplate;
                // break;
        // }

        // return template;
    // }

    // var linker = function(scope, element, attrs) {
        // scope.rootDirectory = 'images/';

        // element.html(getTemplate(scope.content.content_type)).show();

        // $compile(element.contents())(scope);
    // }

    // return {
        // restrict: "E",
        // link: linker,
        // scope: {
            // content:'='
        // }
    // };
// });