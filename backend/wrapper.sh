#!/bin/bash
set -euo pipefail

source ./redis./start.sh

cqlsh -f '/bughouse.cql'
cqlsh -f '/test_seed.cql'

