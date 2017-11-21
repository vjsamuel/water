#PubSub -> Cloud Storage Function 

As the name suggests, this function can be used to subscribe to a pub/sub, create files and write them to cloud storage.


Files are created in a bucket in `profile_id/filename` format.

Create a pubsub topic if it doesnt already exist using:

```
 gcloud beta pubsub topics create YOUR_TOPIC_NAME
```


Create a bucket to stage the deployments of the function:

```
 gsutil mb gs://YOUR_BUCKET_NAME
```

Deploy the `subscribe` function using:

```
 gcloud alpha functions deploy subscribe --stage-bucket YOUR_BUCKET_NAME --trigger-topic YOUR_TOPIC_NAME
```

This will ensure that all files being written into Pub/Sub will be consumed by the function and written into Cloud Storage.