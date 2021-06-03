# To setup logging (so that it doesn't just to go the global syslog)
```
sudo cp 30-bug-ws.conf /etc/rsyslog.d/
sudo service rsyslog restart
```

Now you can run:
```
node ... | logger -t bughouse
```

If using logging agent (kinda expensive on underpowered VMs) Google logging:
```
sudo cp bughouse.conf /etc/google-fluentd/config.d/bughouse.conf
sudo service google-fluentd restart
```
