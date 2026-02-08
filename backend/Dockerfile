FROM golang:1.25-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o gateway .
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o keymgr ./cmd/keymgr
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o migrate ./cmd/migrate

# Final stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/gateway .
COPY --from=builder /app/keymgr .
COPY --from=builder /app/migrate .

# Copy public assets
COPY --from=builder /app/public ./public

# Copy migrations
COPY --from=builder /app/db/migrations /db/migrations

EXPOSE 3000

CMD ["./gateway"]
