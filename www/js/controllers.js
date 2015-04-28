angular.module('nexengine.controllers', ['pubnub.angular.service', 'nexengine.services'])

.controller('SignInCtrl', function($scope, $state, login) {
	if(login.checklogin()) {
		$state.go('tab.main');
	} 
	
	$scope.signIn = function(username, password) {
		login.signinup(username, password, 0, $scope);
		
		$scope.$on('loginevent', function(event, data) { 
			if( data.retcod === 0) {
				console.log("login success");
				$state.go('tab.main');
			} else {
				console.log("login false");
			}
		});
	};
})
/////////////////////////////////////////////////////
//////////////////// Tab Main View //////////////////
/////////////////////////////////////////////////////

/**** MainCtrl ************************
1. Property:
- $scope.PostList : feed by: init_radar_get_post_list(for previous Posts) OR PubNub subscribe channels (for current & future Post)
- $scope.FavouriteList:
2. Methods
	- gui_favourite_icon
	- gui_card
3. init()
	1. check login
	2. create "$scope.add_favourite_modal"
	3. create "$scope.create_post_modal"
4. _private_functions
- _serialize
****************************************/
.controller('MainCtrl', function($rootScope, $scope, $http,  $location, $ionicModal, $state, login, radar) {
	//RardarList.current_location_radar_init();
	$scope.PostList =  radar.list;
	$scope.FavouriteList = [];
	
	/*  private functions  */ 
	function _serialize(obj) {
		var str = [];
		for(var p in obj){
			console.log(p + ":" +(Array.isArray( obj[p])));
			if (Array.isArray( obj[p])) {
				for(var i in obj[p])
					str.push(encodeURIComponent(p) + "[]=" + encodeURIComponent(obj[p][i]));
			} else {
				str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
			}
		}
		return str.join("&");
	}
	
	/*  init function  */ 
	function init() {
		if(!login.checklogin()) {
			$state.go('signin');
		} else if(!login.is_init){
			login.init(function(fav_list){
				$scope.FavouriteList = $rootScope.fav_list;
				radar.init_radar_here(login.token, 1.3, 103.8);
				console.log("init success");
			});
		} else {
			//radar.init_radar_here(login.token, 1.3, 103.8);
			$scope.FavouriteList = $rootScope.fav_list;
		}
		
		/*  build modal  */ 
		$ionicModal.fromTemplateUrl('popup-add-favourite.html', {
			scope: $scope,
			animation: 'slide-in-left'
		}).then(function(modal) {
			$scope.add_favourite_modal = modal;
		});
		
		$ionicModal.fromTemplateUrl('popup-create-new.html', {
			scope: $scope,
			animation: 'slide-in-up'
		}).then(function(modal) {
			$scope.create_post_modal = modal;
		});
	}
	
	/*  define GUI builder function  */ 
	$scope.gui_favourite_icon = function(fav) {
		if(fav.n === 'Home') {
			return "ion-home";
		} else if(fav.n === 'School') {
			return "ion-university";
		} else {
			return "ion-ios-heart-outline";
		}
	}	

	
	/* define interactive (button click) */ 
	// switch radar
	$scope.clickRadarHere = function() {
		radar.clear();
		radar.init_radar_here(login.token, 1.3, 103.8);
	}

	$scope.clickRadarFavourite = function(id) {
		console.log("Radar Favourite chose: " + id);
		radar.clear();
		radar.init_radar_fovourite(login.token, id);
	}
		
	$scope.clickRadarMap = function() {
		
	}
	
	// button click
	$scope.clickAddFavourite = function() {
		$scope.add_favourite_modal.show();
	}
	
	$scope._click_closeAddFavouriteModal = function() {
		$scope.add_favourite_modal.hide();
	};

	
	$scope._click_addFavourite = function(name) {
		$http({
			  method  : 'POST',
			  url     : '/create_radar_favourite',
				/*transformRequest: function(obj) {
					var str = [];
					for(var p in obj)
					if (obj.hasOwnProperty(p)) {
					  str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
					}
					return str.join("&");
				},*/
			  data    : _serialize({ Token: login.token, Channels: radar.current_channels, Name : name}),  // pass in data as strings	
			  headers : { 'Content-Type': 'application/x-www-form-urlencoded' }
			 }).success(function(data) {
					$rootScope.fav_list.push(data.fav);
					$scope.add_favourite_modal.hide();
			  });
			  
	}
	
	$scope.clickCreateNew = function() {
		$scope.create_post_modal.show();
	}
	
	$scope._click_createPost = function(message) {
		$http({
			  method  : 'POST',
			  url     : '/create_post',
				transformRequest: function(obj) {
					var str = [];
					for(var p in obj)
					str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
					return str.join("&");
				},
			  data    : { Channels: radar.current_channels[0], Title : message.Title, Content: message.Content, Token: login.token},  // pass in data as strings	
			  headers : { 'Content-Type': 'application/x-www-form-urlencoded' }
			 }).success(function(data) {
					$scope.create_post_modal.hide();
			  });

	}
	
	$scope._click_closeCreateNewModal = function() {
		$scope.create_post_modal.hide();
	};
	
	$scope._click_Like = function(id, index) {
		$http({
		method  : 'POST',
		url     : '/create_post_like',
		transformRequest: function(obj) {
			var str = [];
			for(var p in obj)
			str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
			return str.join("&");
		},
		data    : { id: id, Token: login.token},  // pass in data as strings	
		headers : { 'Content-Type': 'application/x-www-form-urlencoded' }
		}).success(function(data) {
			console.log($scope.PostList[index]);
			$scope.PostList[index].i.l += 1;
			//$scope.update();
		});
	};
	
	$scope._click_Comment = function(post_id) { // actually go to detail page
		$state.go('tab.m_detail', {detailId: post_id});
	};

	
	$scope._click_Relay = function(id, index) {
		$http({
		method  : 'POST',
		url     : '/create_post_relay',
		transformRequest: function(obj) {
			var str = [];
			for(var p in obj)
			str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
			return str.join("&");
		},
		data    : { channel: radar.current_channels[0], id: id, Token: login.token},  // pass in data as strings	
		headers : { 'Content-Type': 'application/x-www-form-urlencoded' }
		}).success(function(data) {
			console.log($scope.PostList[index]);
			$scope.PostList[index].i.r += 1;
		});
	};
	
	init();
})
/**** m_DetailCtrl : Main -> Detail Controller ************************
1. Property:

2. Methods

3. init()

4. _private_functions

****************************************/
.controller('m_DetailCtrl', function($scope, $state, $stateParams, $http, login) {
	console.log();
	var url = "http://107.167.183.96:5000/get_post_detail?callback=JSON_CALLBACK&id="+$stateParams.detailId+"&token="+login.token;
	var request = $http.jsonp(url);		
	console.log(url);
	request.success(function(data) {
		console.log(JSON.stringify(data));
		if(data.retcode === 0) {
			$scope.myitem = data.post_detail;
			console.log(JSON.stringify($scope.myitem));
			
			url = "http://107.167.183.96:5000/get_post_comment_list?callback=JSON_CALLBACK&id="+$stateParams.detailId+"&token="+login.token;
			request = $http.jsonp(url);	
			request.success(function(data1) {
				if(data1.retcode === 0) {
					$scope.comments = data1.comments;
				}
			});
		}
	});
	
	$scope._click_Like = function() {
		$http({
		method  : 'POST',
		url     : '/create_post_like',
		transformRequest: function(obj) {
			var str = [];
			for(var p in obj)
			str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
			return str.join("&");
		},
		data    : { id: id, Token: login.token},  // pass in data as strings	
		headers : { 'Content-Type': 'application/x-www-form-urlencoded' }
		}).success(function(data) {
			$scope.myitem.i.l += 1;
			//$scope.update();
		});
	};
	
	$scope._click_Relay = function() {
		$http({
		method  : 'POST',
		url     : '/create_post_relay',
		transformRequest: function(obj) {
			var str = [];
			for(var p in obj)
			str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
			return str.join("&");
		},
		data    : { channel: radar.current_channels[0], id: id, Token: login.token},  // pass in data as strings	
		headers : { 'Content-Type': 'application/x-www-form-urlencoded' }
		}).success(function(data) {
			$scope.myitem.i.r += 1;
		});
	};
	
	$scope._click_createComment = function(comment) { // this is to submit comment
		$http({
		method  : 'POST',
		url     : '/create_post_comment',
		transformRequest: function(obj) {
			var str = [];
			for(var p in obj)
			str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
			return str.join("&");
		},
		data    : { id: $stateParams.detailId, Token: login.token, content : comment.Content},  // pass in data as strings	
		headers : { 'Content-Type': 'application/x-www-form-urlencoded' }
		}).success(function(data) {
			console.log(data);
			var temp = {"owner" : {"avatar" : "vinh.jpg", "name" : "Phan Cao Vinh"}, "content" : comment.Content};
			$scope.comments.unshift(temp);
			comment.Content = "";
		});
	};
})
.controller('m_CommentCtrl', function($scope, $state) {

})
.controller('m_ChatroomCtrl', function($scope, $state) {

})
.controller('m_ProfileCtrl', function($scope, $state) {

})

///////////////////////////////////////////////////
.controller('NotifyCtrl', function($scope, $state) {
	$scope.groups = [];

	$scope.groups[0] = {
	  name: 'Request waiting for acceptance',
	  type:0,
	  items: [{'owner' : {'id':1,'name':'Phan Cao Vinh', 'avatar':'Vinh.jpg'},'notify' : 'to be <strong>friend</strong>'}]
	};
	
	$scope.groups[1] = {
	  name: 'Notification',
	  type:1,
	  items: []
	};
	
	$scope.groups[2] = {
	  name: 'Invitation',
	  type:2,
	  items: []
	};


	/*
	* if given group is the selected group, deselect it
	* else, select the given group
	*/
	$scope.toggleGroup = function(group) {
		if ($scope.isGroupShown(group)) {
		  $scope.shownGroup = null;
		} else {
		  $scope.shownGroup = group;
		}
	};
	$scope.isGroupShown = function(group) {
		return $scope.shownGroup === group;
	};
})
.controller('n_DetailCtrl', function($scope, $state) {

})
.controller('n_CommentCtrl', function($scope, $state) {

})
.controller('n_ChatroomCtrl', function($scope, $state) {

})
.controller('n_ProfileCtrl', function($scope, $state) {

})

///////////////////////////////////////////////////
.controller('MeCtrl', function($scope, $stateParams) {
    $scope.data = {
    showDelete: false
  };
  
  $scope.edit = function(item) {
    alert('Edit Item: ' + item.id);
  };
  $scope.share = function(item) {
    alert('Share Item: ' + item.id);
  };
  
  $scope.moveItem = function(item, fromIndex, toIndex) {
    $scope.items.splice(fromIndex, 1);
    $scope.items.splice(toIndex, 0, item);
  };
  
  $scope.onItemDelete = function(item) {
    $scope.items.splice($scope.items.indexOf(item), 1);
  };
  
  $scope.items = [
    { id: 0 },
    { id: 1 },
    { id: 2 },
    { id: 3 }
  ];
  
})
.controller('me_DetailCtrl', function($scope, $state) {

})
.controller('me_CommentCtrl', function($scope, $state) {

})
.controller('me_ChatroomCtrl', function($scope, $state) {

})
.controller('me_ProfileCtrl', function($scope, $state) {

})
