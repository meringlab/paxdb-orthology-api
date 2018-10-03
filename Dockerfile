# Version: 0.4
# to run:
# docker service create --limit-memory 1g --limit-cpu 1.0 --detach \
#      --with-registry-auth --env NEO4J_URL=http://localhost:13006 \
#      --env NEO4J_PASS=ssssecret --name paxdb-orthology-api_4  \
#      -p 13007:3000 paxdb/orthology-api:4.1.0
#
FROM node:10-alpine
MAINTAINER Milan Simonovic <milan.simonovic@imls.uzh.ch>

# DEFAULTS, override when creating a container:
ENV NEO4J_URL 'http://localhost:7474'
ENV NEO4J_USER neo4j
ENV NEO4J_PASS neo4j

ENV WD /var/www/paxdb
WORKDIR  $WD

EXPOSE 3000
CMD ["node", "./bin/www"]


# --no-cache: download package index on-the-fly, no need to cleanup afterwards
# --virtual: bundle packages, remove whole bundle at once, when done
RUN apk update && apk --no-cache --virtual build-dependencies add python make

# trick: avoid npm install
COPY package.json .
ENV NODE_ENV production
RUN npm install --production

RUN apk del build-dependencies

COPY . .

