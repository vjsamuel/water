# Dockerfile extending the generic Go image with application files for a
# single application.
FROM gcr.io/google-appengine/golang

COPY . /go/src/github.com/vjsamuel/water/notifications
WORKDIR /go/src/github.com/vjsamuel/water/notifications
RUN go-wrapper install -tags appenginevm
