# Dockerfile extending the generic Go image with application files for a
# single application.
FROM gcr.io/google-appengine/golang

COPY service /go/src/github.com/vjsamuel/water/service
COPY webapp /go/src/github.com/vjsamuel/water/webapp
WORKDIR /go/src/github.com/vjsamuel/water/service
RUN go-wrapper install -tags appenginevm
