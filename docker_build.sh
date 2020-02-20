#!/bin/bash

GIT="./build/git";
AUTH_TS="./build/docker-test.ts";

if [ "${DEPLOY}" = 1 ];
then 
    AUTH_TS="./build/docker-deploy.ts";
fi

docker pull postgres:12-alpine

DOCKER_BUILDKIT=1 docker build \
    --ssh github="${GIT}" \
    --secret id=auth.ts,src="${AUTH_TS}" \
    --tag kylemiller3/compyscape \
    --no-cache \
    --progress=plain \
    --rm \
    .;

