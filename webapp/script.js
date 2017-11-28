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
    this.uploadFile = function(file, update, token) {
        var fd = new FormData();
        fd.append('file', file.file);
        fd.append('description', file.description);
        var uploadUrl = "/api/v1/files";
        var uploadMethod = "POST";
        if (update === true) {
            uploadMethod = "PUT";
        }
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
        var filePath = "/api/v1/file/" + file;
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
        var filePath = "/api/v1/file/" + file;
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
    this.getFileInfo = function(name, token) {
        var filePath = "/api/v1/file/" + name + "/info";
        return $http({
            url: filePath,
            method: 'GET',
            headers: {
                'X-CloudProject-Token': token,
                'Content-Type': 'application/json'
            }
        })
    };

    this.getFiles = function(token) {
        var filePath = "/api/v1/files";
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
        var file = $scope.file;
        fileMeta.getFileInfo(file.file.name, User.getToken()).then(function() {
            fileOps.uploadFile(file, true, User.getToken()).then(function() {
                $scope.message = file.file.name + " updated successfully.";
                $scope.show_success = true;
            }, function() {
                $scope.message = file.file.name + " update failed. Please try logging in and try again.";
                $scope.show_failure = true;
            });
        }, function() {
            fileOps.uploadFile(file, false, User.getToken()).then(function() {
                $scope.message = file.file.name + " uploaded successfully.";
                $scope.show_success = true;
            }, function(error) {
                if (error.status ==  403) {
                    $scope.message = file.file.name + " upload failed. Please login and try again.";
                } else if (error.status == 400) {
                    $scope.message = file.file.name + " upload failed as file is bigger than 10MB."
                } else {
                    $scope.message = file.file.name + " upload failed. Please try again."
                }

                $scope.show_failure = true;
            });
        })

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
                client_id: '####'
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
