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
       // alert('trying to upload water source');
        fd.append('file', file.file);
       // alert(file.file);
        fd.append('description', '');
        fd.append('comment', '');
        fd.append('location', locationStr);
      //  alert('location' + locationStr);
        var uploadUrl = "http://localhost:8080/api/v1/water/sources";
        var uploadMethod = "POST";
       // alert(token);
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
        var uploadUrl = "http://localhost:8080/api/v1/water/sources";
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

    this.getWaterSource = function(id) {
      var urlPath = "http://localhost:8080/api/v1/water/source/" + id;
      return $http ({
          url: urlPath,
          method: 'GET'
          })
    };
}]);

app.service('fileMeta', ['$http', function($http) {
    this.getFiles = function() {
        var filePath = "http://localhost:8080/api/v1/water/sources";
        return $http({
            url: filePath,
            method: 'GET',
            headers: {
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
       // alert('i am here');
        //var token = "eyJhbGciOiJSUzI1NiIsImtpZCI6IjY4MjQxMjMxYmJmMGRmOGY5MTIzZDAxOGNmOWU2MDFlMmFhMzY3M2EifQ.eyJhenAiOiI0MDc0MDg3MTgxOTIuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJhdWQiOiI0MDc0MDg3MTgxOTIuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJzdWIiOiIxMDg4MTgwOTY0MDc1NTMzMDI1MjQiLCJhdF9oYXNoIjoiTS1UVmUxUlhtNzg2MlhXZFROY2FpdyIsImlzcyI6Imh0dHBzOi8vYWNjb3VudHMuZ29vZ2xlLmNvbSIsImlhdCI6MTUxMjI1NTIzNywiZXhwIjoxNTEyMjU4ODM3LCJuYW1lIjoiU3dldGhhIENoYW5kcmFzZWthciIsInBpY3R1cmUiOiJodHRwczovL2xoMy5nb29nbGV1c2VyY29udGVudC5jb20vLW1xZVRBSll4STFZL0FBQUFBQUFBQUFJL0FBQUFBQUFBQUFBL0FGaVlvZjF3ai1yTW82ZDkxS1FQZXI3Sm1vTnE2VkdWQVEvczk2LWMvcGhvdG8uanBnIiwiZ2l2ZW5fbmFtZSI6IlN3ZXRoYSIsImZhbWlseV9uYW1lIjoiQ2hhbmRyYXNla2FyIiwibG9jYWxlIjoiZW4ifQ.LNZfW3dHxc4x-J6YooFqrb2ybpobem6WoOxztE0AOMlrQIBSpYhSn6yUYsF7F4xgEDXLZFLG6qlLPBmQmeKeEMiDB85JRZ9dI6lbgqm-Hq1arqQCK58W3037c2MCwlvp7YwcssXtjRvJtDa0MArgBPVGJlGJ1zc6hluc_NtqOQxpa4-vD0h3Vgc2iiwEY-YeHNI5UZyIKFLrRgEthJCb4nrjkta3h9dexNizcnlYTph3BlyCVo8mb6G60NFQXcMc_iZNnzMcdg7uyui2vSdm5j82HC9smN-1YtfJjXXf9dPh_GuMOwHWAH_zn_lZNQ-xF9ors8k9grdIVDQVvBPMHg";
        var token = User.getToken(); 
        var file = $scope.file;
        var locationStr = $scope.location;
        fileOps.uploadWaterSource(file, locationStr, token).then(function() { 
          alert('file uploaded successfully');
           $scope.message = file.file.name + " updated successfully.";
            $scope.show_success = true;
          }, function(error) {

          alert('file upload failure');
          $scope.show_failure = true;
          $scope.message = error.status;
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
        fileMeta.getFiles().then(function(success) {
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
         $scope.image =  "http://localhost:8080/api/v1/water/source/" + $scope.positions[p].data.id + "/image/" + imageName;
         $scope.comment = $scope.positions[p].data.comment;
         $scope.description = $scope.positions[p].data.description;
         $scope.lat = $scope.positions[p].data.location.Lat;
         $scope.lng = $scope.positions[p].data.location.Lng;
         }, function() {
            alert('failure GET request for given water source');
        });
    }
    $scope.getAllWaterSources = function(event) {
     fileMeta.getFiles().then(function(success) {
            var count = 0;
            for (var i in success.data) {
               $scope.positions.push({data:success.data[i] , index:count});
               count = count + 1;
            }
           // $scope.positions = success.data;
            alert('successful retrieval of water sources');
        }, function() {
            $scope.message = "Unable to list uploaded files. Please try logging in and try again.";
            $scope.show_failure = true;
            alert('failure in retrieving water sources');
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
