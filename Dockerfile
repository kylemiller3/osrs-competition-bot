# syntax = docker/dockerfile:1.0-experimental

# Choose and name our temporary image.
FROM alpine as intermediate

LABEL stage=intermediate

RUN apk update && \
    apk add --update git && \
    apk add --update openssh

RUN mkdir /root/.ssh/ && \
    ssh-keyscan -t rsa github.com > /root/.ssh/known_hosts

RUN mkdir -p /root/docker/
WORKDIR /root/docker/
RUN --mount=type=ssh,id=github,required git clone git@github.com:kylemiller3/CompyScape.git

# Choose the base image for our final image
FROM alpine:latest
FROM node:lts-alpine

# Update & upgrade
RUN apk update && \
    apk upgrade

# Copy across the files from our `intermediate` container
RUN mkdir -p /root/docker/

# Copy git directory
WORKDIR /root/docker/
COPY --from=intermediate /root/docker/** ./
WORKDIR /root/docker/CompyScape

# Install packages
RUN npm install
RUN npm install -g npm

# Make auth.ts
RUN --mount=type=secret,id=auth.ts,required cat /run/secrets/auth.ts > ./auth.ts

CMD ["npm", "start"]
