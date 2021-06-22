Proof of concept UDS echo server
https://eli.thegreenplace.net/2019/unix-domain-sockets-in-go

Run:
```
go src/simple-echo-server.go
```

Client:
```
$ nc -U /tmp/echo.sock
hi
hi
```
