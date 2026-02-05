# Stage 1:# Build Stage
FROM golang:alpine AS builder
WORKDIR /app

# Copy dependency definitions
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the binary
RUN go mod tidy
RUN go build -o gateway main.go auth.go admin.go providers.go
RUN go build -o keymgr keymgr.go auth.go

# Runtime Stage
FROM gcr.io/distroless/static-debian12

WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/gateway .
COPY --from=builder /app/keymgr .
# Copy static frontend assets
COPY --from=builder /app/public ./public
# Copy auth and admin tools if separate? No, built into gateway.

# Copy env file (handled by docker-compose usually, but distroless needs it mounted or env vars)
# We rely on docker-compose env_file

EXPOSE 3000

CMD ["./gateway"]
