# SubTrack 开发与路线图

## 快速开始

### 前端

```bash
cd wechat
npm install
npm run dev
```

在微信开发者工具中导入 `wechat/miniprogram` 目录进行调试。

### 后端

```bash
cd backend-go
go mod download
go run main.go
```

默认服务地址：`http://localhost:8080`。

### 数据库

- 需要 MySQL 8.0+
- 先创建 `subtrack` 数据库，再执行迁移脚本

## 开发规范

- 前端遵循 ESLint 配置
- Go 代码统一使用 `gofmt`
- 提交信息采用 Conventional Commits（如 `feat:`、`fix:`、`docs:`）

## 版本路线

### v1.x（已完成）

- 本地存储版核心闭环
- 订阅 CRUD、预算管理、基础统计

### v2.0（进行中）

- CloudBase + MySQL 云端改造
- API 接入、数据同步、迁移工具

### v2.1+（规划中）

- 统计增强、续费提醒、导出增强
- 家庭共享、价格监控、平台扩展

## 当前迭代重点

- 后端：认证、订阅接口、统计接口、同步接口
- 前端：API 适配、本地缓存策略、错误处理
- 稳定性：数据迁移可靠性、同步冲突处理、性能优化
