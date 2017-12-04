package main

import (
	con "context"
	"github.com/vjsamuel/water/notifications/pubsub"
	"github.com/prometheus/log"
	"golang.org/x/net/context"
	"os"
	"github.com/vjsamuel/water/service/storage/entity_subscribe"
	"github.com/vjsamuel/water/service/common"
	"github.com/sfreiberg/gotwilio"
	"net/http"
	"time"
	"fmt"
)

func main() {
	projectId := os.Getenv("PROJECT_ID")
	bucket := os.Getenv("BUCKET")

	accountSid := os.Getenv("ACCOUNT_SID")
	authToken := os.Getenv("AUTH_TOKEN")

	from := os.Getenv("FROM_NUMBER")


	ctx := context.Background()
	c := make(chan string)
	done := make (chan struct{})
	p := pubsub.NewPubSub(projectId, bucket, ctx, c)
	if p == nil {
		log.Fatal("Unable to create pubsub client")
	}

	go p.Subscribe();
	ctx1 := con.Background()
	e := entity_subscribe.NewEntityStorage(projectId, ctx1)
	if e == nil {
		log.Fatal("Unable to create datastore client")
	}

	client := gotwilio.NewTwilioClientCustomHTTP(accountSid, authToken, &http.Client{Timeout: time.Second * 3})
	for {
		select {
		case <-done:
			ctx.Done()
			return
		case msg := <-c:
			if msg != "" {
				rawList, err := e.List(common.Holder{})
				if err != nil {
					log.Println("Unable to query subscribers due to err: ", err)
				} else {
					list := rawList.([]common.Subscription)
					for _, number := range list {
						client.SendSMS(from, number.Phone, fmt.Sprintf("New water finding with id %s is now available", msg), "", "")
					}
				}

			}

		}
	}
}
