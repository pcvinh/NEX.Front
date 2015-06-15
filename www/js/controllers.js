angular.module('nexengine.controllers', ['pubnub.angular.service', 'nexengine.services'])

.controller('SignInCtrl', function($scope, $state, login, main, notification) {
	if(login.checklogin() && login.is_init) {
		$state.go('tab.main');
	} 
	
	$scope.signIn = function(username, password) {
		login.signinup(username, password, 0, $scope);
		
		$scope.$on('loginevent', function(event, data) { 
			if( data.retcode === 0) {
				console.log('login success');
				// init 
				
				login.init(function() {
					$state.go('tab.main');
				});
			} else if( data.retcode === 1){
				$state.go('register_basic_nickname',{userId: data.id});
			} else {
				// need to show pop up or show somewhere that login false due to reason.
				console.log('login false');
			}
		});
	};
})
.controller('RegisterBasicNicknameCtrl', function($scope, $state, $stateParams, $http, login) { // this will have the upload picture. 
	$scope.register_basic = function(nickname) {
		if(typeof nickname == 'undefine' || nickname == null || nickname == '') return;
		
		login.register_basic_nickname($stateParams.userId, nickname, function (data) {
				$state.go('register_basic_fullname');
		});
	}
})
.controller('RegisterBasicFullnameCtrl', function($scope, $state, $stateParams, $http, login) { // this will have the upload picture. 
	$scope.register_basic = function(fullname) {
		if(typeof fullname == 'undefine' || fullname == null || fullname == '') return;
		
		login.register_basic_fullname(fullname, function (data) {
				$state.go('register_basic_avatar');
		});
	}
})
.controller('RegisterBasicAvatarCtrl', function($scope, $state, $http, $cordovaCamera, login, config) { // this will have the upload picture. 
	var avatarURI;
	$scope.choose_image = function(type) {
		if(config.is_device) {
			document.addEventListener('deviceready', function () {
				var options = {
				  quality: 50,
				  destinationType: Camera.DestinationType.FILE_URI,
				  sourceType: type === 0 ? Camera.PictureSourceType.CAMERA : Camera.PictureSourceType.PHOTOLIBRARY ,
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
				  avatarURI = imageURI;
				  login.register_basic_avatar(avatarURI, function (data) {
						$state.go('tab.main');
					});
				}, function(err) {
				  // error
					console.log('Error to get picture from device.');
				});
		  }, false);
		} 
	}
	
	$scope.register_basic = function() {
		login.register_basic_avatar(avatarURI, function (data) {		
			login.init(function() {
				$state.go('tab.main');
			});
		});
	}
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
	2. create '$scope.add_favourite_modal'
	3. create '$scope.create_post_modal'
4. _private_functions
- _serialize
****************************************/
.controller('MainCtrl', function($rootScope, $scope, $http,  $location, $ionicModal, $state, $cordovaGeolocation, login, main, post, config) {
	/***  init function  ***/ 
	function init() {
		if(!login.checklogin()) {
			$state.go('signin');
		} else {
			$scope.PostList =  main.list;
			$scope.FavouriteList = main.fav_list;
			if(!login.is_init) {
				login.init(function(){
					
				});
			}
			
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
			return 'ion-home';
		} else if(fav.n === 'School') {
			return 'ion-university';
		} else {
			return 'ion-ios-heart-outline';
		}
	}	

	$scope.gui_get_avatar_path = function(filename) {
		return typeof filename === 'undefined'|| filename === null ? 'img/avatar.png' : config.nex_server_ip + 'avatar/' + filename;
	}
	
	/*** define interactive (button click) ***/ 
	
	/*function _get_location(callback) {
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
	}*/
	
	function _get_location(callback) { // for testing purpose
		var lat = 1.297649, long = 103.850713;
		callback(lat,long);
	}
	
	$scope.clickRadarHere = function() {
		main.clear_radar();
		_get_location(function(lat, long) {
			main.init_radar_here(login.token, lat, long);
		});
	}

	$scope.clickRadarFavourite = function(id) {
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
	
	$scope.clickCreateNew = function(title, type) {
		$scope.pop_up_name = title;
		$scope.type = type;
		$scope.create_post_modal.show();
	}
	
	$scope._click_createPost = function(message) {
		post.createPost(message, login.token, main.current_channels[0], $scope.type, function(data) {
			$scope.create_post_modal.hide();
		});
	}
	
	$scope._click_closeCreateNewModal = function() {
		$scope.create_post_modal.hide();
	};
	
	$scope._click_Like = function(id, index) {
		post.createPostLike(id, login.token, function(data) {
			console.log($scope.PostList[index]);
			$scope.PostList[index].i.l += 1;
			//$scope.update();
		});
	};
	
	$scope._click_Comment = function(post_id) { // actually go to detail page
		$state.go('tab.m_detail', {detailId: post_id});
	};

	
	$scope._click_Relay = function(id, index) {
		post.createPostRelay(id, login.token, main.current_channels[0],function(data) {
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
.controller('m_DetailCtrl', function($scope, $state, $stateParams, $http, config, login, post) {
	$scope.page = 0;
	function init() {
		if(!login.checklogin()) {
			$state.go('signin');
		} else {
			post.init_post_detail($stateParams.detailId, login.token, $scope);
		}
	}
	
	$scope.gui_get_avatar_path = function(filename) {
		return typeof filename === 'undefined'|| filename === null ? 'img/avatar.png' : config.nex_server_ip + 'avatar/' + filename;
	}
	
	$scope.gui_get_title = function(filename) {
		if($scope.myitem.type === 1) return "Answer detail";
		return "Post detail";
	}
	
	$scope._click_Like = function(id) {
		post.createPostLike(id, login.token, function(data) {
			$scope.myitem.i.l += 1;
		});
	};
	
	$scope._click_Relay = function(id) {
		post.createPostRelay(id, login.token, function(data) {
			$scope.myitem.i.r += 1;
		});
	};
	
	$scope._click_createComment = function(comment) { // this is to submit comment
		post.createPostComment($stateParams.detailId, comment, login.token, function(data) {
			if(data.retcode === 0) {
				var temp = data.content;
				$scope.comments.unshift(temp);
				comment.Content = '';
			}
		})
	};
	
	init();
})
.controller('m_CommentCtrl', function($scope, $state) {

})
.controller('m_ChatroomCtrl', function($scope, $state) {

})
.controller('m_ProfileCtrl', function($scope, $state, $stateParams, login, profile, config) {
	if(!login.checklogin()) {
		$state.go('signin');
	} else {
		$scope.Profile = {};
		$scope.ProfilePostList =  [];
		profile.get_profile_header($scope, login.token, $stateParams.profileId);
		profile.get_profile_post_list($scope, login.token, $stateParams.profileId);
	}
	
	$scope.gui_get_avatar_path = function(filename) {
		return typeof filename === 'undefined'|| filename === null ? 'img/avatar.png' : config.nex_server_ip + 'avatar/' + filename;
	}
	
	$scope.gui_get_profile_name = function() {
		if($scope.Profile.fullname !== null) return '('+$scope.Profile.nickname+') ' + $scope.Profile.fullname;		
		
		return $scope.Profile.nickname;
	}
	
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
			$scope.list =  notification.list;
		}
	}
	
	$scope.gui_get_avatar_path = function(filename) {
		return typeof filename === 'undefined'|| filename === null ? 'img/avatar.png' : config.nex_server_ip + 'avatar/' + filename;
	}
	
	init();
	
})
.controller('n_DetailCtrl', function($scope, $state, $stateParams, config, login, post) {
	$scope.page = 1;
	function init() {
		if(!login.checklogin()) {
			$state.go('signin');
		} else {
			post.init_post_detail($stateParams.detailId, login.token, $scope);
		}
	}
	
	$scope.gui_get_avatar_path = function(filename) {
		return typeof filename === 'undefined'|| filename === null ? 'img/avatar.png' : config.nex_server_ip + 'avatar/' + filename;
	}
	
	$scope._click_Like = function(id) {
		post.createPostLike(id, login.token, function(data) {
			$scope.myitem.i.l += 1;
		});
	};
	
	$scope._click_Relay = function(id) {
		post.createPostRelay(id, login.token, function(data) {
			$scope.myitem.i.r += 1;
		});
	};
	
	$scope._click_createComment = function(comment) { // this is to submit comment
		post.createPostComment($stateParams.detailId, comment, login.token, function(data) {
			if(data.retcode === 0) {
				var temp = data.content;
				$scope.comments.unshift(temp);
				comment.Content = '';
			}
		})
	};
	
	init();
})
.controller('n_CommentCtrl', function($scope, $state) {

})
.controller('n_ChatroomCtrl', function($scope, $state) {

})
.controller('n_ProfileCtrl', function($scope, $state, $stateParams, config, login, profile) {
	if(!login.checklogin()) {
		$state.go('signin');
	} else {
		$scope.Profile = {};
		$scope.ProfilePostList =  [];
		profile.get_profile_header($scope, login.token, $stateParams.profileId);
		profile.get_profile_post_list($scope, login.token, $stateParams.profileId);
	}
	
	$scope.gui_get_avatar_path = function(filename) {
		return typeof filename === 'undefined'|| filename === null ? 'img/avatar.png' : config.nex_server_ip + 'avatar/' + filename;
	}
	
	$scope.gui_get_profile_name = function() {
		if($scope.Profile.fullname !== null) return '('+$scope.Profile.nickname+') ' + $scope.Profile.fullname;		
		
		return $scope.Profile.nickname;
	}
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

.controller('me_MyProfileCtrl', function($scope, $state) {

})
.controller('me_MyPostlistCtrl', function($scope, $state) {

})
.controller('me_MyHistoryCtrl', function($scope, $state) {

})
.controller('me_SettingsCtrl', function($scope, $state) {

})
.controller('me_PolicyCtrl', function($scope, $state) {

})
.controller('me_HelpCtrl', function($scope, $state) {

})
