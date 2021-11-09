#!/bin/bash

gcloud app versions list | 
  awk '$3 == "0.00" { print $2; }' | 
  xargs gcloud app versions delete
