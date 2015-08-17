angular.module('nexengine.controllers', ['pubnub.angular.service', 'nexengine.services'])
.controller('TabCtrl', function($scope, $window, post, notification) {
	$scope.get_badge_notification = function() {
		return notification.last_notification_id - $window.localStorage['last_notification_id'];
	}
	
	$scope.get_badge_main = function() {
		return 0;
	}
})

/*****************************************************************************
///////////////////////////////// Login View ////////////////////////////////
*****************************************************************************/

.controller('SignInCtrl', function($scope, $state, login) {	
	$scope.isLoginFalse = false;
	
	function init() {
		if(login.checklogin() && login.is_init) {
			$state.go('tab.main');
		} 
	}
	
	$scope.sign_in = function(username, password) {
		login.signinup(username, password, 0, $scope);
		
		$scope.$on('loginevent', function(event, data) { 
			if( data.retcode === 0) {
				$state.go('tab.main');
			} else if( data.retcode === 1){
				$state.go('register_basic_nickname',{userId: data.id});
			} else {
				$scope.isLoginFalse = true;
			}
		});
	};
	
	init();
})

.controller('RegisterBasicNicknameCtrl', function($scope, $state, $stateParams, login, util) { // this will have the upload picture. 
	$scope.register_basic = function(nickname) {
		if(util.is_blank(nickname)) return;
		
		login.register_basic_nickname($stateParams.userId, nickname, function (data) {
			if( data.retcode === 0) {
				$state.go('register_basic_fullname',{userId: $stateParams.userId});
			}
		});
	}
})

.controller('RegisterBasicFullnameCtrl', function($scope, $state, $stateParams, $http, login) { // this will have the upload picture. 
	$scope.userId = $stateParams.userId;
	
	$scope.register_basic = function(fullname) {
		if(typeof fullname == 'undefined' || fullname == null || fullname == '') return;
		
		login.register_basic_fullname(fullname, function (data) {
			if( data.retcode === 0) {
				$state.go('register_basic_avatar',{userId: $stateParams.userId});
			}
		});
	}
})

.controller('RegisterBasicAvatarCtrl', function($scope, $state, $stateParams, $http, $cordovaCamera, $ionicActionSheet, login, config) { // this will have the upload picture. 
	var avatarURI;
	
	function _choose_image(type) {
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
				}, function(err) {
				  // error
					console.log('Error to get picture from device.');
				});
		  }, false);
		} 
	}
	
	$scope.register_basic = function() {
		login.register_basic_avatar(avatarURI, function (data) {
			if( data.retcode === 0) {
				$state.go('tab.main');
			}
		});
	}
	
	$scope.showActionsheet = function(i) {
		$ionicActionSheet.show({
			buttons: [
				{ text: 'Take Photo' },
				{ text: 'Choose From Library' }
			],
			cancelText: 'Cancel',
			cancel: function() {
			},
			buttonClicked: function(index) {
				switch (index) {
					case 0: _choose_image(0); break;
					case 1: _choose_image(1); break;
				} 
				return true;
			}
		});
	};
})

/*****************************************************************************
///////////////////////////////// Tab Main View //////////////////////////////
*****************************************************************************/
.controller('MainCtrl', function($rootScope, $scope, $http, $ionicScrollDelegate, $ionicPopup,  $location, 
			$ionicModal, $state, $cordovaCamera, $cordovaImagePicker, 
			$timeout, $ionicActionSheet, login, main, post, config) {
			
	/***  init function  ***/ 
	$scope.is_show_infinite_scroll = false;
	$scope.message = {};
	$scope.message.Content = '';
	$scope.photos = [];
	$scope.is_radar_change_location = false;
	var photos_file = [];
	var photos_temp = [];
	
	function _show_reset_radar_confirmPopup() {
		if(main.is_noticed_change_location == false && main.check_change_location() && main.current_radar === 0) {
			var confirmPopup = $ionicPopup.confirm({
				title: 'Reset Radar',
				template: 'Location changed detected. Do you want to Reset Radar?'
			});
			confirmPopup.then(function(res) {
				if(res) {
					main.clear_radar();
					main.clear();
					main.init_radar_here(login.token, function(){
						temp = $scope.$on('postlistevent', function() { 
							$scope.is_show_infinite_scroll = true;
							$scope.PostList =  main.list;
							$scope.$apply();
							temp();
						});
					});
				} else {
					main.is_noticed_change_location = true;
				}
			});
		}
	}
	
	
	function init() {
		if(!login.checklogin()) {
			$state.go('signin');
		} else {
			$scope.PostList =  main.list;
			$scope.FavouriteList = main.fav_list;
			$scope.myid = login.my_id;
			$scope.is_radar_change_location = main.is_noticed_change_location;
			
			if(!login.is_init) {
				login.init(function(){
					main.init_radar_here(login.token, function() {											
						var temp = $scope.$on('postlistevent', function() { 
							$scope.is_show_infinite_scroll = true;
							temp();
						});
					});
				});
			} else {
				_show_reset_radar_confirmPopup();
				var temp = $scope.$on('appresume', function() { 
					_show_reset_radar_confirmPopup();
				});
			}
		}
		
		///// define modal pop-up ////// 
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
	
	///// Utility ////
	$scope.getFavouriteIcon = function(fav) {
		if(fav.n === 'Home') {
			return 'ion-home';
		} else if(fav.n === 'School') {
			return 'ion-university';
		} else {
			return 'ion-ios-heart-outline';
		}
	}	

	$scope.getAvatarPath = function(filename) {
		return typeof filename === 'undefined'|| filename === null ? 'img/avatar.png' : config.nex_server_ip + 'avatar/' + filename;
	}
	
	$scope.checkTop = function() {
	}
	
	////////// Left side bar /////////////	
	$scope.clickRadarHere = function() {
		if(main.current_radar != 0) {
			main.clear_radar();
			main.clear();
			if(main.check_change_location()) {
				var confirmPopup = $ionicPopup.confirm({
					title: 'Reset Radar',
					template: 'Location changed detected. Do you want to Reset Radar?'
				});
				confirmPopup.then(function(res) {
					if(res) { // chose to init new location
						main.init_radar_here(login.token, function(){
							temp = $scope.$on('postlistevent', function() { 
								$scope.is_show_infinite_scroll = true;
								$scope.PostList =  main.list;
								$scope.$apply();
								temp();
							});
						});
					} else { // chose to init old location 
						main.is_noticed_change_location = true;
						main.init_radar_here(login.token, function(){
							temp = $scope.$on('postlistevent', function() { 
								$scope.is_show_infinite_scroll = true;
								$scope.PostList =  main.list;
								$scope.$apply();
								temp();
							});
						}, false);
					}
				});
			} else { // still in the old location
				main.init_radar_here(login.token, function(){
					temp = $scope.$on('postlistevent', function() { 
						$scope.is_show_infinite_scroll = true;
						$scope.PostList =  main.list;
						$scope.$apply();
						temp();
					});
				}, false);			
			}
		} else { // refresh radar here due to change location
			if(main.is_noticed_change_location) {
				main.clear_radar();
				main.clear();
				main.init_radar_here(login.token, function(){
					temp = $scope.$on('postlistevent', function() { 
						$scope.is_show_infinite_scroll = true;
						$scope.PostList =  main.list;
						$scope.$apply();
						temp();
					});
				});			
			} else {
				console.log("nothing to refresh");
			}
		}
		main.current_radar = 0;
	}

	$scope.clickRadarFavourite = function(id) {
		main.clear_radar();
		main.clear();
		
		main.init_radar_fovourite(login.token, id, function(){
			temp = $scope.$on('postlistevent', function() { 
				$scope.is_show_infinite_scroll = true;
				$scope.PostList =  main.list;
				$scope.$apply();
				temp();
			});
		});
		main.current_radar = 1;
	}
	
	///////////////// Favourite Modal ////////////
	$scope.openAddFavouriteModal = function() {
		$scope.add_favourite_modal.show();
	}
	
	$scope.closeAddFavouriteModal = function() {
		$scope.add_favourite_modal.hide();
	};
	
	$scope.create_radar_favourite = function(name) {
		main.create_radar_favourite(name, login.token, function(data) {
			main.fav_list.push(data.fav);
			$scope.add_favourite_modal.hide();
		});
	}
		
	/////////////// Create Post Modal ////////////////
	function _take_photo() {
		if(config.is_device) {
			document.addEventListener('deviceready', function () {
				var options = {
				  quality: 100,
				  destinationType: Camera.DestinationType.FILE_URI,
				  sourceType: Camera.PictureSourceType.CAMERA,
				  allowEdit: true,
				  encodingType: Camera.EncodingType.JPEG,
				  targetWidth: 800,
				  popoverOptions: CameraPopoverOptions,
				  saveToPhotoAlbum: false
				};

				$cordovaCamera.getPicture(options).then(function(imageURI) {
					var tmp = {'img': imageURI};
					$scope.photos.push(tmp);
				}, function(err) {
				  // error
					console.log('Error to take picture from camera.');
				});
		  }, false);
		} 
	}
		
	function _get_photos() {
		var options = {
			maximumImagesCount: 5,
			width: 800,
			quality: 100
		};

		$cordovaImagePicker.getPictures(options)
		.then(function (results) {
			for (var i = 0; i < results.length; i++) {
				var tmp = {'img': results[i]};
				$scope.photos.push(tmp);
			}
		}, function(error) {
			// error getting photos
			console.log('Error to get picture from device.');
		});
	}
	function _show_photos_actionSheet() {
		$ionicActionSheet.show({
			buttons: [
				{ text: 'Take Photo' },
				{ text: 'Choose From Library' }
			],
			cancelText: 'Cancel',
			cancel: function() {
			},
			buttonClicked: function(index) {
				switch (index) {
					case 0: _take_photo(); break;
					case 1: _get_photos(); break;
				} 
				return true;
			}
		});
	}
	
	$scope.showPhotosActionSheet = function() {
		_show_photos_actionSheet();
	}
	
	$scope.openCreatePostModal = function(title, type) {
		$scope.pop_up_name = title;
		$scope.type = type;
		$scope.create_post_modal.show();
		
		if(title === 'Upload Photos Gallery') { // this is default will be upload photos.
			_show_photos_actionSheet();
		}
	}
		
	$scope.closeCreatePostModal = function() {
		// v-comment: clean up before close. have to check 
		$scope.create_post_modal.hide();
	};
	
	$scope.deleteItem = function(index) {
		$timeout( function() {
			$scope.photos.splice(index,1);
		}, 300);
	}
	
	/////////// create_post ////////////
	var _is_post_progressing = false;
	function _create_post(message) {
		if (photos_temp.length == 0) {
			post.create_post(message, login.token, main.current_channels[0], $scope.type, photos_file, function(data) {
				// // v-comment: remove waiting icon... clean up before close. 
				$scope.message.Content = "";
				$scope.photos = [];
				$scope.create_post_modal.hide();
				photos_file = [];
				photos_temp = [];
				
				NProgress.done();
				_is_post_progressing = false;
			});
		} else {
			var photo = photos_temp.pop();
			post.upload_post_photo(photo, login.token, function(data) {
				// upload a photo success.
				photos_file.push(data.file);
				_create_post(message);
			});
		}
	}
	
	$scope.create_post = function(message) {
		// v-comment: put-up waiting icon... 
		if(_is_post_progressing){
			return;
		}		
		_is_post_progressing = true;
		
		for( var i = 0; i < $scope.photos.length; i++ ) {
			photos_temp.push($scope.photos[i].img); 
		}
		
		NProgress.start();
		
		
		_create_post(message);
	}
	
	////////////// Interactive Function ////////////////
	$scope.clickLike = function(myitem) {
		if(!myitem.i.my_l)
		post.create_post_like(myitem.id, login.token, function(data) {
			myitem.i.l += 1;
			myitem.i.my_l = true;
			//$scope.$apply();
		});
	};
	
	$scope.clickComment = function(myitem) { // actually go to detail page
		$state.go('tab.m_detail', {detailId: myitem.id});
	};

	
	$scope.clickRelay = function(myitem) {
		if(!myitem.i.my_r)
		post.create_post_relay(myitem.id, login.token, main.current_channels[0],function(data) {
			myitem.i.r += 1;
			myitem.i.my_r = true;
			//$scope.$apply();
		});
	};
	
	////////////// Infinity Load ///////////
	$scope.load_more_post = function() {
		main.load_more_post(login.token, function(is_more){
			if(!is_more)
				$scope.is_show_infinite_scroll = false;
			$scope.$broadcast('scroll.infiniteScrollComplete');
		});
	};
	
	init();
})


/*****************************************************************************
/////////////////////////////// Tab Notify View //////////////////////////////
*****************************************************************************/
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
	
	function init() {
		if(!login.checklogin()) {
			$state.go('signin');
		} else {
			$scope.list =  notification.list;
			notification.update_last_notification_id();
		}
	}
	
	$scope.getAvatarPath = function(filename) {
		return typeof filename === 'undefined'|| filename === null ? 'img/avatar.png' : config.nex_server_ip + 'avatar/' + filename;
	}
	
	init();	
})

/*****************************************************************************
/////////////////////////////////// Tab Me View //////////////////////////////
*****************************************************************************/
.controller('MeCtrl', function($scope, $state, $stateParams, me, login) {  
	function init() {
		if(!login.checklogin()) {
			$state.go('signin');
		}
	}
	
	$scope.logout = function() {
		login.logout();
		$state.go('signin');
	};  
	
	init();
})
.controller('me_MyProfileCtrl', function($scope, $state) {

})
.controller('me_MyPostlistCtrl', function($scope, $state, $ionicActionSheet, me, post, login, config) {
	$scope.PostList;
	$scope.is_show_infinite_scroll = false;
	$scope.tab = 'me';
	$scope.myid = login.my_id;
	
	function init() {
		$scope.PostList =  me.list;		
		if(!me.is_init) {
			$scope.is_show_infinite_scroll = true;
		} else {
			if(me.benchmark_id > 0) {
				$scope.is_show_infinite_scroll = true;
			} else {
				$scope.is_show_infinite_scroll = false;
			}
		}		
	}
	
	$scope.load_more_post = function() {
		me.get_my_post_list(login.token, function(is_more) {
			if(is_more) {
				$scope.is_show_infinite_scroll = true;
			} else {
				$scope.is_show_infinite_scroll = false;
			}
			
			$scope.$broadcast('scroll.infiniteScrollComplete');
		});
	}
	
	$scope.showActionsheet = function(i) {
    
		$ionicActionSheet.show({
		  destructiveText: 'Delete',
		  cancelText: 'Cancel',
		  cancel: function() {
		  },
		  destructiveButtonClicked: function() {
			return true;
		  }
		});
	};
	///////////////////////////////////
    
	$scope.clickComment = function(myitem) { // actually go to detail page
		$state.go('tab.me_detail', {detailId: myitem.id});
	};
	
	$scope.clickLike = function(myitem) {
		if(!myitem.i.my_l)
		post.create_post_like(myitem.id, login.token, function(data) {
			myitem.i.l += 1;
			myitem.i.my_l = true;
			//$scope.$apply();
		});
	};
	
	init();
})
.controller('me_MyHistoryCtrl', function($scope, $state) {

})

.controller('me_SettingsCtrl', function($scope, $state, $ionicActionSheet, $cordovaCamera, me, login, config) {
	$scope.Profile = {nickname : ''};
	$scope.is_change_update = false;
	function init() {
		me.get_my_profile_header(login.token, function(result) {
			$scope.Profile.nickname = me.Profile.nickname;
			$scope.Profile.fullname = me.Profile.fullname;
			$scope.Profile.avatar = me.Profile.avatar;				
		});
	}
		
	$scope.check_change = function() {
		if($scope.Profile.nickname != me.Profile.nickname || $scope.Profile.fullname != me.Profile.fullname) {
			$scope.is_change_update = true;
		} else {
			$scope.is_change_update = false;
		}
	}
	
	$scope.getAvatarPath = function(filename) {
		return typeof filename === 'undefined'|| filename === null ? 'img/avatar.png' : config.nex_server_ip + 'avatar/' + filename;
	}
	
	function _choose_image(type) {
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
				  // upload immediately - call 
					login.register_basic_avatar(imageURI, function (data) {	
					});
				}, function(err) {
				  // error
					console.log('Error to get picture from device.');
				});
		  }, false);
		} 
	}
	
	$scope.showActionsheet = function(i) {
		$ionicActionSheet.show({
			buttons: [
				{ text: 'Take Photo' },
				{ text: 'Choose From Library' }
			],
			cancelText: 'Cancel',
			cancel: function() {
			},
			buttonClicked: function(index) {
				switch (index) {
					case 0: _choose_image(0); break;
					case 1: _choose_image(1); break;
				} 
				return true;
			}
		});
	};
	
	$scope.update_profile_basic = function() {
		if($scope.Profile.nickname != me.Profile.nickname) {
			login.change_my_basic_nickname(login.token, $scope.Profile.nickname, function(data) {
				if ($scope.Profile.fullname != me.Profile.fullname) {
					login.change_my_basic_fullname(login.token, $scope.Profile.fullname, function(data) {
						//console.log("update_profile_basic finish change_my_basic_nickname");
						$scope.is_change_update = false;
					}); 
				} else {
					//console.log("update_profile_basic finish change_my_basic_fullname");
					$scope.is_change_update = false;
				}
			});
		} else if ($scope.Profile.fullname != me.Profile.fullname) {
			login.change_my_basic_fullname(login.token, $scope.Profile.fullname, function(data) {
				//console.log("update_profile_basic finish change_my_basic_nickname");
				$scope.is_change_update = false;
			}); 
		} else {
			//console.log("update_profile_basic finish change_my_basic_fullname");
			$scope.is_change_update = false;
		}
	}
	
	init();
})
.controller('me_SettingsChangepasswordCtrl', function($scope, $state, $window, me, login) {
	$scope.is_change_update = false;
	$scope.Password = {old_password : '', new_password : '', new_password_again : ''};
	$scope.check_change = function() {
		if($scope.Password.old_password !== '') {
			if($scope.Password.new_password !== '' && $scope.Password.new_password == $scope.Password.new_password_again) {
				$scope.is_change_update = true
			} else {
				$scope.is_change_update = false;
			}
		} else {
			$scope.is_change_update = false;
		}
	}
	
	$scope.change_my_password = function() {
		login.change_my_password(login.token, $scope.Password.old_password, $scope.Password.new_password, function(data) {
			$scope.Password = {old_password : '', new_password : '', new_password_again : ''};
		});
	}
})
.controller('me_PolicyCtrl', function($scope, $state) {

})
.controller('me_HelpCtrl', function($scope, $state) {

})


/*****************************************************************************
/////////////////////////////////// Detail Controller ////////////////////////
*****************************************************************************/

.controller('DetailCtrl', function($scope, $state, $stateParams, $http, $ionicModal, config, login, main, post) {
	$scope.tab = 'main'; // tab "main" = 0 -- use for navigation purpose
	$scope.current_comment_detail;
	function isMyPost(ownerid) {
		if(ownerid == login.my_id) return true;
		return false;
	}

	function init() {
		if(!login.checklogin()) {
			$state.go('signin');
		} else {
			$scope.myid = login.my_id;
			post.get_post_detail($stateParams.detailId, login.token, function(myitem, comments) {
				$scope.myitem = myitem;
				$scope.comments = comments;
			});
			
			///// define modal pop-up ////// 
			$ionicModal.fromTemplateUrl('comment-detail.html', {
				scope: $scope,
				animation: 'slide-in-right'
			}).then(function(modal) {
				$scope.comment_detail_modal = modal;
			});
			
			if($state.$current.name === 'tab.m_detail') {
				$scope.tab = 'main';
			} else if($state.$current.name === 'tab.n_detail') {
				$scope.tab = 'notify';
			} else if($state.$current.name === 'tab.me_detail') {
				$scope.tab = 'me';
			}
		}
	}
	
	$scope.getAvatarPath = function(filename) {
		return typeof filename === 'undefined'|| filename === null ? 'img/avatar.png' : config.nex_server_ip + 'avatar/' + filename;
	}
	
	$scope.getPhotosPath = function(owner_id, filename) {
		return config.nex_server_ip + owner_id + '/' + filename;
	}
	
	$scope.getHeaderTitle = function() {
		if($scope.myitem.type === 1) return "Answer detail";
		return "Post detail";
	}
	
	//////// Interactive /////////////
	$scope.clickLike = function(myitem) {
		if(!myitem.i.my_l)
		post.create_post_like(myitem.id, login.token, function(data) {
			myitem.i.l += 1;
			myitem.i.my_l = true;
		});
	};
	
	$scope.clickRelay = function(myitem) {
		if(!myitem.i.my_r)
		post.create_post_relay(myitem.id,  login.token, main.current_channels[0], function(data) {
			myitem.i.r += 1;
			myitem.i.my_r = true;
		});
	};
	
	$scope.clickComment = function(id) {

	};
	
	$scope.submitComment = function(comment) { // this is to submit comment
		if($scope.myitem.type === 0) {
			post.create_post_comment($stateParams.detailId, comment, login.token, function(data) {
				if(data.retcode === 0) {
					var temp = data.content;
					$scope.comments.unshift(temp);
					comment.Content = '';
				}
			})
		} else { // $scope.myitem.type === 1
			post.create_question_answer($stateParams.detailId, comment, login.token, function(data) {
				if(data.retcode === 0) {
					var temp = data.content;
					$scope.comments.unshift(temp);
					comment.Content = '';
				}
			})		
		}

	};
	
	//////////////////////////////////
	$scope.openCommentDetailModal = function(comment) {
		$scope.current_comment_detail = comment;
		$scope.comment_detail_modal.show();
	}
	
	$scope.closeCommentDetailModal = function() {
		$scope.comment_detail_modal.hide();
	}
	
	$scope.gotoProfile = function(id) {
		if($state.$current.name === 'tab.m_detail') {
			$state.go('tab.m_profile',{profileId: id});
		} else if($state.$current.name === 'tab.n_detail') {
			$state.go('tab.n_profile',{profileId: id});
		} else if($state.$current.name === 'tab.me_detail') {
			$state.go('tab.me_profile',{profileId: id});
		}
	}
	
	init();
})

/*****************************************************************************
/////////////////////////////////// Profile Controller ///////////////////////
*****************************************************************************/


.controller('ProfileCtrl', function($scope, $state, $stateParams, login, profile, config) {
	var benchmark_id = 0;
	$scope.is_show_infinite_scroll = false;
	
	if(!login.checklogin()) {
		$state.go('signin');
	} else {
		$scope.Profile = {};
		$scope.Profile.nickname = "";
		$scope.Profile.fullname = "";
		$scope.ProfilePostList =  [];
		
		if($state.$current.name === 'tab.m_profile') {
			$scope.tab = 'main';
		} else if($state.$current.name === 'tab.n_profile') {
			$scope.tab = 'notify';
		} else if($state.$current.name === 'tab.me_profile') {
			$scope.tab = 'me';
		}
		
		profile.get_profile_header(login.token, $stateParams.profileId, function(data) {			
			if(data.retcode === 0) {
				$scope.Profile = data.profile;
			}
		});
		profile.get_profile_post_list(login.token, $stateParams.profileId, benchmark_id, function(data) {
			if(data.retcode === 0) {
				for (var i in data.post_list) {
					$scope.ProfilePostList.unshift(data.post_list[i]);			  
				}
				
				if(data.post_list.length < 3) {
					benchmark_id = -1;
					$scope.is_show_infinite_scroll = false;
				} else {				
					benchmark_id = data.post_list[data.post_list.length - 1].id;
					$scope.is_show_infinite_scroll = true;
				}
			}
		});
	}
	
	$scope.getAvatarPath = function(filename) {
		return typeof filename === 'undefined'|| filename === null ? 'img/avatar.png' : config.nex_server_ip + 'avatar/' + filename;
	}
	
	$scope.getProfileName = function() {
		if($scope.Profile.fullname !== null) return '('+$scope.Profile.nickname+') ' + $scope.Profile.fullname;		
		
		return $scope.Profile.nickname;
	}
	
	$scope.load_more_post = function() {
		profile.get_profile_post_list(login.token, $stateParams.profileId, benchmark_id, function(data) {
			if(data.retcode === 0) {
				for (var i in data.post_list) {
					$scope.ProfilePostList.unshift(data.post_list[i]);			  
				}
				
				if(data.post_list.length < 3) {
					benchmark_id = -1;
					$scope.is_show_infinite_scroll = false;
					$scope.$broadcast('scroll.infiniteScrollComplete');
				} else {				
					benchmark_id = data.post_list[data.post_list.length - 1].id;
					$scope.is_show_infinite_scroll = true;
					$scope.$broadcast('scroll.infiniteScrollComplete');
				}
			}
		});
	}
})
