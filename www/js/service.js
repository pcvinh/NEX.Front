angular.module('nexengine.services', ['pubnub.angular.service'])
.service('config', function(){
	this.is_localhost = false;
	this.is_device = true;
	this.nex_server_ip = (this.is_localhost == false) ? 'http://107.167.183.96:5000/' : 'http://127.0.0.1:5000/';
	this.nex_api = {}; // backend API for NEX
	this.nex_current = {};// will be store in local storage if app suddenly exit.
	
	this.is_debug = {
		'service_post' : true,		
		'service_profile' :  false,
		'service_login' :  false,
		'service_main' :  false,
		'service_notification' :  false,
		'service_me' :  false
	}
})
.service('vlog', function(config){
	this.log = function(msg, module) {
		if(config.is_debug[module]) console.log('[INFO]' + msg);
	}
	
	this.debug = function(msg, module) {
		console.log('[DEBUG]' + msg);
	}
	
	this.error = function(err) {
		console.log('[ERROR]' + err);
	}
})
.service('post', function($rootScope, $http, config, vlog){
	this.get_latest_post_list = function(channels, page, callback) {
		var list_channels = '';
		var i = 0;
		while (i < channels.length) {
			list_channels+='&channels[]='+channels[i];
			i++;
		}
		var url = config.nex_server_ip+'get_post_list?callback=JSON_CALLBACK' + list_channels + '&page=' + page;
		var request = $http.jsonp(url);		
		request.success(function(data) {
			vlog.log('SUCCESS get_latest_post_list return: ' + JSON.stringify(data), 'service_post');
			callback(data.posts);
		});
	}
		
	this.createPost = function(message, token, current_channel, post_type, callback) {
		var url;		
		if(post_type === 1) {
			url = (!config.is_device) ? '/create_post_question' : config.nex_server_ip + 'create_post_question';
		} else {
			url = (!config.is_device) ? '/create_post' : config.nex_server_ip + 'create_post';
		}
		
		$http({
			method  : 'POST',
			url     : url,
			transformRequest: function(obj) {
				var str = [];
				for(var p in obj)
				str.push(encodeURIComponent(p) + '=' + encodeURIComponent(obj[p]));
				return str.join('&');
			},
			data    : { Channels: current_channel, Title : message.Title, Content: message.Content, Token: token},  // pass in data as strings	
			headers : { 'Content-Type': 'application/x-www-form-urlencoded' }
			}).success(function(data) {
				vlog.log('SUCCESS createPost return: ' + JSON.stringify(data), 'service_post');
				callback(data);
			});
	}
	
	this.createPostLike = function(id, token, callback) {
		var url = (!config.is_device) ? '/create_post_like' : config.nex_server_ip + 'create_post_like';
		$http({
		method  : 'POST',
		url     : url,
		transformRequest: function(obj) {
			var str = [];
			for(var p in obj)
			str.push(encodeURIComponent(p) + '=' + encodeURIComponent(obj[p]));
			return str.join('&');
		},
		data    : { id: id, Token: token},  // pass in data as strings	
		headers : { 'Content-Type': 'application/x-www-form-urlencoded' }
		}).success(function(data) {
			vlog.log('SUCCESS createPostLike return: ' + JSON.stringify(data), 'service_post');
			callback(data);
		});
	}
	
	this.createPostRelay = function(id, token, current_channel, callback) {
		var url = (!config.is_device) ? '/create_post_relay' : config.nex_server_ip + 'create_post_relay';
		$http({
		method  : 'POST',
		url     : url,
		transformRequest: function(obj) {
			var str = [];
			for(var p in obj)
			str.push(encodeURIComponent(p) + '=' + encodeURIComponent(obj[p]));
			return str.join('&');
		},
		data    : { channel: current_channel, id: id, Token: token},  // pass in data as strings	
		headers : { 'Content-Type': 'application/x-www-form-urlencoded' }
		}).success(function(data) {
			vlog.log('SUCCESS createPostRelay return: ' + JSON.stringify(data), 'service_post');
			callback(data);
		});
	}
	
	this.createPostComment = function(id, comment, token, callback) {
		var url = (!config.is_device) ? '/create_post_comment' : config.nex_server_ip + 'create_post_comment';		
		$http({
		method  : 'POST',
		url     : url,
		transformRequest: function(obj) {
			var str = [];
			for(var p in obj)
			str.push(encodeURIComponent(p) + '=' + encodeURIComponent(obj[p]));
			return str.join('&');
		},
		data    : { id: id, Token: token, content : comment.Content},  // pass in data as strings	
		headers : { 'Content-Type': 'application/x-www-form-urlencoded' }
		}).success(function(data){
			vlog.log('SUCCESS createPostComment return: ' + JSON.stringify(data), 'service_post');
			callback(data);
		});
	}
	
	this.init_post_detail = function(id, token, $scope) {
		var url = config.nex_server_ip+'get_post_detail?callback=JSON_CALLBACK&id='+ id +'&token='+ token;
		var request = $http.jsonp(url);		
		request.success(function(data) {
			if(data.retcode === 0) {
				$scope.myitem = data.post_detail;
				$scope.title = $scope.myitem.type === 1 ? "Answer Detail" : "Post Detail";
				url = config.nex_server_ip+'get_post_comment_list?callback=JSON_CALLBACK&id='+ id +'&token='+ token;
				request = $http.jsonp(url);	
				request.success(function(data1) {
					if(data1.retcode === 0) {
						vlog.log('SUCCESS init_post_detail return: ' + JSON.stringify(data1), 'service_post');
						
						$scope.comments = data1.comments;
					}
				});
			}
		});
	}
})
/*********Signin/Signup/Init*********
1. Global variable
- token
- is_init
2. Services -> API ?
- signinup(username, password)	-> signinup: to signin/up with 
- init		-> init	 
3. Services = processing ?
- check login: to check localStorage if token already exist.
**************************************/
.service('login', function($rootScope, $http, $window, $cordovaFileTransfer, $cordovaGeolocation, config, main, notification){
	var self = this;
	var key = 'nex_token';
	self.token = null;
	self.is_init = false;
	
	/***  private functions ***/ 
	function _serialize(obj) {
		var str = [];
		for(var p in obj){
			if (Array.isArray( obj[p])) {
				for(var i in obj[p])
					str.push(encodeURIComponent(p) + '[]=' + encodeURIComponent(obj[p][i]));
			} else {
				str.push(encodeURIComponent(p) + '=' + encodeURIComponent(obj[p]));
			}
		}
		return str.join('&');
	}
	
	this.checklogin = function() {
		var _token = $window.localStorage[key];
		if(typeof _token != 'undefined' && _token != null){		
			self.token = _token;
			return true;
		} else {
			return false;
		}
	}
	
	this.signinup = function(username, password, uuid, $scope){
		var url = config.nex_server_ip+'signinup?callback=JSON_CALLBACK&email='+username+'&password='+password+'&uuid='+uuid;
		var request = $http.jsonp(url);		
		request.success(function(data) {
			if(data.retcode === 0) {
				$window.localStorage[key] = data.token;
				self.token = data.token;
				$scope.$emit('loginevent', data);
			} else {
				$scope.$emit('loginevent', data);
			}
		});
	}
	
	/*this.register_basic = function(id, avatarURI, nickname, callback){ // upload image		
		if(config.is_localhost || typeof avatarURI == 'undefined') {
			var url = (!config.is_device) ? '/signup_basic' : config.nex_server_ip + 'signup_basic';
			$http({
			  method  : 'POST',
			  url     : url,
			  data    : _serialize({ id: id, nickname : nickname}),  // pass in data as strings	
			  headers : { 'Content-Type': 'application/x-www-form-urlencoded' }
			 }).success(function(data) {
				if(data.retcode === 0) {
					$window.localStorage[key] = data.token;
					self.token = data.token;
					callback(data);
				}
			});
		} else {
			var options = {};
			//var url_avatar = (config.is_localhost) ? '/signup_basic_avatar_upload' : config.nex_server_ip + 'signup_basic_avatar_upload';
			var url_avatar = 'http://'
			document.addEventListener('deviceready', function () {
				$cordovaFileTransfer.upload(url_avatar, avatarURI, options)
				  .then(function(data) {
						console.log('Success transfer file ' + JSON.stringify(data));
						//if(data.retcode === 0) {
							var url = (!config.is_device) ? '/signup_basic' : config.nex_server_ip + 'signup_basic';
							$http({
							  method  : 'POST',
							  url     : url,
							  data    : _serialize({ id: id, avatar : data, nickname : nickname}),  // pass in data as strings	
							  headers : { 'Content-Type': 'application/x-www-form-urlencoded' }
							 }).success(function(data) {
								if(data.retcode === 0) {
									$window.localStorage[key] = data.token;
									self.token = data.token;
									callback(data);
								}
							});
						//}
				  }, function(err) {
					// Error
				  }, function (progress) {
					// constant progress updates
				  });
			}, false);
		}

	}*/
	
	this.register_basic_nickname = function(id, nickname, callback) {
		var url = (!config.is_device) ? '/signup_basic_nickname' : config.nex_server_ip + 'signup_basic_nickname';
		$http({
		  method  : 'POST',
		  url     : url,
		  data    : _serialize({ id: id, nickname : nickname}),  // pass in data as strings	
		  headers : { 'Content-Type': 'application/x-www-form-urlencoded' }
		 }).success(function(data) {
			if(data.retcode === 0) {
				$window.localStorage[key] = data.token;
				self.token = data.token;
				callback(data);
			}
		});
	}
		
	this.register_basic_fullname = function(fullname, callback) {
		var url = (!config.is_device) ? '/signup_basic_fullname' : config.nex_server_ip + 'signup_basic_fullname';
		$http({
		  method  : 'POST',
		  url     : url,
		  data    : _serialize({ token: self.token, fullname : fullname}),  // pass in data as strings	
		  headers : { 'Content-Type': 'application/x-www-form-urlencoded' }
		 }).success(function(data) {
			if(data.retcode === 0) {
				callback(data);
			}
		});
	}
	
	this.register_basic_avatar = function(avatarURI, callback) {
		var options = {};
		options.params = {
			'token': self.token
		};
		
		var url_avatar = (config.is_localhost) ? '/signup_basic_avatar' : config.nex_server_ip + 'signup_basic_avatar';
		//var url_avatar = 'http://'
		document.addEventListener('deviceready', function () {
			$cordovaFileTransfer.upload(url_avatar, avatarURI, options)
			  .then(function(data) {
					console.log('Success transfer file ' + JSON.stringify(data));
					callback(data);
			  }, function(err) {
					console.log('Error transfer file ' + JSON.stringify(data));
			  }, function (progress) {
					console.log('Error transfer file ' + JSON.stringify(data));
			  });
		}, false);
	}
	
	function _get_location(callback) {
		if(config.is_device) {
			var posOptions = {timeout: 10000, enableHighAccuracy: false};
			$cordovaGeolocation
			.getCurrentPosition(posOptions)
			.then(function (position) {
			  var lat  = position.coords.latitude
			  var lng = position.coords.longitude
			  callback(lat,lng);
			}, function(err) {
			  // error
			});
		} else {
			var lat = 1.3014259, lng = 103.839855;
			callback(lat,lng);
		}
	}
		
	this.init = function(callback) {
		var url = config.nex_server_ip+'init?callback=JSON_CALLBACK&token='+self.token;
		var request = $http.jsonp(url);		
		request.success(function(data) {
			if(data.retcode === 0) {		
				self.is_init = true;			
				
				// init main module
				main.update_fav_list(data.fav_list);
				_get_location(function(lat, lng) {
					main.init_radar_here(self.token, lat, lng);
				});
				// init notification module
				notification.init(self.token);
				
				callback();
			}
		});
	}
	
	this.logout = function() {
		$window.localStorage.removeItem(key);
		main.clear_radar();
		main.clear();
		notification.stop();
		notification.clear();
	}

})
/*********init_radar_here/init_radar_favourite/init_radar_map/get_radar_latest_post*********
1. Global variable

2. Services -> API ?

3. Services = processing ?

**************************************/
.service('main', function($rootScope, $http, PubNub, config, post){
	var self = this;
	self.list = [];	
	self.fav_list = [];
	self.current_channels = []; 	
	
	this.clear = function() {
		self.list = [];	
		self.fav_list = [];
		self.current_channels = null;
	}
	
	this.update_fav_list = function(list) {
		for (var i in list) {
			self.fav_list.push(list[i]);
		}
	}
	
	function _updatePostList(text, is_update) {
		if(Array.isArray(text)){
			for (var i in text) {
				//for(var j in self.list) {
					/*if(self.list[j].id === text[i].id) {
						return;
						console.log('');
					} */
					//self.list = self.list.filter(function (el) {
                    //    return el.id !== text[i].id;
                    //   });
					
					self.list.unshift(text[i]);
				//}
			  
			}
		} else {
			for(var j in self.list) {
				if(self.list[j].id == text.id) { // Case EXIST
					if(text.new) {
						return;
					} else { // update
						if(typeof text.i.c != 'undefined') self.list[j].i.c = text.i.c;
						if(typeof text.i.l != 'undefined') self.list[j].i.l = text.i.l;
						if(typeof text.i.r != 'undefined') self.list[j].i.r = text.i.r;
					}					
				}
			}
			
			if(text.new) { // Case NOT EXIST
				self.list.unshift(text);
			} else {
				return;
			}			
		}
		
		if(is_update) {
			$rootScope.$apply();
		}
		//$scope.PostList.pop();
	}

	
	this.clear_radar = function(radar_callback) {
		PubNub.ngUnsubscribe({
			channel : self.current_channels, 
			callback : function(){console.log('xong')},
			http_sync : false
		});
	}
	
	//this.get_latest_post_list = get_latest_post_list;
	var myLatlng;
	function _distance(X, Y) { 
		return google.maps.geometry.spherical.computeDistanceBetween(X, Y);
	}    
	
	function _compare(a,b) {
		var _aCord = new google.maps.LatLng(a.geometry.location.lat,a.geometry.location.lng);
		var _bCord = new google.maps.LatLng(b.geometry.location.lat,b.geometry.location.lng);
		
		var a_distance = _distance(myLatlng,_aCord);
		var b_distance = _distance(myLatlng,_bCord);
				
	  if (a_distance < b_distance)
		 return -1;
	  if (a_distance > b_distance)
		return 1;
	  return 0;
	}
		
	this.init_radar_here = function(token, lat, lng) {	// here
		var url = config.nex_server_ip+'init_radar_here?callback=JSON_CALLBACK'+'&token='+token+'&lng='+lng+'&lat='+lat;
		var request = $http.jsonp(url);	
		myLatlng = new google.maps.LatLng(lat, lng);
		
		request.success(function(data) {
			data.results.sort(_compare);
			
			var len = data.results.length;
			var MAX_CHANNEL_NUMBER = 20;
			var i = 0;

			while(i < len && i < MAX_CHANNEL_NUMBER) {
				self.current_channels.push(data.results[i].place_id);
				i++;
			}
			
			post.get_latest_post_list(self.current_channels, 0, function(message) {
				_updatePostList(message, false);
			});
			PubNub.ngSubscribe({ channel: self.current_channels });
			$rootScope.$on(PubNub.ngMsgEv(self.current_channels), function(ngEvent, payload) {
				_updatePostList(payload.message, true);
			});
		});
	}

	this.init_radar_fovourite = function(token, id) {	// favourite
		var url = config.nex_server_ip+'init_radar_fovourite?callback=JSON_CALLBACK'+'&token='+token+'&id='+id;
		var request = $http.jsonp(url);
		 
		request.success(function(data) {
			var my_channel = data.channels;
			PubNub.ngSubscribe({ channel: my_channel });
			$rootScope.$on(PubNub.ngMsgEv(my_channel), function(ngEvent, payload) {
					_updatePostList(payload.message, true);
			});
		});
	}
	
	/***  private functions ***/ 
	function _serialize(obj) {
		var str = [];
		for(var p in obj){
			if (Array.isArray( obj[p])) {
				for(var i in obj[p])
					str.push(encodeURIComponent(p) + '[]=' + encodeURIComponent(obj[p][i]));
			} else {
				str.push(encodeURIComponent(p) + '=' + encodeURIComponent(obj[p]));
			}
		}
		return str.join('&');
	}
	
	this.addFavourite = function(name, token, callback) {
		var url = (!config.is_device) ? '/create_radar_favourite' : config.nex_server_ip + 'create_radar_favourite';
		$http({
			  method  : 'POST',
			  url     : url,
			  data    : _serialize({ Token: token, Channels: self.current_channels, Name : name}),  // pass in data as strings	
			  headers : { 'Content-Type': 'application/x-www-form-urlencoded' }
			 }).success(function(data) {
				callback(data);
			});
	}
})
.service('notification', function($rootScope, $http, config){
	var self = this;
	var socket;
	self.list = [];
	
	this.clear = function() {
		self.list = [];
	}
	
	function _notification_list(token) {
		var url = config.nex_server_ip+'notification_list?callback=JSON_CALLBACK&token='+token;
		var request = $http.jsonp(url);
		request.success(function(data) {	
			if(data.retcode === 0) {
				for( i in data.list) {
					self.list.push(data.list[i]);					
				}
			}
		});
	}
	
	this.notification_viewed = function(token, id) {
		var url = config.nex_server_ip+'notification_viewed?callback=JSON_CALLBACK&token='+token + '&id=' + id;
		var request = $http.jsonp(url);
		request.success(function(data) {
			if(data.retcode === 0) {
				
			}
		});
	}
	
	this.init = function(token) {
		socket = io(config.nex_server_ip);
		_notification_list(token);
		
		socket.emit('init', token);
		socket.on('message', function(msg){
			self.list.push(msg);
			$rootScope.$apply();
		});
		socket.on('reconnect', function(number){
			socket.emit('init', token);
		});
	}
	
	this.stop = function() {
		socket.io.close();
	}
})
.service('chatroom', function($rootScope, $http, config){

})
.service('profile', function($rootScope, $http, config){

	this.get_profile_header = function($scope, token, id) {
		var url = config.nex_server_ip+'get_profile_header?callback=JSON_CALLBACK&id='+ id +'&token='+ token;
		var request = $http.jsonp(url);
		
		request.success(function(data) {
			
			if(data.retcode === 0) {
				$scope.Profile = data.profile;
				console.log(JSON.stringify($scope.Profile.avatar));
			}
		});
	}
	
	this.get_profile_post_list = function($scope, token, id) {
		var url = config.nex_server_ip+'get_profile_post_list?callback=JSON_CALLBACK&id='+ id +'&token='+ token;
		var request = $http.jsonp(url);
		
		request.success(function(data) {
			if(data.retcode === 0) {
				for (var i in data.post_list) {
					$scope.ProfilePostList.unshift(data.post_list[i]);			  
				}
			}
		});
	}
	

})
.service('me', function($rootScope, $http, config){

});
