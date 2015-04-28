angular.module('nexengine.services', ['pubnub.angular.service'])
.service('config', function(){
	this.server_url = 'http://107.167.183.96:8100/';
	
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
.service('login', function($rootScope, $http, $window, config){
	var self = this;
	var key = 'nex_token';
	self.token = null;
	self.is_init = false;
	
	var socket;

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
		var url = "http://107.167.183.96:5000/signinup?callback=JSON_CALLBACK&email="+username+"&password="+password+"&uuid="+uuid;
		var request = $http.jsonp(url);		
		console.log(url);
		request.success(function(data) {
			console.log(JSON.stringify(data.type));
			 $scope.$emit('loginevent', data);
			if(data.retcod === 0) {
				$window.localStorage[key] = data.token;
			}
		});
	}
	
	this.init = function(callback) {
		var url = "http://107.167.183.96:5000/init?callback=JSON_CALLBACK&token="+self.token;
		var request = $http.jsonp(url);		
		console.log(url);
		request.success(function(data) {
			if(data.retcod === 0) {
				$rootScope.is_init = true;
				self.is_init = true;
				$rootScope.fav_list = data.fav_list;
				
				// this is notify service init
				socket = io("http://107.167.183.96:5000/");
				
				socket.emit('init', self.token);
				socket.on('message', function(msg){
					console.log(msg);
				});
				
				callback();
			}
		});
	}
})
/*********init_radar_here/init_radar_favourite/init_radar_map/get_radar_latest_post*********
1. Global variable

2. Services -> API ?

3. Services = processing ?

**************************************/
.service('radar', function($rootScope, $http, PubNub){
	var self = this;
	self.list = [];	
	self.current_channels; 	
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
		var url = "http://107.167.183.96:5000/get_post_list?callback=JSON_CALLBACK" + list_channels + "&page=" + page;
		var request = $http.jsonp(url);		
		request.success(function(data) {
			_updatePostList(data.posts,false);
		});
	}
	
	this.clear = function(radar_callback) {
		console.log("current channels: " + self.current_channels);
		PubNub.ngUnsubscribe({
			channel : self.current_channels, 
			//callback : function(){console.log("xong")},
			http_sync : false
		});
	}
	
	this.get_latest_post_list = get_latest_post_list;
	
	this.init_radar_here = function(token, lon, lat) {	// here
		var url = "http://107.167.183.96:5000/init_radar_here?callback=JSON_CALLBACK"+"&token="+token+"&lon="+lon+"&lat="+lat;
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
		var url = "http://107.167.183.96:5000/init_radar_fovourite?callback=JSON_CALLBACK"+"&token="+token+"&id="+id;
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
})
.service('nexbackend', function($rootScope, $http, config){
	this.get_from_backend = function(callback) {
		var url = "http://107.167.183.96:5000/init?callback=JSON_CALLBACK&token="+self.token;
		var request = $http.jsonp(url);		
		console.log(url);
		request.success(function(data) {
			console.log(JSON.stringify(data.type));
			if(data.retcod === 0) {
				$rootScope.is_init = true;
				self.is_init = true;
				$rootScope.fav_list = data.fav_list;
				callback();
			}
		});
	}
	
	this.get_post_comment_list = function(callback) {
		var url = "http://107.167.183.96:5000/init?callback=JSON_CALLBACK&token="+self.token;
		var request = $http.jsonp(url);		
		console.log(url);
		request.success(function(data) {
			console.log(JSON.stringify(data.type));
			if(data.retcod === 0) {
				$rootScope.is_init = true;
				self.is_init = true;
				$rootScope.fav_list = data.fav_list;
				callback();
			}
		});
	}
	
	
})
.service('chatroom', function($rootScope, $http){

})
.service('me', function($rootScope, $http){

});
