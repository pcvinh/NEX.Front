// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
angular.module('NEX', ['ionic','ngCordova', 'pubnub.angular.service', 'nexengine.controllers', 'nexengine.services', 'nexengine.directives'])
.run(function($ionicPlatform, PubNub, $state, config, login, main, notification) {
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
		// init 
		login.init(function() {
			$state.go('tab.main');
		});
		
	} else {
		$state.go('signin');
	}

})
.config(function($stateProvider, $urlRouterProvider) {

  // Ionic uses AngularUI Router which uses the concept of states
  // Learn more here: https://github.com/angular-ui/ui-router
  // Set up the various states which the app can be in.
  // Each state's controller can be found in controllers.js
  $stateProvider

    .state('signin', {
      url: '/sign-in',
      templateUrl: 'templates/0.sign-in.html',
      controller: 'SignInCtrl'
    })
	.state('register_basic_nickname', {
      url: '/register_basic_nickname/:userId',
      templateUrl: 'templates/0.1.register.basic.nickname.html',
      controller: 'RegisterBasicNicknameCtrl'
    })
	.state('register_basic_fullname', {
      url: '/register_basic_fullname',
      templateUrl: 'templates/0.1.register.basic.fullname.html',
      controller: 'RegisterBasicFullnameCtrl'
    })
	.state('register_basic_avatar', {
      url: '/register_basic_avatar',
      templateUrl: 'templates/0.1.register.basic.avatar.html',
      controller: 'RegisterBasicAvatarCtrl'
    })
	
    // setup an abstract state for the tabs directive
    .state('tab', {
      url: "/tab",
      abstract: true,
      templateUrl: "templates/__tabs.html"
    })

	////////// Main //////////
	.state('tab.main', {
		url: '/main',
		views: {
			'tab-main': {
			  templateUrl: 'templates/1.main.html',
			  controller: 'MainCtrl'
			}
		}
	})
	.state('tab.m_detail', {
		url: '/main/detail/:detailId',
		views: {
		'tab-main': {
			templateUrl: 'templates/4.detail.html',
			controller: 'm_DetailCtrl'
			}
		}
	})
	.state('tab.m_comment', {
		url: '/main/comment/:commentId',
		views: {
		'tab-main': {
			templateUrl: 'templates/4.1.comment.html',
			controller: 'm_CommentCtrl'
			}
		}
	})
	.state('tab.m_chatroom', {
		url: '/main/chatroom/:chatroomId',
		views: {
		'tab-main': {
			templateUrl: 'templates/_5.chatroom.html',
			controller: 'm_ChatroomCtrl'
			}
		}
	})
	.state('tab.m_profile', {
		url: '/main/profile/:profileId',
		views: {
		'tab-main': {
			templateUrl: 'templates/6.profile.html',
			controller: 'm_ProfileCtrl'
			}
		}
	})
	///////// Notify /////////
	.state('tab.notify', {
		url: '/notify',
		views: {
			'tab-notify': {
			  templateUrl: 'templates/2.notify.html',
			  controller: 'NotifyCtrl'
			}
		}
	})
	.state('tab.n_detail', {
		url: '/notify/detail/:detailId',
		views: {
		'tab-notify': {
			templateUrl: 'templates/4.detail.html',
			controller: 'n_DetailCtrl'
			}
		}
	})
	.state('tab.n_comment', {
		url: '/notify/comment/:commentId',
		views: {
		'tab-notify': {
			templateUrl: 'templates/4.1.comment.html',
			controller: 'n_CommentCtrl'
			}
		}
	})
	.state('tab.n_chatroom', {
		url: '/notify/chatroom/:chatroomId',
		views: {
		'tab-notify': {
			templateUrl: 'templates/_5.chatroom.html',
			controller: 'n_ChatroomCtrl'
			}
		}
	})
	.state('tab.n_profile', {
		url: '/notify/profile/:profileId',
		views: {
		'tab-notify': {
			templateUrl: 'templates/6.profile.html',
			controller: 'n_ProfileCtrl'
			}
		}
	})
	///////// Me ////////
	.state('tab.me', {
		url: '/me',
		views: {
			'tab-me': {
			  templateUrl: 'templates/3.me.html',
			  controller: 'MeCtrl'
			}
		}
	})
	.state('tab.me_detail', {
		url: '/me/detail/:detailId',
		views: {
		'tab-me': {
			templateUrl: 'templates/4.detail.html',
			controller: 'me_DetailCtrl'
			}
		}
	})
	.state('tab.me_comment', {
		url: '/me/comment/:commentId',
		views: {
		'tab-me': {
			templateUrl: 'templates/4.1.comment.html',
			controller: 'me_CommentCtrl'
			}
		}
	})
	.state('tab.me_chatroom', {
		url: '/me/chatroom/:chatroomId',
		views: {
		'tab-me': {
			templateUrl: 'templates/_5.chatroom.html',
			controller: 'me_ChatroomCtrl'
			}
		}
	})
	.state('tab.me_profile', {
		url: '/me/profile/:profileId',
		views: {
		'tab-me': {
			templateUrl: 'templates/6.profile.html',
			controller: 'me_ProfileCtrl'
			}
		}
	})
	//////////////////////
	.state('tab.me_my_profile', {
		url: '/me/myprofile',
		views: {
		'tab-me': {
			templateUrl: 'templates/3.1.profile.html',
			controller: 'me_MyProfileCtrl'
			}
		}
	})
	.state('tab.me_my_postlist', {
		url: '/me/postlist',
		views: {
		'tab-me': {
			templateUrl: 'templates/3.2.postlist.html',
			controller: 'me_MyPostlistCtrl'
			}
		}
	})
	.state('tab.me_my_history', {
		url: '/me/history',
		views: {
		'tab-me': {
			templateUrl: 'templates/3.3.history.html',
			controller: 'me_MyHistoryCtrl'
			}
		}
	})
	.state('tab.me_settings', {
		url: '/me/settings',
		views: {
		'tab-me': {
			templateUrl: 'templates/3.4.settings.html',
			controller: 'me_SettingsCtrl'
			}
		}
	})
	.state('tab.me_policy', {
		url: '/me/policy',
		views: {
		'tab-me': {
			templateUrl: 'templates/3.5.policy.html',
			controller: 'me_PolicyCtrl'
			}
		}
	})
	.state('tab.me_help', {
		url: '/me/help',
		views: {
		'tab-me': {
			templateUrl: 'templates/3.6.help.html',
			controller: 'me_HelpCtrl'
			}
		}
	})

  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/tab/main');

});