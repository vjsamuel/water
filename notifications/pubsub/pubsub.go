package pubsub

import (
	"log"

	"golang.org/x/net/context"
	"cloud.google.com/go/pubsub"
	"fmt"
)

type PubSub struct {
	sub  *pubsub.Subscription
	client *pubsub.Client
	ctx    context.Context
	topic  string
	ids    chan string
}

func NewPubSub(project, topic string, ctx context.Context, ids chan string) *PubSub {
	client, err := pubsub.NewClient(ctx, project)
	if err != nil {
		log.Println("Client connection failed with error: %v\n", err)
		return nil
	}

	sub := client.Subscription(topic)

	return &PubSub{client: client, topic: topic, sub: sub, ctx: ctx, ids: ids}
}

func (p *PubSub) Subscribe() error {
	err := p.sub.Receive(p.ctx, p.process)
	if err != nil {
		return err
	}

	return nil
}


func (p *PubSub) process(ctx context.Context, msg *pubsub.Message) {
	fmt.Println("Here with message: ", msg.Attributes)
	if id, ok := msg.Attributes["id"]; ok {
		fmt.Println(id)
		p.ids <- id
	}
	msg.Ack()
}