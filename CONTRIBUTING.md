# Contributing to **bughouse.app**
We want to make contributing to this project as easy and transparent as
possible.

## Pull Requests
We actively welcome your pull requests.

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes.
5. Make sure your code lints.

## Issues
We use GitHub issues to track public bugs. Please ensure your description is
clear and has sufficient instructions to be able to reproduce the issue.

## License
By contributing to fbt, you agree that your contributions will be licensed
under the LICENSE file in the root directory of this source tree.

## Running/testing bughouse
### Prerequisites
* Node.js (v16) (frontend)
  * We recommend [installing nvm](https://github.com/nvm-sh/nvm#installing-and-updating) for managing node versions
* yarn: `npm install -g yarn`   
* [Docker](https://docs.docker.com/get-docker/)
  * (Will run the ScyllaDB and Redis server)
* [Rust toolchain](https://rustup.rs/) - (for the backend webserver)
* Optional: [Golang](https://golang.org/doc/install) 
   * (Backend Firebase authentication, which is not stricly necessary for testing)


### Running
* Load and run the DB docker image via
```
gunzip -c ./backend/db/image.tar.gz | docker load
./backend/db/run.sh
```

* Load and run REDIS — [docker.sh](https://github.com/jrwats/bughouse.app/blob/main/backend/redis/docker.sh)
```
./backend/redis/docker.sh
```

* Run the webserver
```
cd backend/web
PORT=8081 RUST_BACKTRACE=1 cargo run --bin bug-wss
```

* Run the frontend
```
cd frontend/react-app
yarn install
yarn start
```