var app = angular.module('app', ['ui.bootstrap', 'ngRoute', 'ngMap']);

app.controller('myCtrl', ['$scope', function($scope) {
    $scope.count = 0;
    $scope.myFunc = function() {
        $scope.count++;

    };
}]);

//image
    app.controller("MainController", function ($scope, NgMap) {
        var water = {
            name: "Waterdrop",
            path: "/Images/waterdrop.jpg"
        };
        $scope.water = water;
    });

/*---map
function initMap() {
    var uluru = {lat: -25.363, lng: 131.044};
    var map = new google.maps.Map(document.getElementById('map'), {
        zoom: 4,
        center: uluru
    });
    var marker = new google.maps.Marker({
        position: uluru,
        map: map
    });
}*/


app.config(function($routeProvider) {
    $routeProvider
        .when('/home', {
            templateUrl : '/partials/home.html',
            controller: 'UploadController'
        })
        .when('/uploads', {
            templateUrl : '/partials/uploads.html',
            controller: 'ViewUploadsController'
        })
        .when('/map', {
            templateUrl : '/partials/watermap.html'
        })
        .when('/subscribers', {
            templateUrl : '/partials/subscribers.html',
            controller: 'SubscriptionController'
        })

});

app.factory('User', function(){
    var data =
        {
            User: undefined
        };

    return {
        getToken: function () {
            if (data.User === undefined) {
                return "";
            }
            return data.User.getAuthResponse().id_token;
        },
        setUser: function (User) {
            data.User = User;
        }
    };
});

app.directive('fileModel', ['$parse', function ($parse) {
    return {
        restrict: 'A',
        link: function(scope, element, attrs) {
            var model = $parse(attrs.fileModel);
            var modelSetter = model.assign;

            element.bind('change', function(){
                scope.$apply(function(){
                    modelSetter(scope, element[0].files[0]);
                });
            });
        }
    };
}]);

app.service('fileOps', ['$http', function ($http) {
     this.uploadWaterSource = function(id, file, locationStr, description, comment, token) {
        var fd = new FormData();
        fd.append('file', file.file);
        fd.append('description', description);
        fd.append('comment', comment);
        fd.append('location', locationStr);

        var uploadUrl = "/api/v1/water/source";
        var uploadMethod = "POST";
        if (id === '') {
            uploadUrl += "s";
        } else {
            uploadUrl += "/" + id;
            uploadMethod = "PUT";
        }

         return $http({
             url: uploadUrl,
             data: fd,
             method: uploadMethod,
             transformRequest: angular.identity,
             headers: {
                 'x-cloudproject-token' : token,
                 'Content-Type': undefined
             }
         })
    };

    this.uploadFile = function(file, update, token) {
        var fd = new FormData();
        fd.append('file', file.file);
        fd.append('description', file.description);
        var uploadUrl = "/api/v1/water/sources";
        var uploadMethod = "POST";
        if (update == true) {
            uploadMethod = "PUT";
        }
       // alert(token);
        return $http({
            url: uploadUrl,
            data: fd,
            method: uploadMethod,
            transformRequest: angular.identity,
            headers: {
                'X-CloudProject-Token': token,
                'Content-Type': undefined
            }
        })
    };

    this.deleteFile = function(file, token){
        var filePath = "/api/v1/water/source/" + file;
        return $http({
            url: filePath,
            method: 'DELETE',
            headers: {
                'X-CloudProject-Token': token,
                'Content-Type': 'application/json'
            }
        })
    };

    this.getFile = function(file, version, type, token){
        var filePath = "/api/v1/water/sources" + file;
        return $http({
            url: filePath,
            method: 'GET',
            params: {
              version: version
            },
            responseType: 'arraybuffer',
            headers: {
                'X-CloudProject-Token': token,
                'Content-Type': type
            }
        })
    };

    this.getWaterSource = function(id) {
      var urlPath = "/api/v1/water/source/" + id;
      return $http ({
          url: urlPath,
          method: 'GET'
          })
    };

    this.getImageURL = function(urlPath) {
      return $http({
          url:urlPath,
          method: 'GET',
          responseType: 'arraybuffer',
          headers: {
            'Content-Type':'image/jpeg'
          }
       })
    };

    this.subscribe = function(phone, token) {
        var uploadUrl = "/api/v1/water/subscribe";
        var uploadMethod = "POST";
        var payload = {
          phone: phone
        };
        return $http({
            url: uploadUrl,
            data: JSON.stringify(payload),
            method: uploadMethod,
            transformRequest: angular.identity,
            headers: {
                'x-cloudproject-token' : token,
                'Content-Type': 'application/json'
            }
        })
    };

    this.getSubscription = function(token) {
        var urlPath = "/api/v1/water/subscribe";
        return $http ({
            headers: {
                'X-CloudProject-Token': token
            },
            url: urlPath,
            method: 'GET'
        })
    };

    this.unSubscribe = function(token){
        var filePath = "/api/v1/water/subscribe";
        return $http({
            url: filePath,
            method: 'DELETE',
            headers: {
                'X-CloudProject-Token': token,
                'Content-Type': 'application/json'
            }
        })
    };
}]);

app.service('fileMeta', ['$http', function($http) {
    this.getFiles = function(token) {
        var filePath = "/api/v1/water/sources";
        var headers = {
            'Content-Type': 'application/json'
        }

        if (token !== '' || token !== undefined) {
            headers["X-CloudProject-Token"] = token
        }
        return $http({
            url: filePath,
            method: 'GET',
            headers: headers,
        })
    };
}

]);


app.controller('UploadController', ['$scope', '$routeParams', 'fileOps', 'fileMeta', 'User' ,function($scope,  $routeParams, fileOps, fileMeta, User) {
    $scope.empty = {};

    $scope.show_success = false;
    $scope.show_failure = false;
    $scope.description = '';
    $scope.comment = '';
    $scope.id = '';

    $scope.getLocation = function () {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition($scope.showPosition);
        }
    };

    $scope.showPosition = function (position) {
        $scope.location = position.coords.latitude + ","  + position.coords.longitude;
    };

    if ($routeParams.id !== undefined) {
        $scope.id = $routeParams.id;
    }

    if ($routeParams.location !== undefined) {
        $scope.location = $routeParams.location;
    } else {
        $scope.getLocation();
    }

    $scope.reset = function() {
        $scope.file = angular.copy($scope.empty);
        $scope.getLocation()
    };

    $scope.close = function() {
        $scope.show_success = false;
        $scope.show_failure = false;
    };


    $scope.upload = function() {
        var token = User.getToken();
        var file = $scope.file;
        var locationStr = $scope.location;
        var description = $scope.description;
        var comment = $scope.comments;
        var id = $scope.id;

        fileOps.uploadWaterSource(id, file, locationStr, description, comment, token).then(function() {
         // alert('file uploaded successfully');
           $scope.message = "water source is updated successfully.";
            $scope.show_success = true;
          }, function(error) {

         // alert('file upload failure');
          $scope.show_failure = true;
          $scope.message = "water source is not updated. failed with " + error.status;
          });

    };

    $scope.reset();
}]);

app.controller('SubscriptionController', ['$scope', 'fileOps', 'fileMeta', 'User' ,function($scope, fileOps, fileMeta, User) {
    $scope.empty = {};

    $scope.show_success = false;
    $scope.show_failure = false;
    $scope.phone = '';

    $scope.reset = function() {
        $scope.file = angular.copy($scope.empty);
    };

    $scope.close = function() {
        $scope.show_success = false;
        $scope.show_failure = false;
    };

    $scope.getSubscription = function() {
        var token = User.getToken();
        fileOps.getSubscription(token).then(function(success) {
            $scope.phone = success.data.phone;
        }, function() {
            $scope.phone = '';
        });
    };

    $scope.subscribe = function() {
        var token = User.getToken();
        var phone = $scope.phone;

        fileOps.subscribe(phone, token).then(function() {
            $scope.message = "You have been successfully subscribed.";
            $scope.show_success = true;
        }, function(error) {
            $scope.show_failure = true;
            $scope.message = "Unable to subscribe. failed with " + error.status;
        });

    };

    $scope.unsubscribe = function() {
        var token = User.getToken();
        fileOps.unsubscribe(token).then(function(success) {
            $scope.message = "You have been successfully unsubscribed.";
            $scope.show_success = true;
        }, function() {
            $scope.show_failure = true;
            $scope.message = "Unable to unsubscribe. failed with " + error.status;
        });
    };

    $scope.reset();
}]);

app.controller('ViewUploadsController', ['$scope', 'fileOps', 'fileMeta', 'User' ,function($scope, fileOps, fileMeta, User) {
    $scope.show_table = false;
    $scope.show_failure = false;
    $scope.show_success = false;

    $scope.close = function() {
        $scope.show_success = false;
        $scope.show_failure = false;
    };

    $scope.$on('sign-in', function() {
        $scope.show_failure = false;
        $scope.show_uploads();
    });

    $scope.show_uploads = function() {
        var token =  User.getToken()
        if (token === '') {
            $scope.message = "Unable to list  all water sources. Please try logging in and try again.";
            $scope.show_failure = true;
            return;
        }
        fileMeta.getFiles().then(function(success) {
            $scope.show_table = true;
            $scope.results = success.data;
        }, function() {
            $scope.message = "Unable to list  all water sources. Please try logging in and try again.";
            $scope.show_failure = true;
        });
    };

    $scope.convert_bytes = function(bytes, precision) {
        if (typeof precision === 'undefined') precision = 2;
        var units = ['bytes', 'kB', 'MB'],
        number = Math.floor(Math.log(bytes) / Math.log(1024));
        return (bytes / Math.pow(1024, Math.floor(number))).toFixed(precision) +  ' ' + units[number];
    }

    $scope.open = function(event) {
        var dropdown = angular.element(document.getElementById(event))
        if (dropdown.hasClass("open")) {
            dropdown.removeClass("open");
        } else {
            dropdown.addClass("open")
        }
    };

    $scope.delete = function(file) {
        fileOps.deleteFile(file, User.getToken()).then(function(){
            $scope.message = "Water source: " + file + " deleted.";
            $scope.show_success = true;
            $scope.show_uploads()
        }, function() {
            $scope.message = "Unable to delete water source " + file + " .";
            $scope.show_failure = true;
        })
    };

    $scope.download = function(filename, id, type) {
      fileOps.getWaterSource(id).then(function(success) {
         var imageName = "";
         for (var key in success.data.images) {
          imageName = key;
         }
         var imageURL =  "/api/v1/water/source/" + id + "/image/" + imageName;
         window.open(imageURL);
         }, function() {
            $scope.message = "Unable to open image of water source " + filename + " .";
            $scope.show_failure = true;

        });
    };

    if (User.getToken() !== "") {
        $scope.show_uploads();
    }
}]);

const LogIn = 'Log in';
const LogOut = 'Log out';

app.controller('MainController', ['$scope','fileOps', 'fileMeta', 'User', function($scope, fileOps, fileMeta, User,  NgMap) {
    $scope.state = LogIn;
    $scope.signedin = false;
    
    $scope.address = "current-location";
    $scope.positions = [];
    $scope.showInfo = false;
    $scope.image = "";

    $scope.getMarkerInfo = function(events, marker) {
      var p = marker.$index;
      fileOps.getWaterSource($scope.positions[p].data.id).then(function(success) {
         var imageName = "";
         for (var key in success.data.images) {
          imageName = key;

         }
         $scope.showInfo = true;
         $scope.image =  "/api/v1/water/source/" + $scope.positions[p].data.id + "/image/" + imageName;
         $scope.comment = $scope.positions[p].data.comment;
         $scope.description = $scope.positions[p].data.description;
         $scope.lat = $scope.positions[p].data.location.Lat;
         $scope.lng = $scope.positions[p].data.location.Lng;
         }, function() {
           // alert('failure GET request for given water source');
        });
    }
    
    $scope.getAllWaterSources = function(event) {
     fileMeta.getFiles('').then(function(success) {
            var count = 0;
            for (var i in success.data) {
               $scope.positions.push({data:success.data[i] , index:count});
               count = count + 1;
            }
           // $scope.positions = success.data;
            //alert('successful retrieval of water sources');
        }, function() {
            $scope.message = "Unable to list water sources. Please try logging in and try again.";
            $scope.show_failure = true;
          //  alert('failure in retrieving water sources');
        });

    };
    
    $scope.initClient = function() {
        gapi.load('auth2', function () {
            $scope.auth2 = gapi.auth2.init({
                client_id: '410143290104-uo4i3j4jg0o03kr8momlu3ro1ogg0vee.apps.googleusercontent.com'
            });

            var instance = gapi.auth2.getAuthInstance();
            //Listen for sign in events and act accordingly
            instance.isSignedIn.listen(function(signed) {
                $scope.signedin = signed;
                if (signed === true) {
                    var user = instance.currentUser.get();
                    $scope.username = user.getBasicProfile().getName()
                    User.setUser(user);
                    $scope.state = LogOut;
                    $scope.$apply();

                    // Let everyone know that user has signed in
                    $scope.$broadcast('sign-in', {});
                } else {
                    User.setUser(undefined);
                    $scope.state = LogIn;
                    $scope.$apply();
                }
            });

        });
    };

    $scope.signin = function() {
        if ($scope.state === LogIn) {
            $scope.auth2.signIn().then(
                function(user) {
                    User.setUser(user)
                },
                function() {
                    User.setUser(undefined)
                }
            )
        } else {
            var instance = gapi.auth2.getAuthInstance();
            instance.signOut().then(function () {
                User.setUser(undefined)
            });
        }
    };

    $scope.initClient()


  // ng-map

}]);
