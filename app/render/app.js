var app = angular.module("GithubReadmeReader", ["ui.router"]);

app.controller("TableContentsCtrl", ["$scope", "readmeList", function ($scope, readmeList) {
  $scope.tableContents = [];

  function updateReadmeList() {
    $scope.readmeList = readmeList.list();
    var list = [];
    $scope.readmeList.forEach(function (readme) {
      var name = readme["full_name"].replace(/\.|\//g, '_');
      list.push({urlName: name, displayName: readme["full_name"], url: readme["html_url"]});
    });
    $scope.tableContents = list;
  }
  $scope.$on("readmeListUpdateEvent", function () {
    updateReadmeList();
    $scope.$digest(); // update UI . why?
  });

  updateReadmeList();
}]);

app.controller("NavCtrl", ["$scope", "$rootScope", "$sce", "readmeList", function ($scope, $rootScope, $sce, readmeList) {
  $scope.currentRepo = "Welcome";
  $scope.add = function (repoUrl) {
    var paths = repoUrl.split("/");
    var user = paths[paths.length - 2];
    var name = paths[paths.length - 1];
    if (!user || !name) {
      return console.log("Invalid url");
    }
    console.log(user + name);
    readmeList.add({user: user, name: name}).catch(function (err) {
      console.error(JSON.stringify(err));
    });
  };

  $rootScope.$on('$stateChangeSuccess',function(event, toState, toParams, fromState, fromParams){
    $scope.currentRepo = toParams;
  });
}]);

app.config(['$stateProvider', "$urlRouterProvider", function ($stateProvider, $urlRouterProvider) {
  $stateProvider.state("page", {
    url: "/readme/:id/:display?url",
    templateUrl: function ($stateParams) {
      var appDataPath = require("remote").require("app").getPath("appData");
      return appDataPath + "/" + $stateParams.id + ".html";
    }
  }).state("notfound", {
    url: "/404",
    templateUrl: "404.html"
  });
  $urlRouterProvider.otherwise("/notfound");

}]);

app.provider("readmeList", [function () {
  var readmeList = [];
  function convertToObject(columnNames, values) {
    var list = [];
    columnNames = columnNames || [];
    values = values || [];
    values.forEach(function (repo) {
      var obj = {};
      repo.forEach(function (value, i) {
        obj[columnNames[i]] = value;
      });
      list.push(obj);
    });

    return list;
  }
  var DB = require("./db.js");
  var db = new DB();
  var connect = null;

  var initialized = false;
  this.init = function () {
    connect = db.init();
    try {
      var contents = connect.exec("SELECT * FROM test");
      if (contents.length > 0) {
        readmeList = convertToObject(contents[0].columns, contents[0].values);
      }
      initialized = true;
    } catch(e) {
      console.log(e);
    }
  };

  this.refresh = function () {
    var contents = connect.exec("SELECT * FROM test");
    if (contents.length > 0) {
      readmeList = convertToObject(contents[0].columns, contents[0].values);
    }
  };

  var self = this;
  this.readmeList = function () {
    if (!initialized) {
      self.init();
    }
    return readmeList;
  };

  function addRepo(repo) {
    return db.add(repo);
  }

  this.$get = ["$rootScope", function ($rootScope) {
    return {
      list: function () {
        return self.readmeList();
      },
      add: function (repo) {
        return addRepo(repo).then(function () {
          self.refresh();
          $rootScope.$broadcast("readmeListUpdateEvent");
        });
      }
    };
  }];
}]);

app.filter('highlight', ["$sce", function($sce) {
  return function(text, phrase) {
    if (phrase) text = text.replace(new RegExp('('+phrase+')', 'gi'),
      '<span class="highlighted">$1</span>');
    return $sce.trustAsHtml(text)
  }
}]);

app.filter("decodeURL", ["$window", function ($window) {
  return $window.decodeURIComponent;
}]);