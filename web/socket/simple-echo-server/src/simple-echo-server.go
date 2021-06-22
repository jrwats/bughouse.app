package main

import (
  "io"
	"log"
	"net"
	"os"
)

const SockAddr = "/tmp/echo.sock"

func echoServer(c net.Conn) {
    addr := c.RemoteAddr().Network()
    log.Printf("Client connected [%s]", addr)
    io.Copy(c, c)
    c.Close()
    log.Printf("Client closed [%s]", addr)
}

func main() {
    if err := os.RemoveAll(SockAddr); err != nil {
        log.Fatal(err)
    }

    l, err := net.Listen("unix", SockAddr)
    if err != nil {
        log.Fatal("listen error:", err)
    }
    defer l.Close()

    for {
        // Accept new connections, dispatching them to echoServer
        // in a goroutine.
        conn, err := l.Accept()
        if err != nil {
            log.Fatal("accept error:", err)
        }

        go echoServer(conn)
    }
}
