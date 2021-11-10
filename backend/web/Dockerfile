FROM rust

# Cache dependencies
COPY Cargo.toml Cargo.toml
COPY Cargo.lock Cargo.lock
RUN mkdir src && echo '// dummy' > src/lib.rs && cargo build --lib

COPY . .
RUN cargo build
ENV PORT=8081
ENV RUST_BACKTRACE=1
EXPOSE 8081
ENTRYPOINT ["./target/debug/bug-wss"]
