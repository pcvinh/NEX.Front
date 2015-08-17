angular.module('nexengine.directives', [])
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

				ret = '<span style="font-size:small">'+gui_datetime_difference(sdt)+'</span>';
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
.directive('contentTrim', function() {
	return {
		restrict: 'E',
		scope: {
		  detail: '&onDetail',
		  content: '=', 
		  tab:'=',
		  id: '='
		},
        link: function(scope, element, attrs) {
			var minimized_elements = element;
			function minimize(element) {
				//var t = element.text();        
				var t = scope.content;								
				var tab = scope.tab;
				
				if(t.length < 100) {
					element.html('<a href="#/tab/'+tab+'/detail/'+scope.id+'" style="text-decoration: none;color: #444;">'+t+'</a>');
					return;
				}
				
				element.html(
					'<a href="#/tab/'+tab+'/detail/'+scope.id+'" style="text-decoration: none;color: #444;">'+t.slice(0,100)+'</a>'+'<span>... </span><a href="#/tab/'+tab+'/detail/'+scope.id+'" class="more">More</a>'+
					'<span style="display:none;"><a href="#/tab/'+tab+'/detail/'+scope.id+'" style="text-decoration: none;color: #444;">'+ t.slice(100,t.length)+'</a></span>'
				);
				
				$('a.more', element).click(function(event){
					if(t.length < 225) {
						event.preventDefault();
						$(this).hide().prev().hide();
						$(this).next().fadeIn("slow");       
					}
				});
				
				$('a.less', element).click(function(event){
					event.preventDefault();
					$(this).parent().hide().prev().show().prev().fadeOut("slow");    
				});
			}
	
			minimize(minimized_elements);
        }
    };

})
.directive('interactiveCount', function() {
	return {
		restrict: 'E',
		scope: {
			myitem: '=',
		  /*like : '&onLike',
		  comment : '&onComment',
		  relay : '&onRelay',*/
		},
		templateUrl: 'templates/__directive_interactive_count.html'
    };
})
.directive('interactiveTabs', function() {
	return {
		restrict: 'E',
		scope: {
			myitem: '=',
			myid: '=',
			like : '&onLike',
			comment : '&onComment',
			relay : '&onRelay',
		},
		templateUrl: 'templates/__directive_interactive_tabs.html',
		link: function(scope, element, attrs) {	
			scope.is_show_relay = true;
			if(typeof attrs.isme !== 'undefined') {
				scope.is_show_relay = !scope.$eval(attrs.isme);
			} else { // using my_id to check
				scope.$watch('myitem', function(newValue, oldValue) {
					if ( typeof newValue !== 'undefined') {
						if(scope.myid == scope.myitem.owner.id) {
							scope.is_show_relay = false;
						}
					}
				});
			}
		}
    };
})

/****************************************************
			plugin from 3rd party 
*****************************************************/

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
.directive("owlCarousel", function() {
	return {
		restrict: 'E',
		transclude: false,
		link: function (scope) {
			scope.initCarousel = function(element) {
			  // provide any default options you want
				var defaultOptions = {
					singleItem:true
				};
				var customOptions = scope.$eval($(element).attr('data-options'));
				// combine the two options objects
				for(var key in customOptions) {
					defaultOptions[key] = customOptions[key];
				}
				// init carousel
				$(element).owlCarousel(defaultOptions);
			};
		}
	};
})
.directive('owlCarouselItem', [function() {
	return {
		restrict: 'A',
		transclude: false,
		link: function(scope, element) {
		  // wait for the last item in the ng-repeat then call init
			if(scope.$last) {
				scope.initCarousel(element.parent());
			}
		}
	};
}])
.directive('imgInitial', [function() {
	return {
		restrict: 'A',
		transclude: false,
		link: function(scope, element, attrs) {
			console.log(attrs.ngSrc + "," +attrs.name);
			$(element).initial({name:attrs.name});
		}
	};
}]);
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