angular.module('nexengine.directives', [])
.directive('vTrimContent', function() {
	return {
		restrict: 'E',
		/*scope: {
		  trimcontent: '=item'
		},*/
        link: function(scope, element, attrs) {
			var minimized_elements = element;
			console.log(scope.myitem.content);
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
.directive('notifyItem', function ($compile) {
    var imageTemplate = '<div class="entry-photo"><h2>&nbsp;</h2><div class="entry-img"><span><a href="{{rootDirectory}}{{content.data}}"><img ng-src="{{rootDirectory}}{{content.data}}" alt="entry photo"></a></span></div><div class="entry-text"><div class="entry-title">{{content.title}}</div><div class="entry-copy">{{content.description}}</div></div></div>';
    var videoTemplate = '<div class="entry-video"><h2>&nbsp;</h2><div class="entry-vid"><iframe ng-src="{{content.data}}" width="280" height="200" frameborder="0" webkitAllowFullScreen mozallowfullscreen allowFullScreen></iframe></div><div class="entry-text"><div class="entry-title">{{content.title}}</div><div class="entry-copy">{{content.description}}</div></div></div>';
    var noteTemplate = '<div class="entry-note"><h2>&nbsp;</h2><div class="entry-text"><div class="entry-title">{{content.title}}</div><div class="entry-copy">{{content.data}}</div></div></div>';

    var getTemplate = function(contentType) {
        var template = '';

        switch(contentType) {
            case 'image':
                template = imageTemplate;
                break;
            case 'video':
                template = videoTemplate;
                break;
            case 'notes':
                template = noteTemplate;
                break;
        }

        return template;
    }

    var linker = function(scope, element, attrs) {
        scope.rootDirectory = 'images/';

        element.html(getTemplate(scope.content.content_type)).show();

        $compile(element.contents())(scope);
    }

    return {
        restrict: "E",
        link: linker,
        scope: {
            content:'='
        }
    };
});