FROM scylladb/scylla:4.5.1

COPY *cql /
COPY init.sh /init.sh

EXPOSE 9042
ENTRYPOINT ["/init.sh"]
