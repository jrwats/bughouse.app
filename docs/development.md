# Guide to running bughouse.app locally
Make sure you have `yarn` and `node` (version 12.x.x) available.  [NVM](https://github.com/nvm-sh/nvm) is your friend for `node.js` version sanity.

# Make localhost SSL certs
* This will enable you to host an `https` (SSL) webserver locally.
```
 mkdir -p .localhost-ssl
 sudo openssl genrsa -out .localhost-ssl/localhost.key 2048
 sudo openssl req -new -x509 -key .localhost-ssl/localhost.key \
   -out .localhost-ssl/localhost.crt -days 1024 -subj /CN=localhost
 sudo chmod a+r .localhost-ssl/localhost.key
```
## Linx/WSL**
```
 sudo cp .localhost-ssl/localhost.crt /usr/local/share/ca-certificats/
 sudo update-ca-certificates
```

## Mac
```
 sudo security add-trusted-cert -d -r trustRoot -k \
   /Library/Keychains/System.keychain .localhost-ssl/localhost.crt
 ```
in your home directory (`~`)
* In the `bughouse/web/socket` folder make a symlink to that folder (`.localhost-ssl`)
```
cd web/socket && ln -s ~/.localhost-ssl
```
* There are symlinks (checked in already) in `react-app` that expect `web/socket` to have that directory
* When running in development mode, these files will be used for SSL


# Websocket
```
cd web/socket && yarn start
```

# react-app
* For development purposes, just running the baked-in `create-react-app` scripts should be fine
```
cd web/site/react-app;
yarn start_https
```
* To run the "production build" (smaller, faster, less debugging code, etc) but locally and accessing our "development" firebase DB, you can run
```
cd web/site/react-app;
yarn start_https;
yarn build:dev;
yarn start:dev;
```


## A note on browsing
* Mozilla will warn you about the SSL certs, but you can still get through, by opening "Advanced" and clicking continue.
* Chrome will outright block the page if it's not trusted, because it's not a trusted certificate.  Type `thisisunsafe` (yes, I'm serious) and it'll let you through
