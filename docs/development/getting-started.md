# 快速开始

## 1. 环境要求

### 1.1 前端开发环境

- Node.js >= 16.0.0
- npm >= 8.0.0
- 微信开发者工具

### 1.2 后端开发环境

**Go 版本：**
- Go >= 1.21

**Rust 版本：**
- Rust >= 1.75

### 1.3 数据库

- MySQL >= 8.0

## 2. 前端项目启动

### 2.1 克隆项目

```bash
git clone https://github.com/your-org/subtrack-miniprogram.git
cd subtrack-miniprogram
```

### 2.2 安装依赖

```bash
cd wechat
npm install
```

### 2.3 配置

创建 `.env` 文件：

```bash
# API 地址
VITE_API_BASE_URL=http://localhost:8080/v1

# 微信小程序 AppID
VITE_WX_APP_ID=your_app_id
```

### 2.4 启动开发服务器

```bash
npm run dev
```

### 2.5 导入微信开发者工具

1. 打开微信开发者工具
2. 导入项目，选择 `wechat/miniprogram` 目录
3. 填写 AppID
4. 开始开发

## 3. 后端项目启动

### 3.1 Go 版本

```bash
cd backend-go

# 安装依赖
go mod download

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件

# 运行
go run main.go
```

### 3.2 Rust 版本

```bash
cd backend-rust

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件

# 运行
cargo run
```

## 4. 数据库初始化

### 4.1 创建数据库

```bash
mysql -u root -p

CREATE DATABASE subtrack CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4.2 运行迁移

**Go 版本：**
```bash
go run migrate.go up
```

**Rust 版本：**
```bash
sqlx migrate run
```

## 5. 常见问题

### 5.1 前端无法连接后端

检查：
- 后端服务是否启动
- API 地址配置是否正确
- 网络代理设置

### 5.2 数据库连接失败

检查：
- MySQL 服务是否启动
- 数据库配置是否正确
- 用户权限是否足够

### 5.3 微信开发者工具报错

检查：
- AppID 是否正确
- 项目路径是否正确
- 是否开启了不校验合法域名选项

## 6. 开发规范

### 6.1 代码风格

- 前端：遵循 ESLint 配置
- 后端 Go：使用 `gofmt` 格式化
- 后端 Rust：使用 `rustfmt` 格式化

### 6.2 提交规范

使用 Conventional Commits：

```
feat: 添加订阅列表筛选功能
fix: 修复预算计算错误
docs: 更新 API 文档
```

### 6.3 分支管理

- `main`: 主分支，稳定版本
- `develop`: 开发分支
- `feature/*`: 功能分支
- `fix/*`: 修复分支
