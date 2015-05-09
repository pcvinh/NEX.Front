angular.module('nexengine.controllers', ['pubnub.angular.service', 'nexengine.services'])

.controller('SignInCtrl', function($scope, $state, login, main, notification) {
	if(login.checklogin() && login.is_init) {
		$state.go('tab.main');
	} 
	
	$scope.signIn = function(username, password) {
		login.signinup(username, password, 0, $scope);
		
		$scope.$on('loginevent', function(event, data) { 
			if( data.retcod === 0) {
				console.log("login success");
				// init 
				login.init(function() {
					$state.go('tab.main');
				});
			} else if( data.retcod === 1){
				$state.go('register_basic',{userId: data.id});
			} else {
				// need to show pop up or show somewhere that login false due to reason.
				console.log("login false");
			}
		});
	};
})
.controller('RegisterBasicCtrl', function($scope, $state, $stateParams, $http, $cordovaCamera, login) { // this will have the upload picture. 
	var avatarURI;
	
	$scope.choose_image = function() {
		document.addEventListener("deviceready", function () {
			var options = {
			  quality: 50,
			  destinationType: Camera.DestinationType.FILE_URI,
			  sourceType: Camera.PictureSourceType.CAMERA,
			  allowEdit: true,
			  encodingType: Camera.EncodingType.JPEG,
			  targetWidth: 128,
			  targetHeight: 128,
			  popoverOptions: CameraPopoverOptions,
			  saveToPhotoAlbum: false
			};

			$cordovaCamera.getPicture(options).then(function(imageURI) {
			  var image = document.getElementById('myImage');
			  image.src = imageURI;
			  avatarURI = imageData;
			}, function(err) {
			  // error
			});
	  }, false);
	}
	
	$scope.register_basic = function(nickname) {
		console.log('register_basic $scope.nickname = ' + nickname);
		if(typeof nickname == 'undefine' || nickname == null || nickname == '') return;
		
		login.register_basic($stateParams.userId, avatarURI, nickname, function (data) {
			console.log("register success");
				// init 
			login.init(function() {
				$state.go('tab.main');
			});
		});
	}	
	
	$scope.single = function(image) {
		var formData = new FormData();
		formData.append('image', image, image.name);

		$http.post('upload', formData, {
			headers: { 'Content-Type': false },
			transformRequest: angular.identity
		}).success(function(result) {
			$scope.uploadedImgSrc = result.src;
			$scope.sizeInBytes = result.size;
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
.controller('MainCtrl', function($rootScope, $scope, $http,  $location, $ionicModal, $state, $cordovaGeolocation, login, main, config) {
	//RardarList.current_location_radar_init();

	/***  init function  ***/ 
	function init() {
		if(!login.checklogin()) {
			$state.go('signin');
		} else {
			//main.init_radar_here(login.token, 1.3, 103.8);
			$scope.PostList =  main.list;
			$scope.FavouriteList = main.fav_list;
		}
		
		/* modal popup */ 
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
	
	/***  define GUI builder function  ***/ 
	$scope.gui_favourite_icon = function(fav) {
		if(fav.n === 'Home') {
			return "ion-home";
		} else if(fav.n === 'School') {
			return "ion-university";
		} else {
			return "ion-ios-heart-outline";
		}
	}	

	$scope.gui_get_avatar_path = function(filename) {
		return config.nex_server_ip + "avatar/" + filename;
	}
	
	/*** define interactive (button click) ***/ 
	
	function _get_location(callback) {
		var posOptions = {timeout: 10000, enableHighAccuracy: false};
		$cordovaGeolocation
		.getCurrentPosition(posOptions)
		.then(function (position) {
		  var lat  = position.coords.latitude
		  var long = position.coords.longitude
		  callback(lat,long);
		}, function(err) {
		  // error
		});
	}
	
	$scope.clickRadarHere = function() {
		main.clear_radar();
		_get_location(function(lat, long) {
			console.log("init radar here for location ("+lat+" . "+long+")");
			main.init_radar_here(login.token, lat, long);
		});
	}

	$scope.clickRadarFavourite = function(id) {
		console.log("main Favourite chose: " + id);
		main.clear_radar();
		main.init_radar_fovourite(login.token, id);
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
		main.addFavourite(name, login.token, function(data) {
			main.fav_list.push(data.fav);
			$scope.add_favourite_modal.hide();
		});
	}
	
	$scope.clickCreateNew = function() {
		$scope.create_post_modal.show();
	}
	
	$scope._click_createPost = function(message) {
		main.createPost(message, login.token,function(data) {
			$scope.create_post_modal.hide();
		});
	}
	
	$scope._click_closeCreateNewModal = function() {
		$scope.create_post_modal.hide();
	};
	
	$scope._click_Like = function(id, index) {
		main.createPostLike(id, login.token, function(data) {
			console.log($scope.PostList[index]);
			$scope.PostList[index].i.l += 1;
			//$scope.update();
		});
	};
	
	$scope._click_Comment = function(post_id) { // actually go to detail page
		$state.go('tab.m_detail', {detailId: post_id});
	};

	
	$scope._click_Relay = function(id, index) {
		main.createPostRelay(id, login.token,function(data) {
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
.controller('m_DetailCtrl', function($scope, $state, $stateParams, $http, config, login, main) {
	
	function init() {
		if(!login.checklogin()) {
			$state.go('signin');
		} else {
			main.init_post_detail($stateParams.detailId, login.token, $scope);
		}
	}
	
	$scope.gui_get_avatar_path = function(filename) {
		console.log(filename);
		return config.nex_server_ip + "avatar/" + filename;
	}
	
	$scope._click_Like = function(id) {
		main.createPostLike(id, login.token, function(data) {
			$scope.myitem.i.l += 1;
		});
	};
	
	$scope._click_Relay = function(id) {
		main.createPostRelay(id, login.token, function(data) {
			$scope.myitem.i.r += 1;
		});
	};
	
	$scope._click_createComment = function(comment) { // this is to submit comment
		main.createPostComment($stateParams.detailId, comment, login.token, function(data) {
			console.log(data);
			var temp = {"owner" : {"avatar" : data.avatar, "nickname" : data.nickname}, "content" : data.content};
			$scope.comments.unshift(temp);
			comment.Content = "";
		})
	};
	
	init();
})
.controller('m_CommentCtrl', function($scope, $state) {

})
.controller('m_ChatroomCtrl', function($scope, $state) {

})
.controller('m_ProfileCtrl', function($scope, $state) {

})

///////////////////////////////////////////////////
.controller('NotifyCtrl', function($rootScope, $scope, $location, $state, login, notification, config) {
	
	// $scope.groups = [];
	// $scope.groups[0] = {
	  // name: 'Request waiting for acceptance',
	  // type:0,
	  // items: [{'owner' : {'id':1,'name':'Phan Cao Vinh', 'avatar':'Vinh.jpg'},'notify' : 'to be <strong>friend</strong>'}]
	// };	
	// $scope.groups[1] = {
	  // name: 'Notification',
	  // type:1,
	  // items: []
	// };
	// /***** Accordion list of notify ***** 
	// * if given group is the selected group, deselect it
	// * else, select the given group
	// *************************************/
	// $scope.toggleGroup = function(group) {
		// if ($scope.isGroupShown(group)) {
		  // $scope.shownGroup = null;
		// } else {
		  // $scope.shownGroup = group;
		// }
	// };
	// $scope.isGroupShown = function(group) {
		// return $scope.shownGroup === group;
	// };
	
	/***  init function  ***/ 
	function init() {
		if(!login.checklogin()) {
			$state.go('signin');
		} else {
			console.log("Notification state with list =  " +  JSON.stringify(notification.list));
			$scope.list =  notification.list;
		}
	}
	
	$scope.gui_get_avatar_path = function(filename) {
		return config.nex_server_ip + "avatar/" + filename;
	}
	
	init();
	
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
.controller('MeCtrl', function($scope, $state, $stateParams, me, login) {  
	$scope.logout = function() {
		login.logout();
		$state.go('signin');
	};  
})
.controller('me_DetailCtrl', function($scope, $state) {

})
.controller('me_CommentCtrl', function($scope, $state) {

})
.controller('me_ChatroomCtrl', function($scope, $state) {

})
.controller('me_ProfileCtrl', function($scope, $state) {

})
