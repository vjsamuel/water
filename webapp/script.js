var app = angular.module('app', ['ui.bootstrap', 'ngRoute']);

app.controller('myCtrl', ['$scope', function($scope) {
    $scope.count = 0;
    $scope.myFunc = function() {
        $scope.count++;

    };
}]);

//image
    app.controller("MainController", function ($scope) {
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
            templateUrl : '/partials/map.html'
        })
        .when('/subscribers', {
            templateUrl : '/partials/subscribers.html'
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
     this.uploadWaterSource = function(file, locationStr, token) {
        var fd = new FormData();
        alert('trying to upload water source');
        fd.append('file', file.file);
        fd.append('description', "");
        fd.append('comment', "");
        fd.append('location', locationStr);
        alert('location' + locationStr);
        var uploadUrl = "http://localhost:8080/api/v1/water/sources";
        var uploadMethod = "POST";
        alert(token);
        return $http({
            url: uploadUrl,
            data: fd,
            method: uploadMethod,
            transformRequest: angular.identity,
            headers: {
                'x-cloudproject-token' : token,
                'Content-Type': 'multipart/form-data'
            }
        })
    };

    this.uploadFile = function(file, update, token) {
        var fd = new FormData();
        fd.append('file', file.file);
        fd.append('description', file.description);
        var uploadUrl = "http://localhost:8080/api/v1/water/sources";
        var uploadMethod = "POST";
        if (update == true) {
            uploadMethod = "PUT";
        }
        alert(token);
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
        var filePath = "http://localhost:8080/api/v1/water/source/" + file;
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
        var filePath = "http://localhost:8080/api/v1/water/sources" + file;
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
}]);

app.service('fileMeta', ['$http', function($http) {
    this.getFiles = function(token) {
        var filePath = "http://localhost:8080/api/v1/water/sources";
        return $http({
            url: filePath,
            method: 'GET',
            headers: {
                'X-CloudProject-Token': token,
                'Content-Type': 'application/json'
            }
        })
    };
}

]);

app.controller('UploadController', ['$scope', 'fileOps', 'fileMeta', 'User' ,function($scope, fileOps, fileMeta, User) {
    $scope.empty = {};

    $scope.show_success = false;
    $scope.show_failure = false;
    $scope.reset = function() {
        $scope.file = angular.copy($scope.empty);
    };

    $scope.close = function() {
        $scope.show_success = false;
        $scope.show_failure = false;
    };

    $scope.upload = function() {
        alert('i am here');
        alert('i am here 2');
        var token = "eyJhbGciOiJSUzI1NiIsImtpZCI6IjYxNGQwZWQ5M2QzOWZiZjFiYzE4NDc5M2RhMDgwMWQ0MGY0MGI4MjIifQ.eyJhenAiOiI0MDc0MDg3MTgxOTIuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJhdWQiOiI0MDc0MDg3MTgxOTIuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJzdWIiOiIxMDg4MTgwOTY0MDc1NTMzMDI1MjQiLCJhdF9oYXNoIjoiaDZpZ2dYNUU4ZWgtYWJ5RFJ6VGhFUSIsImlzcyI6Imh0dHBzOi8vYWNjb3VudHMuZ29vZ2xlLmNvbSIsImlhdCI6MTUxMjAwOTAwNCwiZXhwIjoxNTEyMDEyNjA0LCJuYW1lIjoiU3dldGhhIENoYW5kcmFzZWthciIsInBpY3R1cmUiOiJodHRwczovL2xoMy5nb29nbGV1c2VyY29udGVudC5jb20vLW1xZVRBSll4STFZL0FBQUFBQUFBQUFJL0FBQUFBQUFBQUFBL0FGaVlvZjF3ai1yTW82ZDkxS1FQZXI3Sm1vTnE2VkdWQVEvczk2LWMvcGhvdG8uanBnIiwiZ2l2ZW5fbmFtZSI6IlN3ZXRoYSIsImZhbWlseV9uYW1lIjoiQ2hhbmRyYXNla2FyIiwibG9jYWxlIjoiZW4ifQ.cQ_e67ccc5BLS_KB8P8Jhl-IvoWdNqPyYMPq7rGkS9tm2AKQiAAkurOuxRW0Pq3yFsk7X9TmY7kTrKZ-Sp4yxc8KDcF4xqNs6aZTypLOLjVBGZZSbPObk3Eo-mtnxzwiRncXVjE8EmUQf9Oh3CkLewe69hmh8QX-pBTUGnf4EocYM6vqmYYFMvtDyim72jn8Uy1ODz4yQ7FjJRuRLwq-rS_Z6kEhp4uqfEIjFrIdgxs8e1J_5eXKgaKzAZopIma_XAm0YEw4J56u9KdGrokusBa_0sNNvgWNjmDnZ8RoxLdLl7tRNAyXF4rLm05uuf_shGomemxxv-xf-K2KtQ2PPw";
        token = User.getToken(); 
        alert(token);
        var file = $scope.file;
        var locationStr = $scope.location;
        fileOps.uploadWaterSource(file, locationStr, token).then(function() { 
          alert('file uploaded successfully');
           $scope.message = file.file.name + " updated successfully.";
            $scope.show_success = true;
          }, function(response,error) {
          alert(error);
          alert(error.status);
          alert(response);
          alert('file upload failure');
          $scope.show_failure = true;
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
        fileMeta.getFiles(User.getToken()).then(function(success) {
            $scope.show_table = true;
            $scope.results = success.data;
        }, function() {
            $scope.message = "Unable to list uploaded files. Please try logging in and try again.";
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
            $scope.message = "File " + file + " deleted.";
            $scope.show_success = true;
            $scope.show_uploads()
        }, function() {
            $scope.message = "Unable to delete file " + file + " .";
            $scope.show_failure = true;
        })
    };

    $scope.download = function(filename, version, type) {
        fileOps.getFile(filename, version, type, User.getToken()).then(function(response){
            var file = new Blob([response.data], { type: type });
            saveAs(file, filename);
        }, function() {
            $scope.message = "Unable to get file " + filename + " .";
            $scope.show_failure = true;
        })
    };

    if (User.getToken() !== "") {
        $scope.show_uploads();
    }
}]);

const LogIn = 'Log in';
const LogOut = 'Log out';

app.controller('MainController', ['$scope', 'User' ,function($scope, User) {
    $scope.state = LogIn;
    $scope.signedin = false;
    $scope.initClient = function() {
        gapi.load('auth2', function () {
            $scope.auth2 = gapi.auth2.init({
                client_id: '383780224553-22egovj732rdubo0fv5tf5fbu37to9ud.apps.googleusercontent.com'
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




}]);
