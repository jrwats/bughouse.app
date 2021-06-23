package main

import (
	"bufio"
	"context"
	"firebase.google.com/go/v4"
	"firebase.google.com/go/v4/auth"
	"log"
	"net"
	"os"
	"strconv"
)

const (
	AUTH      = 1
	HEARTBEAT = 2
	LOGOUT    = 3
)

const SockAddr = "/tmp/firebase.sock"

func authenticate(idTok string, conn net.Conn, app *firebase.App, ctx context.Context) *auth.Token {
	client, err := app.Auth(ctx)
	if err != nil {
		log.Fatalf("error getting Auth client: %v\n", err)
	}
	token, err := client.VerifyIDToken(ctx, idTok)
	log.Printf("Verified ID token: %v\n", token)
	writer := bufio.NewWriter(conn)
	writer.WriteString(token.UID + "\n")
	// conn.WriteS(token.UID)
	return token
}

func firebaseServer(conn net.Conn, app *firebase.App, ctx context.Context) {
	addr := conn.RemoteAddr().Network()
	log.Printf("Client connected [%s]", addr)
	scanner := bufio.NewScanner(conn)
	if ok := scanner.Scan(); !ok {
		log.Fatal("Scanner error:", ok)
	}
	kind := scanner.Text()
	if ok := scanner.Scan(); !ok {
		log.Fatal("Scanner error:", ok)
	}
	payload := scanner.Text()
	cmd, err := strconv.Atoi(kind)
	if err != nil {
		log.Fatal(err)
	}
	log.Printf("    idx: [%X]", cmd)
	log.Printf("payload: [%s]", payload)
	switch cmd {
	case AUTH:
		authenticate(payload, conn, app, ctx)
	case HEARTBEAT:

	case LOGOUT:
	default:
		log.Printf("Uknown cmd: %d\n", cmd)
	}

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

	ctx := context.Background()
	app, err := firebase.NewApp(ctx, nil)
	if err != nil {
		log.Fatal("firebase init error:", err)
	}
	for {
		// Accept new connections, dispatching to firebaseServer in a goroutine.
		conn, err := l.Accept()
		if err != nil {
			log.Fatal("accept error:", err)
		}
		go firebaseServer(conn, app, ctx)
	}
}