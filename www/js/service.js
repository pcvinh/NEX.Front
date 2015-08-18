angular.module('nexengine.services', ['pubnub.angular.service'])
.service('config', function(){
	this.is_localhost = false;
	this.is_device = true;
	this.nex_server_ip = (this.is_localhost == false) ? 'http://107.167.183.96:5000/' : 'http://127.0.0.1:5000/';
	this.nex_api = {}; // backend API for NEX
	this.nex_current = {};// will be store in local storage if app suddenly exit.
	
	this.is_debug = {
		'service_post' : true,		
		'service_profile' :  true,
		'service_login' :  true,
		'service_main' :  true,
		'service_notification' :  true,
		'service_me' :  true
	}
})

.service('util', function(config){
	this.is_null = function(value) {
		return typeof value == 'undefined' || value == null;
	}
	
	this.is_blank = function(string) {
		return typeof string == 'undefined' || string == null || string == '';
	}
})

.service('vlog', function(config){
	this.log = function(msg) { // same as console but we make it as one clue for easier deal with.
		console.log(msg);
	}
	
	this.info = function(msg, module) {
		if(config.is_debug[module]) console.log('[INFO]' + msg);
	}
	
	this.error = function(err) {
		console.log('[ERROR]' + err);
	}
})
.service('pubsub', function($rootScope, PubNub, vlog){
	this.subcribe = function(channels, callback) {
		PubNub.ngSubscribe({ channel: channels });
		$rootScope.$on(PubNub.ngMsgEv(channels), function(ngEvent, payload) {
			callback(payload);
		});
	}
	
	this.unsubscribe = function(channels) {
		PubNub.ngUnsubscribe({
			channel : channels, 
			callback : function(){vlog.log('xong')},
			http_sync : false
		});
	}
})
/*****************************************************************************
///////////////////////////////// "post" /////////////////////////////////////
*****************************************************************************/
.service('post', function($rootScope, $http, $cordovaFileTransfer, me, config, vlog){
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
	
	this.get_latest_post_list = function(token, channels, from_id, callback) {
		var list_channels = '';
		var i = 0;
		while (i < channels.length) {
			list_channels+='&channels[]='+channels[i];
			i++;
		}
		var url = config.nex_server_ip+'get_post_list?callback=JSON_CALLBACK' + list_channels + '&from_id=' + from_id + '&token=' + token;
		var request = $http.jsonp(url);		
		request.success(function(data) {
			vlog.info('SUCCESS get_latest_post_list return: ' + JSON.stringify(data), 'service_post');
			callback(data.posts);
		});
	}
	
	this.upload_post_photo = function(img_uri, token, callback) {
		var options = {};
		options.params = {
			'Token': token
		};
		
		var url_upload_post_photo = config.nex_server_ip + 'upload_post_photo';
		document.addEventListener('deviceready', function () {
			$cordovaFileTransfer.upload(url_upload_post_photo, img_uri, options)
			  .then(function(results) {
                    var data = JSON.parse(results.response);
                    vlog.log('Success transfer file ' + JSON.stringify(data));
                    //if(results) {
						callback(data);
                    //}
			  }, function(err) {
					vlog.log('Error transfer file ' + JSON.stringify(err));
			  }, function (progress) {
					vlog.log('Progress transfer file ' + JSON.stringify(progress));
			  });
		}, false);
	}
		
	this.create_post = function(message, token, current_channel, post_type, photos, callback) {
		var url;		
		if(post_type === 1) {
			url = (!config.is_device) ? '/create_post_question' : config.nex_server_ip + 'create_post_question';
		} else {
			url = (!config.is_device) ? '/create_post' : config.nex_server_ip + 'create_post';
		}
		
		$http({
			method  : 'POST',
			url     : url,
			data    : _serialize({ Channels: current_channel, Content: message.Content, photos : photos, Token: token}),  // pass in data as strings	
			headers : { 'Content-Type': 'application/x-www-form-urlencoded' }
			}).success(function(data) {
				vlog.info('SUCCESS createPost return: ' + JSON.stringify(data), 'service_post');
				// insert to me.my_post_list
				var post = {'new' : true};
				post.type = post_type === null? 0 : post_type;
				post.id = data.id;
				post.content = message.Content;
				post.metadata = {};
				post.metadata.create_time = Date().toString();
				post.i = {};
				post.i.l = 0;
				post.i.c = 0;
				post.i.r = 0;
				post.i.my_l = false;
				me.add_to_my_post_list(post);

				callback(data);
			});
	}
	
	this.create_post_like = function(id, token, callback) {
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
			vlog.info('SUCCESS createPostLike return: ' + JSON.stringify(data), 'service_post');
			callback(data);
		});
	}
	
	this.create_post_relay = function(id, token, current_channel, callback) {
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
			vlog.info('SUCCESS createPostRelay return: ' + JSON.stringify(data), 'service_post');
			callback(data);
		});
	}
	
	this.create_post_comment = function(id, comment, token, callback) {
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
			vlog.info('SUCCESS createPostComment return: ' + JSON.stringify(data), 'service_post');
			callback(data);
		});
	}
	
	this.create_question_answer = function(id, comment, token, callback) {
		var url = (!config.is_device) ? '/create_question_answer' : config.nex_server_ip + 'create_question_answer';		
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
			vlog.info('SUCCESS createQuestionAnswer return: ' + JSON.stringify(data), 'service_post');
			callback(data);
		});
	}
	
	this.get_post_detail = function(id, token, callback) {
		var url = config.nex_server_ip+'get_post_detail?callback=JSON_CALLBACK&id='+ id +'&token='+ token;
		var request = $http.jsonp(url);		
		request.success(function(data) {
			
			if(data.retcode === 0) {
				var myitem = data.post_detail;
				
				url = config.nex_server_ip+'get_post_comment_list?callback=JSON_CALLBACK&id='+ id +'&token='+ token;
				request = $http.jsonp(url);	
				request.success(function(data1) {
					if(data1.retcode === 0) {
						vlog.info('SUCCESS init_post_detail return: ' + JSON.stringify(data) + '\n' + JSON.stringify(data1), 'service_post');						
						var comments = data1.comments;
						
						callback(myitem, comments);
					}
				});
			}
		});
	}

})

/*****************************************************************************
///////////////////////////////// "login" ////////////////////////////////////
*****************************************************************************/
.service('login', function($rootScope, $http, $window, $interval, $cordovaFileTransfer, config, main, notification, vlog){
	var self = this;
	var key = 'nex_token', key_my_id = 'nex_my_id';
	self.token = null;
	self.my_id = null;
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
			self.my_id = $window.localStorage[key_my_id];
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
				$window.localStorage[key_my_id] = data.id;
				self.token = data.token;
				self.my_id = data.id;
				$scope.$emit('loginevent', data);
			} else {
				$scope.$emit('loginevent', data);
			}
		});
	}
	
		
	this.change_my_password = function(token, old_password, new_password, callback) {
		var url = (!config.is_device) ? '/change_my_password' : config.nex_server_ip + 'change_my_password';
		$http({
			  method  : 'POST',
			  url     : url,
			  data    : _serialize({ Token: token, fullname : name, old_password : old_password, new_password : new_password }),  // pass in data as strings	
			  headers : { 'Content-Type': 'application/x-www-form-urlencoded' }
			 }).success(function(data) {
				if(data.retcode === 0) {
					$window.localStorage[key] = data.token;
					$window.localStorage[key_my_id] = data.id;
					self.token = data.token;
					self.my_id = data.id;
				}
				callback(data);
			});
	}
	
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
				$window.localStorage[key_my_id] = data.id;
				self.token = data.token;
				self.my_id = data.id;
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
			'Token': self.token
		};
		
		var url_avatar = config.nex_server_ip + 'signup_basic_avatar';
		
		document.addEventListener('deviceready', function () {
			$cordovaFileTransfer.upload(url_avatar, avatarURI, options)
			  .then(function(results) {
                    var data = JSON.parse(results.response);
                    vlog.log('Success transfer file ' + JSON.stringify(data));
                    if(data.retcode === 0) {
                        $window.localStorage[key] = data.token;
						self.token = data.token;
                        callback(data);
                    }
			  }, function(err) {
					vlog.log('Error transfer file ' + JSON.stringify(err));
			  }, function (progress) {
					vlog.log('Progress transfer file ' + JSON.stringify(progress));
			  });
		}, false);
	}
	
	this.change_my_basic_nickname = function(token, name, callback) {
		var url = (!config.is_device) ? '/change_my_basic_nickname' : config.nex_server_ip + 'change_my_basic_nickname';
		$http({
			  method  : 'POST',
			  url     : url,
			  data    : _serialize({ Token: token, nickname : name}),  // pass in data as strings	
			  headers : { 'Content-Type': 'application/x-www-form-urlencoded' }
			 }).success(function(data) {
				$window.localStorage[key] = data.token;
				self.token = data.token;
				callback(data);
			});
	}
	
	this.change_my_basic_fullname = function(token, name, callback) {
		var url = (!config.is_device) ? '/change_my_basic_fullname' : config.nex_server_ip + 'change_my_basic_fullname';
		$http({
			  method  : 'POST',
			  url     : url,
			  data    : _serialize({ Token: token, fullname : name}),  // pass in data as strings	
			  headers : { 'Content-Type': 'application/x-www-form-urlencoded' }
			 }).success(function(data) {
				callback(data);
			});
	}
	
	function onPause() {
		// Handle the pause event
		_stop_watchPosition();
	}
	
	function onResume() {
		setTimeout(function() {
		// Handle the resume event
			main.update_new_location();
			_start_watchPosition();
			$rootScope.$broadcast('appresume');
		}, 0);
	}
	
	var watchPosition;
	function _stop_watchPosition() {
		if (angular.isDefined(watchPosition)) {
			$interval.cancel(watchPosition);
			watchPosition = undefined;
		}
	}
	
	function _start_watchPosition() {
		if ( !angular.isDefined(watchPosition) ) {
			watchPosition = $interval(function() {
				main.update_new_location();
				if(main.check_change_location()) {
					main.is_noticed_change_location = true;
				}
			}, 5*60*1000);
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
				
				// --> radar - default is radar_here
				//main.init_radar_here(self.token);
				if(config.is_device) {
					document.addEventListener("pause", onPause, false);
					document.addEventListener("resume", onResume, false);
				}
				
				// init notification module
				notification.init(self.token);
				
				_start_watchPosition();
				callback();
			}
		});
	}
	
	this.logout = function() {
		$window.localStorage.removeItem(key);
		$window.localStorage.removeItem(key_my_id);
		main.clear_radar();
		main.clear();
		notification.stop();
		notification.clear();
        self.is_init = false;
	}

})

/*****************************************************************************
///////////////////////////////// "main" /////////////////////////////////////
*****************************************************************************/
.service('main', function($rootScope, $http, $cordovaGeolocation, pubsub, config, post, vlog){
	var self = this;
	self.list = [];	
	self.fav_list = [];
	self.current_channels = [];
	self.benchmark_id = 0;
	self.is_noticed_change_location = false;
	self.current_radar = 0; // 0: here, 1: favourite, 2: campaign
	
	var myLatlng, myNewLatlng;
	
	this.check_change_location = function() {
		if(_distance(myLatlng, myNewLatlng) > 200) { // moved 200m
			vlog.info('check_change_location = true', 'service_main');
			return true;
		}
		vlog.info('check_change_location = false', 'service_main');
		return false;
	}	
		
	this.update_new_location = function() {
		_get_location(function(lat, lng){
			vlog.info('update_new_location = ('+lat+','+lng+')', 'service_main');
			myNewLatlng = new google.maps.LatLng(lat, lng);
		});
	}
	
	this.clear = function() {
		self.list = [];	
		self.fav_list = [];
		self.current_channels = [];
		self.benchmark_id = 0;
	}
	
	this.update_fav_list = function(list) {
		for (var i in list) {
			self.fav_list.push(list[i]);
		}
	}
	
	function _updatePostList(text, is_update) {
        vlog.info('_updatePostList' + JSON.stringify(text) + ' is_update = ' + is_update, 'service_main');
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
			if(text.length < 10) {
				self.benchmark_id = -1;
			} else {				
				self.benchmark_id = text[text.length - 1].id;
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
		} else {
			$rootScope.$broadcast('postlistevent');
		}
		//$scope.PostList.pop();
	}

	
	this.clear_radar = function(radar_callback) {
		/*PubNub.ngUnsubscribe({
			channel : self.current_channels, 
			callback : function(){vlog.log('xong')},
			http_sync : false
		});*/
		pubsub.unsubscribe(self.current_channels);
	}
	
	//this.get_latest_post_list = get_latest_post_list;

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
			  vlog.log(err)
			});
		} else {
			var lat = 1.2928652, lng = 103.7920582; // office
			//var lat = 1.3455674, lng = 103.7333849; // home
			callback(lat,lng);
		}
	}
	
	this.load_more_post = function(token, callback) {
		if(self.benchmark_id === -1) {
			callback(false);
		} else {
			post.get_latest_post_list(token, self.current_channels, self.benchmark_id, function(message) {
				_updatePostList(message, false);
				callback(true);
			});
		}
	}
	
	function _init_radar_here(lat, lng, token, callback) { // first get the lat & lng
		var url = config.nex_server_ip+'init_radar_here?callback=JSON_CALLBACK'+'&token='+token+'&lng='+lng+'&lat='+lat;
		var request = $http.jsonp(url);	
		myLatlng = new google.maps.LatLng(lat, lng);
		myNewLatlng = new google.maps.LatLng(lat, lng);
		self.is_noticed_change_location = false;
		
		request.success(function(data) {
			data.results.sort(_compare);
			
			var len = data.results.length;
			var MAX_CHANNEL_NUMBER = 20;
			var i = 0;

			while(i < len && i < MAX_CHANNEL_NUMBER) {
				self.current_channels.push(data.results[i].place_id);
				i++;
			}
			
			post.get_latest_post_list(token, self.current_channels, 0, function(message) {
				_updatePostList(message, false);
			});
			
			/*PubNub.ngSubscribe({ channel: self.current_channels });
			$rootScope.$on(PubNub.ngMsgEv(self.current_channels), function(ngEvent, payload) {
				_updatePostList(payload.message, true);
			});*/
			pubsub.subcribe(self.current_channels, function(payload){
				_updatePostList(payload.message, true);
			});
			
			callback();
		});
	}
	
	this.init_radar_here = function(token, callback, is_new) {	// here
		if(typeof is_new == 'undefined') {
			is_new = true;
		}
		vlog.info('init_radar_here is_new = ' + is_new, 'service_main');
		if(is_new) {
			_get_location(function(lat, lng) { // first get the lat & lng
				_init_radar_here(lat, lng, token, callback);
			});	
		} else { // get the current location.
			_init_radar_here(myLatlng.lat(), myLatlng.lng(), token, callback);
		}
	}

	this.init_radar_fovourite = function(token, id, callback) {	// favourite
		var url = config.nex_server_ip+'init_radar_fovourite?callback=JSON_CALLBACK'+'&token='+token+'&id='+id;
		var request = $http.jsonp(url);
		 
		request.success(function(data) {
			var my_channel = data.channels;
			/*PubNub.ngSubscribe({ channel: my_channel });
			$rootScope.$on(PubNub.ngMsgEv(my_channel), function(ngEvent, payload) {
					_updatePostList(payload.message, true);
			});*/
			
			pubsub.subcribe(self.current_channels, function(payload){
				_updatePostList(payload.message, true);
			});
			
			callback();
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
	
	this.create_radar_favourite = function(name, token, callback) {
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

/*****************************************************************************
////////////////////////////// "notification" ////////////////////////////////
*****************************************************************************/
.service('notification', function($rootScope, $http, $window, config, vlog){
	var self = this;
	var socket;
	self.list = [];
	self.last_notification_id;
	
	this.clear = function() {
		self.list = [];
	}
	
	this.update_last_notification_id = function() {	
		$window.localStorage['last_notification_id'] = self.last_notification_id;
	}
	
	function _unshift_groupby(n) {
		self.last_notification_id = n.id;
		for(var i=0; i< self.list.length; i++) {
			var temp_n = self.list[i];
			if(temp_n.o.id == n.o.id && temp_n.v === n.v) {
				self.list[i].s = n.s;
				if(typeof temp_n.s_count !== 'undefined' && temp_n.s_count !== null) {
					self.list[i].s_count += 1;
				}
				
				return;
			} 
		}
		
		n.s_count = 0;
		self.list.unshift(n);
	}
	
	function _notification_list(token) {
		var url = config.nex_server_ip+'notification_list?callback=JSON_CALLBACK&token='+token;
		var request = $http.jsonp(url);
		request.success(function(data) {	
			if(data.retcode === 0) {
				vlog.info(JSON.stringify(data.list),'service_notification');
				for( i in data.list) {
					_unshift_groupby(data.list[i]);
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
			_unshift_groupby(msg);
			//self.list.push(msg);
			$rootScope.$apply();
		});
		socket.on('reconnect', function(number){
			self.list = [];
			_notification_list(token);
			socket.emit('init', token);
		});
	}
	
	this.stop = function() {
		socket.io.close();
	}
})

/*****************************************************************************
////////////////////////////////////// "me" //////////////////////////////////
*****************************************************************************/
.service('me', function($rootScope, $http, config){
	var self = this;
	self.Profile = {};
	self.list = [];	
	self.benchmark_id = 0;
	self.is_init = false;
	
	this.get_my_profile_header = function(token, callback) {
		var url = config.nex_server_ip+'get_my_profile_header?callback=JSON_CALLBACK&token='+ token;
		var request = $http.jsonp(url);
		
		request.success(function(data) {
			if(data.retcode === 0) {
				self.Profile = data.profile;
				callback(true);
			}
		});
	}
	
	this.get_my_post_list = function(token, callback) {
		var url = config.nex_server_ip+'get_my_post_list?callback=JSON_CALLBACK&from_id='+ self.benchmark_id +'&token='+ token;
		var request = $http.jsonp(url);
		if(!self.is_init) {
			self.is_init = true;
		}
		
		request.success(function(data) {
			if(data.retcode === 0) {
				for (var i in data.post_list) {
					self.list.unshift(data.post_list[i]);			  
				}
			
				if(data.post_list.length < 3) {
					self.benchmark_id = -1;
					callback(false);
				} else {				
					self.benchmark_id = data.post_list[data.post_list.length - 1].id;
					callback(true);
				}
			}
		});
	}
	
	this.add_to_my_post_list = function(post) {
		self.list.push(post);
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

	
})


/*****************************************************************************
///////////////////////////////// "profile" //////////////////////////////////
*****************************************************************************/
.service('profile', function($rootScope, $http, config, vlog){
	this.get_profile_header = function(token, id, callback) {
		var url = config.nex_server_ip+'get_profile_header?callback=JSON_CALLBACK&id='+ id +'&token='+ token;
		var request = $http.jsonp(url);
		
		request.success(function(data) {
			callback(data);
		});
	}
	
	this.get_profile_post_list = function(token, id, benchmark_id, callback) {
		var url = config.nex_server_ip+'get_profile_post_list?callback=JSON_CALLBACK&from_id='+ benchmark_id +'&id='+ id +'&token='+ token;
		var request = $http.jsonp(url);
		
		request.success(function(data) {
			callback(data);
		});
	}
});
