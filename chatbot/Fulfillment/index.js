'use strict';

const ActionsSdkApp = require('actions-on-google').ActionsSdkApp;
const functions = require('firebase-functions');
const request = require('request');

// Constants for list and carousel selection

exports.water = functions.https.onRequest((req, res) => {
  const app = new ActionsSdkApp({request: req, response: res});

// React to list or carousel selection
  function itemSelected (app) {
    const param = app.getSelectedOption();
    console.log('USER SELECTED: ' + param);
    if (!param) {
      app.ask('You did not select any item from the above choices');
    } else {
        request('https://20ade114.ngrok.io/api/v1/water/source/' + param, function (error, response, body) {
            if (!error && response.statusCode === 200) {
                var item = JSON.parse(body);
                app.ask(basicCard(app, item));
            } else {
                app.tell("I'm malfunctioning right now! Call me later");
            }
        });
    }
  }

  function basicCard (app, item) {
    var result = app.buildRichResponse()
          .addSimpleResponse("Here's some information about the location")
          .addBasicCard(app.buildBasicCard(item.description)
                  .setSubtitle(item.comment)
                  .setTitle(item.description)
                  .addButton('Directions', 'https://www.google.com/maps/search/?api=1&query=' + item.location.Lat + ',' + item.location.Lng)
                  .setImage(getImagePath(item), 'Location image')
          );
    return result;
  }

  function generateResponse (app) {
    if (app.getDeviceLocation() === null) {
      app.askForPermission('To locate you', app.SupportedPermissions.DEVICE_PRECISE_LOCATION);
      return;
    }

    if (app.getRawInput().indexOf('water sources near me') !== -1) {
      var url = 'https://20ade114.ngrok.io/api/v1/water/sources';

      //url += '?lat=' + app.getDeviceLocation().coordinates.latitude + '&lng=' + app.getDeviceLocation().coordinates.longitude;
      request(url, function (error, response, body) {
        if (!error && response.statusCode === 200) {
          var a = JSON.parse(body);
          if (a.length === 0) {
            app.ask("I didn't find any water sources near you");
          } else if (a.length >= 2) {
            var items = [];
            console.log(a);
            for (var key = 0; key < a.length && key < 8; key++) {
              var entry = a[key];
              console.log(entry);
              var item = app.buildOptionItem(entry.id + '',
                            ['location ' + key, key + ''])
                            .setTitle(entry.description)
                            .setDescription(entry.comment)
                            .setImage(getImagePath(entry), 'Location image');
              items.push(item);
            }
            app.askWithList('I found a few locations for you',
                        app.buildList('Locations near you')
                        // Add third item to the carousel
                            .addItems(
                                items
                            )

                    );
          } else {
            basicCard(app, a[0]);
          }
        } else {
          app.tell("I'm malfunctioning right now! Call me later");
        }
      });
    } else {
      app.ask("I didn't quite catch that! Say again!");
    }
  }

  function getImagePath (entry) {
    var images = Object.keys(entry.images);
    var image = '';
    if (images.length !== 0) {
      image = images[0];
    }
    if (image !== '') {
      return 'https://20ade114.ngrok.io/api/v1/water/source/' + entry.id + '/image/' + image;
    }

    return '';
  }

  function checkPermissions (app) {
    if (app.isPermissionGranted()) {
      let location = app.getDeviceLocation();
      if (location == null) {
        app.tell("I'm still not able to locate you");
      } else {
        app.ask('Thank you!');
      }
    } else {
      app.tell("I won't be able to help you without knowing where you are");
    }
  }

  function mainIntent (app) {
    let inputPrompt = app.buildInputPrompt(false,
      'Hi! What can I do for you?');
    app.ask(inputPrompt);
  }

  let actionMap = new Map();
  actionMap.set(app.StandardIntents.MAIN, mainIntent);
  actionMap.set(app.StandardIntents.TEXT, generateResponse);
  actionMap.set(app.StandardIntents.OPTION, itemSelected);
  actionMap.set(app.StandardIntents.PERMISSION, checkPermissions);

  app.handleRequest(actionMap);
});
