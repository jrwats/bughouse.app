# To setup logging (so that it doesn't just to go the global syslog)
```
sudo cp 30-bug-ws.conf /etc/rsyslog.d/
sudo service rsyslog restart
```

Now you can run:
```
node ... | logger -t bughouse
```

