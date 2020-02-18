# Choose and name our temporary image.
FROM alpine as intermediate

LABEL stage=intermediate

ARG GIT_PRIVATE_KEY

RUN apk update && \
    apk add --update git && \
    apk add --update openssh

RUN mkdir /root/.ssh/ && \
    echo "${GIT_PRIVATE_KEY}" > /root/.ssh/id_rsa && \
    chmod -R 600 /root/.ssh/ && \
    touch /root/.ssh/known_hosts && \
    ssh-keyscan -t rsa github.com >> /root/.ssh/known_hosts

RUN mkdir -p /root/docker/
WORKDIR /root/docker/
RUN git clone git@github.com:kylemiller3/compyscape.git

# Choose the base image for our final image
FROM alpine:latest
FROM node:lts-alpine

ARG DISCORD_KEY
ARG POSTGRES_PASSWORD
ARG POSTGRES_HOST
ARG POSTGRES_PORT

# Update & upgrade
RUN apk update && \
    apk upgrade

# Copy across the files from our `intermediate` container
RUN mkdir -p /root/docker/compyscape/

# Copy from git
WORKDIR /root/docker/compyscape/
COPY --from=intermediate /root/docker/** ./

# Install packages
RUN npm install
RUN npm install -g npm

# Make auth.ts
RUN echo "export const discordKey = '${DISCORD_KEY}';" > auth.ts && \
    echo "export const dbPassword = '${POSTGRES_PASSWORD}';" >> auth.ts && \
    echo "export const dbHost = '${POSTGRES_HOST}';" >> auth.ts && \
    echo "export const dbPort = '${POSTGRES_PORT}';" >> auth.ts && \
    echo "" >> auth.ts
RUN cat auth.ts

CMD ["npm", "start"]
