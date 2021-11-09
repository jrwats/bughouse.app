package main

import (
	"bufio"
	"context"
  "errors"
	"firebase.google.com/go/v4"
	"fmt"
	// "firebase.google.com/go/v4/auth"
	"log"
	"net"
	"os"
	"strconv"
	"strings"
  "syscall"
)

const (
	AUTH      = 1
	USER_INFO = 2
	LOGOUT    = 3
)

const SockAddr = "/tmp/firebase.sock"

func authenticate(idTok string, conn net.Conn, app *firebase.App, ctx context.Context) {
	client, err := app.Auth(ctx)
	if err != nil {
		log.Printf("error getting Auth client: %v\n", err)
	}
	writer := bufio.NewWriter(conn)
	token, err := client.VerifyIDToken(ctx, idTok)
	if err != nil {
		log.Print(err)
		writer.WriteString(fmt.Sprintf("err:%v\n", err))
	} else {
    provider := token.Firebase.SignInProvider
		log.Printf("Verified ID token: %v\n", token)
		writer.WriteString("uid:" + token.UID + "\x1e" + provider + "\n")
	}
	if werr := writer.Flush(); werr != nil {
    if errors.Is(werr, syscall.EPIPE) {
      log.Printf("EPIPE")
      // just ignore.
      return
    }
		log.Fatal(werr)
	}
}

func user_info(uid string, conn net.Conn, app *firebase.App, ctx context.Context) {
	client, err := app.Auth(ctx)
	if err != nil {
		log.Printf("error getting Auth client: %v\n", err)
	}
	writer := bufio.NewWriter(conn)
	user, err := client.GetUser(ctx, uid)
	if err != nil {
		log.Print(err)
		writer.WriteString(fmt.Sprintf("err:%v\n", err))
	} else {
    provider_id := "anonymous"
    if len(user.ProviderUserInfo) > 0 {
      provider_id = user.ProviderUserInfo[0].ProviderID;
    }
    log.Printf("USER_INFO %v, %v, %v, %v, %v\n", 
      user.DisplayName, provider_id, user.ProviderID, user.UserInfo.ProviderID, len(user.ProviderUserInfo))
		values := []string{user.DisplayName, user.Email, user.PhotoURL, provider_id}
		val_str:= strings.Join(values, "\x1e" /* record separator */)
		log.Printf("Got user, sending: %s\n", val_str)
		writer.WriteString("user:" + val_str + "\n")
	}
	if werr := writer.Flush(); werr != nil {
		log.Fatal(werr)
	}
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
	case USER_INFO:
		user_info(payload, conn, app, ctx)

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
