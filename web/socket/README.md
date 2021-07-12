# To setup logging (so that it doesn't just to go the global syslog)
```
sudo cp *.conf /etc/rsyslog.d/
sudo service rsyslog restart
```

Now you can run:
```
some_cmd ... | logger -t bughouse
```

Don't do this (too expensive)
```
sudo cp bughouse.conf /etc/google-fluentd/config.d/bughouse.conf
sudo service google-fluentd restart
```
