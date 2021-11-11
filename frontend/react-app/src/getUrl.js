function getUrl() {
  const hostname = window.location.hostname;
  const PROD_HOST = "ws.bughouse.app";
  const DEV_HOST = `${hostname}:${process.env.WS_PORT || 8081}`;
  const host = process.env.REACT_APP_SOCKET_HOST ||
    (process.env.NODE_ENV === "production" ? PROD_HOST : DEV_HOST);
  const scheme = process.env.NODE_ENV === "production" ? "https" : "http";
  return {scheme, host};
}

export default getUrl;
