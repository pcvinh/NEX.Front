angular.module('NEX', ['ionic','ngCordova', 'pubnub.angular.service', 'nexengine.controllers', 'nexengine.services', 'nexengine.directives'])
.run(function($ionicPlatform, PubNub, $state, login) {
	$ionicPlatform.ready(function() {
		// Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
		// for form inputs)
		if(window.cordova && window.cordova.plugins.Keyboard) {
		  cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
		}
		if(window.StatusBar) {
		  StatusBar.styleDefault();
		}
	});
	
	PubNub.init({
		ssl           : true,
		//publish_key   : "pub-c-7b8f064f-cc65-4656-8d63-d6760bb6e0fe",
		subscribe_key : "sub-c-abe025b6-b042-11e4-85c1-02ee2ddab7fe"
	});
	
	if(login.checklogin()) {
		$state.go('tab.main');
	} else {
		$state.go('signin');
	}
})
.config(function($stateProvider, $urlRouterProvider) {
  $stateProvider
    .state('signin', {
      url: '/sign-in',
      templateUrl: 'templates/1.sign-in.html',
      controller: 'SignInCtrl'
    })
	.state('register_basic_nickname', {
      url: '/register_basic_nickname/:userId',
      templateUrl: 'templates/1.1.register.basic.nickname.html',
      controller: 'RegisterBasicNicknameCtrl'
    })
	.state('register_basic_fullname', {
      url: '/register_basic_fullname/:userId',
      templateUrl: 'templates/1.1.register.basic.fullname.html',
      controller: 'RegisterBasicFullnameCtrl'
    })
	.state('register_basic_avatar', {
      url: '/register_basic_avatar/:userId',
      templateUrl: 'templates/1.1.register.basic.avatar.html',
      controller: 'RegisterBasicAvatarCtrl'
    })
	
    /*********** tabs **********/
    .state('tab', {
      url: "/tab",
      abstract: true,
      templateUrl: "templates/0.tabs.html",
	  controller: 'TabCtrl'
    })

	////////// Tab Main //////////
	.state('tab.main', {
		url: '/main',
		views: {
			'tab-main': {
			  templateUrl: 'templates/2.main.html',
			  controller: 'MainCtrl'
			}
		}
	})
	.state('tab.m_detail', {
		url: '/main/detail/:detailId',
		views: {
		'tab-main': {
			templateUrl: 'templates/5.detail.html',
			controller: 'DetailCtrl'
			}
		}
	})
	.state('tab.m_profile', {
		url: '/main/profile/:profileId',
		views: {
		'tab-main': {
			templateUrl: 'templates/6.profile.html',
			controller: 'ProfileCtrl'
			}
		}
	})
	
	///////// Tab Notify /////////
	.state('tab.notify', {
		url: '/notify',
		views: {
			'tab-notify': {
			  templateUrl: 'templates/3.notify.html',
			  controller: 'NotifyCtrl'
			}
		}
	})
	.state('tab.n_detail', {
		url: '/notify/detail/:detailId',
		views: {
		'tab-notify': {
			templateUrl: 'templates/5.detail.html',
			controller: 'DetailCtrl'
			}
		}
	})
	.state('tab.n_profile', {
		url: '/notify/profile/:profileId',
		views: {
		'tab-notify': {
			templateUrl: 'templates/6.profile.html',
			controller: 'ProfileCtrl'
			}
		}
	})
	
	///////// Tab Me ////////
	.state('tab.me', {
		url: '/me',
		views: {
			'tab-me': {
			  templateUrl: 'templates/4.me.html',
			  controller: 'MeCtrl'
			}
		}
	})
	/*.state('tab.me_my_profile', {
		url: '/me/myprofile',
		views: {
		'tab-me': {
			templateUrl: 'templates/4.1.profile.html',
			controller: 'me_MyProfileCtrl'
			}
		}
	})*/
	.state('tab.me_my_postlist', {
		url: '/me/postlist',
		views: {
		'tab-me': {
			templateUrl: 'templates/4.2.postlist.html',
			controller: 'me_MyPostlistCtrl'
			}
		}
	})	
	.state('tab.me_my_history', {
		url: '/me/history',
		views: {
		'tab-me': {
			templateUrl: 'templates/4.3.history.html',
			controller: 'me_MyHistoryCtrl'
			}
		}
	})
	.state('tab.me_detail', {
		url: '/me/detail/:detailId',
		views: {
		'tab-me': {
			templateUrl: 'templates/5.detail.html',
			controller: 'DetailCtrl'
			}
		}
	})
	.state('tab.me_profile', {
		url: '/me/profile/:profileId',
		views: {
		'tab-me': {
			templateUrl: 'templates/6.profile.html',
			controller: 'ProfileCtrl'
			}
		}
	})
	
	//------------ Tab Me Others ----------//
	.state('tab.me_settings', {
		url: '/me/settings',
		views: {
		'tab-me': {
			templateUrl: 'templates/4.4.settings.html',
			controller: 'me_SettingsCtrl'
			}
		}
	})
	.state('tab.me_settings_changepassword', {
		url: '/me/settings/changepassword',
		views: {
		'tab-me': {
			templateUrl: 'templates/4.4.1.settings.changepassword.html',
			controller: 'me_SettingsChangepasswordCtrl'
			}
		}
	})
	.state('tab.me_policy', {
		url: '/me/policy',
		views: {
		'tab-me': {
			templateUrl: 'templates/4.5.policy.html',
			controller: 'me_PolicyCtrl'
			}
		}
	})
	.state('tab.me_help', {
		url: '/me/help',
		views: {
		'tab-me': {
			templateUrl: 'templates/4.6.help.html',
			controller: 'me_HelpCtrl'
			}
		}
	})

  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/tab/main');

});