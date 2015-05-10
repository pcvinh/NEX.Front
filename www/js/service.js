angular.module('nexengine.services', ['pubnub.angular.service'])
.service('config', function(){
	this.is_localhost = false;
	this.is_device = false;
	this.nex_server_ip = (this.is_localhost == false) ? 'http://107.167.183.96:5000/' : 'http://127.0.0.1:5000/';
	this.nex_api = {}; // backend API for NEX
	this.nex_current = {};// will be store in local storage if app suddenly exit.
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
	
	///////////////////////////////
	this.checklogin = function() {
		var _token = $window.localStorage[key]; 
		console.log(_token);
		if(typeof _token != 'undefined' && _token != null){		
			self.token = _token;
			return true;
		} else {
			return false;
		}
	}
	
	this.signinup = function(username, password, uuid, $scope){
		var url = config.nex_server_ip+"signinup?callback=JSON_CALLBACK&email="+username+"&password="+password+"&uuid="+uuid;
		var request = $http.jsonp(url);		
		console.log(url);
		request.success(function(data) {
			console.log("signinup response:" + JSON.stringify(data));
			 
			if(data.retcod === 0) {
				$window.localStorage[key] = data.token;
				self.token = data.token;
				$scope.$emit('loginevent', data);
			} else {
				$scope.$emit('loginevent', data);
			}
		});
	}
	
	this.register_basic = function(id, avatarURI, nickname, callback){ // upload image		
		if(config.is_localhost || typeof avatarURI == 'undefined') {
			console.log('signup_basic. id = ' + id + ' nickname = ' + nickname );
			var url = (!config.is_device) ? '/signup_basic' : config.nex_server_ip + 'signup_basic';
			$http({
			  method  : 'POST',
			  url     : url,
			  data    : _serialize({ id: id, nickname : nickname}),  // pass in data as strings	
			  headers : { 'Content-Type': 'application/x-www-form-urlencoded' }
			 }).success(function(data) {
				if(data.retcod === 0) {
					$window.localStorage[key] = data.token;
					self.token = data.token;
					callback(data);
				}
			});
		} else {
			console.log('signup_basic. id = ' + id + ' & nickname = ' + nickname + ' & avatar = ' + avatarURI);
			var options = {};
			var url_avatar = (config.is_localhost) ? '/signup_basic_avatar_upload' : config.nex_server_ip + 'signup_basic_avatar_upload';
			document.addEventListener('deviceready', function () {
				$cordovaFileTransfer.upload(url_avatar, avatarURI, options)
				  .then(function(data) {
						console.log('Success transfer file ' + JSON.stringify(data));
						//if(data.retcod === 0) {
							var url = (!config.is_device) ? '/signup_basic' : config.nex_server_ip + 'signup_basic';
							$http({
							  method  : 'POST',
							  url     : url,
							  data    : _serialize({ id: id, avatar : data, nickname : nickname}),  // pass in data as strings	
							  headers : { 'Content-Type': 'application/x-www-form-urlencoded' }
							 }).success(function(data) {
								if(data.retcod === 0) {
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

	}
	
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
	
	this.init = function(callback) {
		var url = config.nex_server_ip+"init?callback=JSON_CALLBACK&token="+self.token;
		var request = $http.jsonp(url);		
		console.log(url);
		request.success(function(data) {
			if(data.retcod === 0) {		
				self.is_init = true;			
				
				// init main module
				console.log("already got the fav_list = " + data.fav_list);
				main.update_fav_list(data.fav_list);
				_get_location(function(lat, long) {
					console.log("init radar here for location ("+lat+" . "+long+")");
					main.init_radar_here(self.token, lat, long);
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
.service('main', function($rootScope, $http, PubNub, config){
	var self = this;
	self.list = [];	
	self.fav_list = [];
	self.current_channels; 	
	
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
		console.log("_updatePostList:" + text);
		if(Array.isArray(text)){
			for (var i in text) {
				//for(var j in self.list) {
					/*if(self.list[j].id === text[i].id) {
						return;
						console.log("");
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
					console.log("EXIST. self.list["+j+"].id == text.id :" +self.list[j].id);
					if(text.new) {
						return;
					} else { // update
						if(typeof text.i.c != 'undefined') self.list[j].i.c = text.i.c;
						if(typeof text.i.l != 'undefined') self.list[j].i.l = text.i.l;
						if(typeof text.i.r != 'undefined') self.list[j].i.r = text.i.r;
					}					
				}
			}
			
			//console.log(self.list);
			if(text.new) { // Case NOT EXIST
				self.list.unshift(text);
			} else {
				return;
			}			
		}
		
		if(is_update) {
			$rootScope.$apply();
		}
		//$rootScope.$apply();
		//$scope.PostList.pop();
	}

	function get_latest_post_list(channels, page) {
		var list_channels = "";
		var i = 0;
		while (i < channels.length) {
			list_channels+="&channels[]="+channels[i];
			i++;
		}
		var url = config.nex_server_ip+"get_post_list?callback=JSON_CALLBACK" + list_channels + "&page=" + page;
		var request = $http.jsonp(url);		
		request.success(function(data) {
			_updatePostList(data.posts,false);
		});
	}
	
	this.clear_radar = function(radar_callback) {
		console.log("current channels: " + self.current_channels);
		PubNub.ngUnsubscribe({
			channel : self.current_channels, 
			//callback : function(){console.log("xong")},
			http_sync : false
		});
	}
	
	//this.get_latest_post_list = get_latest_post_list;
	
	this.init_radar_here = function(token, lon, lat) {	// here
		var url = config.nex_server_ip+"init_radar_here?callback=JSON_CALLBACK"+"&token="+token+"&lon="+lon+"&lat="+lat;
		var request = $http.jsonp(url);		
		 
		request.success(function(data) {
			console.log(JSON.stringify(data.channels));
			get_latest_post_list(data.channels, 0);
			var my_channel = data.channels;
			self.current_channels=my_channel;
			PubNub.ngSubscribe({ channel: my_channel });
			$rootScope.$on(PubNub.ngMsgEv(my_channel), function(ngEvent, payload) {
				console.log(payload.message);
				_updatePostList(payload.message, true);
			});
		});
	}

	this.init_radar_fovourite = function(token, id) {	// favourite
		var url = config.nex_server_ip+"init_radar_fovourite?callback=JSON_CALLBACK"+"&token="+token+"&id="+id;
		var request = $http.jsonp(url);		
		 
		request.success(function(data) {
			console.log(JSON.stringify(data.channels));
			
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
	
	this.addFavourite = function(name, token, callback) {
		var url = (!config.is_device) ? '/create_radar_favourite' : config.nex_server_ip + 'create_radar_favourite';
		$http({
			  method  : 'POST',
			  url     : url,
				/*transformRequest: function(obj) {
					var str = [];
					for(var p in obj)
					if (obj.hasOwnProperty(p)) {
					  str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
					}
					return str.join("&");
				},*/
			  data    : _serialize({ Token: token, Channels: self.current_channels, Name : name}),  // pass in data as strings	
			  headers : { 'Content-Type': 'application/x-www-form-urlencoded' }
			 }).success(function(data) {
				callback(data);
			});
	}
	
	this.createPost = function(message, token, callback) {
		var url = (!config.is_device) ? '/create_post' : config.nex_server_ip + 'create_post';
		$http({
			method  : 'POST',
			url     : url,
			transformRequest: function(obj) {
				var str = [];
				for(var p in obj)
				str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
				return str.join("&");
			},
			data    : { Channels: self.current_channels[0], Title : message.Title, Content: message.Content, Token: token},  // pass in data as strings	
			headers : { 'Content-Type': 'application/x-www-form-urlencoded' }
			}).success(function(data) {
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
			str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
			return str.join("&");
		},
		data    : { id: id, Token: token},  // pass in data as strings	
		headers : { 'Content-Type': 'application/x-www-form-urlencoded' }
		}).success(function(data) {
			callback(data);
		});
	}
	
	this.createPostRelay = function(id, token, callback) {
		var url = (!config.is_device) ? '/create_post_relay' : config.nex_server_ip + 'create_post_relay';
		$http({
		method  : 'POST',
		url     : url,
		transformRequest: function(obj) {
			var str = [];
			for(var p in obj)
			str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
			return str.join("&");
		},
		data    : { channel: self.current_channels[0], id: id, Token: token},  // pass in data as strings	
		headers : { 'Content-Type': 'application/x-www-form-urlencoded' }
		}).success(function(data) {
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
			str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
			return str.join("&");
		},
		data    : { id: id, Token: token, content : comment.Content},  // pass in data as strings	
		headers : { 'Content-Type': 'application/x-www-form-urlencoded' }
		}).success(function(data){
			callback(data);
		});
	}
	
	this.init_post_detail = function(id, token, $scope) {
		var url = config.nex_server_ip+"get_post_detail?callback=JSON_CALLBACK&id="+ id +"&token="+ token;
		var request = $http.jsonp(url);		
		console.log(url);
		request.success(function(data) {
			console.log(JSON.stringify(data));
			if(data.retcode === 0) {
				$scope.myitem = data.post_detail;
				console.log(JSON.stringify($scope.myitem));
				url = config.nex_server_ip+"get_post_comment_list?callback=JSON_CALLBACK&id="+ id +"&token="+ token;
				request = $http.jsonp(url);	
				request.success(function(data1) {
					if(data1.retcode === 0) {
						$scope.comments = data1.comments;
					}
				});
			}
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
		var url = config.nex_server_ip+"notification_list?callback=JSON_CALLBACK&token="+token;
		var request = $http.jsonp(url);
		console.log(url);
		request.success(function(data) {	
			console.log("Notification list = " + JSON.stringify(data));		
			if(data.retcode === 0) {
				console.log("Notification list = " + JSON.stringify(data.list));
				for( i in data.list) {
					console.log("Notification list = " + JSON.stringify(data.list[i]));
					self.list.push(data.list[i]);
					
				}
				
				
			}
		});
	}
	
	this.notification_viewed = function(token, id) {
		var url = config.nex_server_ip+"notification_viewed?callback=JSON_CALLBACK&token="+token + "&id=" + id;
		var request = $http.jsonp(url);
		console.log(url);
		request.success(function(data) {
			console.log(JSON.stringify(data));
			if(data.retcod === 0) {
				
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
			console.log("reconnect after try " + number);
			socket.emit('init', token);
		});
	}
	
	this.stop = function() {
		socket.io.close();
	}
})
.service('chatroom', function($rootScope, $http, config){

})
.service('me', function($rootScope, $http, config){

});
