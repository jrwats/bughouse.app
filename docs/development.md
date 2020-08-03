# Guide to running bughouse.app localy
Make sure you have `yarn` and `node` (version 12.x.x) available.  [NVM](https://github.com/nvm-sh/nvm) is your friend for `node.js` version sanity.

# Make localhost SSL certs
* This will enable you to host an `https` (SSL) webserver locally.
* **For MacOS** Run [these commands](https://github.com/jrwats/bughouse/blob/3f1d2eecf4b3dc0580f71892f4b27021aed935a0/web/socket/app.js#L31-L37)
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
