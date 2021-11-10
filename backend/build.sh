#!/bin/bash

set -euo pipefail

export FIREBASE="$(cat bughouse-secrets/.dev-firebase-adminsdk.json)"
docker build -t backend:1 --secret id=firebase,env=FIREBASE .


