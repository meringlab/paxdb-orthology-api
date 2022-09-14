This is the [pax-db.org](http://pax-db.org) orthology API front-end (node.js express).

# Build

```
docker build -t paxdb/orthology-api:latest .
docker service create --limit-memory 1g --limit-cpu 1.0 --detach \
    --with-registry-auth --env NEO4J_URL=http://localhost:13006 \
    --env NEO4J_PASS=ssssecret --name paxdb-orthology-api \
    -p 13007:3000 paxdb/orthology-api:latest
```

# Versioning

All versions are `<major>.<minor>.<patch>`, where major and minor follow
[pax-db.org](pax-db.org) versions.

# Update

Update & publish npm library `paxdb-ortholog-lib` which defines the species, orthologs and ontology relations in the new version.
Modify its version in package.json (delete package-lock.json if needed) .


# License

MIT. See "LICENSE.txt".

