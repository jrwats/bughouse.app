# Base Image
FROM ubuntu:20.04

# scylladb/scylla:4.5.1
RUN apt-get update && apt-get install -y gnupg curl
RUN apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys 5e08fbd8b5d6ec9c
RUN curl -L --output /etc/apt/sources.list.d/scylla.list http://downloads.scylladb.com/deb/ubuntu/scylla-4.5-focal.list

ARG DEBIAN_FRONTEND=noninteractive
ENV TZ=America/Los_Angeles
RUN apt-get update && apt-get install -y scylla

RUN apt-get install -y golang-go redis openjdk-8-jre-headless 
RUN update-java-alternatives --jre-headless -s java-1.8.0-openjdk-amd64

expose 9402
