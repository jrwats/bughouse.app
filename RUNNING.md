# Running/testing bughouse

## Prerequisites
* Node.js (v16) (frontend)
  * We recommend [installing nvm](https://github.com/nvm-sh/nvm#installing-and-updating) for managing node versions
* yarn: `npm install -g yarn`   
* [Docker](https://docs.docker.com/get-docker/)
  * (Will run the ScyllaDB and Redis server)
* [git lfs](https://git-lfs.github.com/) (currently for the DB Docker image)
* [Rust toolchain](https://rustup.rs/) - (for the backend webserver)
* Optional: [Golang](https://golang.org/doc/install) 
   * (Backend Firebase authentication, which is not stricly necessary for testing)


## Running
### 1. Load and run the DB docker image via
```
gunzip -c ./backend/db/image.tar.gz | docker load
./backend/db/run.sh
```
NOTE: `image.tar.gz` is tracked via `git lfs`.  If `gunzip` fails above, you likely need to run `git lfs fetch && git lfs pull` first.

### 2. Load and run REDIS — [docker.sh](https://github.com/jrwats/bughouse.app/blob/main/backend/redis/docker.sh)
```
./backend/redis/docker.sh
```

### 3. Run the webserver
```
cd backend/web
PORT=8081 RUST_BACKTRACE=1 cargo run --bin bug-wss
```

### 4. Run the frontend
```
cd frontend/react-app
yarn install
yarn start
```
