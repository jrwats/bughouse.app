package main

import (
  "bufio"
	"log"
	"net"
	"os"
)

const (
  AUTH = 30
  LOGOUT = 31
)

const SockAddr = "/tmp/firebase.sock"

func firebaseServer(conn net.Conn) {
    addr := conn.RemoteAddr().Network()
    log.Printf("Client connected [%s]", addr)
    reader := bufio.NewReader(conn)
    ch, err := reader.ReadByte()
    if (err != nil) {
      log.Fatal("read error:", err)
    }
    log.Printf("byte: [%X]", ch)
    line, err := reader.ReadString('\n')
    if (err != nil) {
      log.Fatal("read error:", err)
    }
    log.Printf("line: [%s]", line)

    conn.Close()
    log.Printf("Client closed [%s]", addr)
}

func main() {
    fd := os.Getenv("SOCK")
    if fd == "" {
       fd = SockAddr
    }
    if err := os.RemoveAll(fd); err != nil {
        log.Fatal(err)
    }
    l, err := net.Listen("unix", fd)
    if err != nil {
        log.Fatal("listen error:", err)
    }
    log.Printf("Listening on: [%s]", fd)
    defer l.Close()

    for {
        // Accept new connections, dispatching to firebaseServer in a goroutine.
        conn, err := l.Accept()
        if err != nil {
            log.Fatal("accept error:", err)
        }
        go firebaseServer(conn)
    }
}
