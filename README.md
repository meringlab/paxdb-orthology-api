This is the [pax-db.org](http://pax-db.org) orthology API front-end (node.js express).

# Build

```
docker build -t paxdb/orthology-api:4.1.0 -f Dockerfile.front .
docker service create --limit-memory 1g --limit-cpu 1.0 --detach \
    --with-registry-auth --env NEO4J_URL=http://localhost:13006 \
    --env NEO4J_PASS=ssssecret --name paxdb-orthology-api_4  \
    -p 13007:3000 paxdb/orthology-api:4.1.0
```

# Versioning

All versions are `<major>.<minor>.<patch>`, where major and minor follow
[pax-db.org](pax-db.org) versions.


# License

MIT. See "LICENSE.txt".

