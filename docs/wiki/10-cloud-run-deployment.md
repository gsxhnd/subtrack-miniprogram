# 云托管部署指南

## 1. 项目结构

```
backend/
├── Dockerfile
├── main.go
├── go.mod
├── handlers/
├── models/
├── services/
└── config/
```

## 2. Dockerfile 配置

### 2.1 Go 版本

```dockerfile
FROM golang:1.21-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o main .

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/main .

EXPOSE 8080
CMD ["./main"]
```

## 3. 构建与部署

### 3.1 本地构建测试

```bash
# 构建镜像
docker build -t subtrack-backend .

# 本地运行
docker run -p 8080:8080 \
  -e DB_HOST=localhost \
  -e DB_PORT=3306 \
  subtrack-backend
```

### 3.2 推送到云托管

```bash
# 安装 CloudBase CLI
npm install -g @cloudbase/cli

# 登录
tcb login

# 部署
tcb run deploy \
  --name subtrack-api \
  --image subtrack-backend:latest \
  --port 8080
```

## 4. 服务配置

### 4.1 资源配置

**开发环境：**

- CPU: 0.5 核
- 内存: 1GB
- 实例数: 1

**生产环境：**

- CPU: 1 核
- 内存: 2GB
- 实例数: 1-5（自动扩缩容）

### 4.2 自动扩缩容

```yaml
# cloudbase.yaml
functions:
  - name: subtrack-api
    runtime: container
    cpu: 1
    memory: 2048
    minNum: 1
    maxNum: 5
    triggers:
      - type: http
```

## 5. 健康检查

### 5.1 健康检查端点

```
GET /health
```

**响应：**

```json
{
  "status": "ok",
  "timestamp": "2026-03-24T00:00:00Z"
}
```

### 5.2 配置健康检查

在云托管控制台配置：

- 检查路径: `/health`
- 检查间隔: 30 秒
- 超时时间: 5 秒
- 健康阈值: 2 次
- 不健康阈值: 3 次

## 6. 日志配置

### 6.1 日志格式

使用结构化日志（JSON 格式）：

```json
{
  "level": "info",
  "timestamp": "2026-03-24T00:00:00Z",
  "message": "Request processed",
  "method": "GET",
  "path": "/subscriptions",
  "status": 200,
  "duration": 45
}
```

### 6.2 日志级别

- `debug`: 调试信息
- `info`: 一般信息
- `warn`: 警告信息
- `error`: 错误信息

## 7. 监控指标

### 7.1 关键指标

- 请求 QPS
- 响应时间（P50/P95/P99）
- 错误率
- CPU 使用率
- 内存使用率

### 7.2 告警配置

- 错误率 > 5%
- P95 响应时间 > 1000ms
- CPU 使用率 > 80%
- 内存使用率 > 80%

## 8. 部署流程

### 8.1 CI/CD 流程

```
代码提交
    │
    ▼
运行测试
    │
    ▼
构建镜像
    │
    ▼
推送到镜像仓库
    │
    ▼
部署到云托管
    │
    ▼
健康检查
    │
    ▼
完成部署
```

### 8.2 回滚策略

如果部署失败或健康检查不通过，自动回滚到上一个稳定版本。
