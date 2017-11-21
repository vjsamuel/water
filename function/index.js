'use strict';

const PubSub = require('@google-cloud/pubsub');
const Storage = require('@google-cloud/storage');

const pubsub = PubSub();
const storage = Storage();

const Buffer = require('safe-buffer').Buffer;

exports.subscribe = function subscribe (event, callback) {
    const pubsubMessage = event.data;

    // We're just going to log the message to prove that it worked!
    const file = storage.bucket("cloud-project-1").file(pubsubMessage.attributes.id + "/" + pubsubMessage.attributes.name);
    const stream = file.createWriteStream({
        metadata:{
            contentType: pubsubMessage.attributes.contentType
        }
    });

    stream.write(Buffer.from(pubsubMessage.data, 'base64'))
    stream.end()

    // Don't forget to call the callback!
    callback();
};
