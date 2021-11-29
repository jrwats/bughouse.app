# Running/testing bughouse

## Prerequisites
### Frontend
* Node.js (v16)
  * Recommended: [install nvm](https://github.com/nvm-sh/nvm#installing-and-updating) for managing node versions
    * Then: `nvm install 16`
* Install [yarn package manager](https://yarnpkg.com/): `npm install -g yarn`   
### Backend
* [Docker](https://docs.docker.com/get-docker/) (ScyllaDB and Redis server)
* [Rust toolchain](https://rustup.rs/) (webserver)
* Optional: 
  * [git lfs](https://git-lfs.github.com/) (For the DB Docker image)
  * [Golang](https://golang.org/doc/install) (Firebase Auth)

## Running
### 1. Run the DB

#### Option 1: Build the docker image yourself
```
cd backend/db
./build.sh
./run.sh
```

#### Option 2: Load and run the pre-seeded DB docker image
```
gunzip -c ./backend/db/image.tar.gz | docker load
./backend/db/run.sh
```
NOTE: `image.tar.gz` is tracked via `git lfs`.  If `gunzip` fails above, you likely need to run `git lfs fetch && git lfs pull` first.

This can take up to 1 minute to initialize, but if it takes longer, something has probably gone wrong.  Check the docker logs


### 2. Load and run Redis — [docker.sh](https://github.com/jrwats/bughouse.app/blob/main/backend/redis/docker.sh)
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
