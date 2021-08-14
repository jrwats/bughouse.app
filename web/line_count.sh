#!/bin/bash

find . \( \
    -path '*node_modules*' -o \
    -path '*node-telnet-client*' -o \
    -path '*/build/*' \
  \) -prune -o -type f -iname '*js' -print0 \
  | xargs -0 wc -l
