# CloudBase 配置指南

## 1. 创建 CloudBase 项目

### 1.1 开通服务

1. 登录 [腾讯云控制台](https://console.cloud.tencent.com/)
2. 进入 CloudBase 控制台
3. 创建新环境
   - 环境名称：`subtrack-prod`
   - 计费方式：按量付费

### 1.2 开通云托管

1. 进入环境管理页面
2. 点击「云托管」
3. 开通云托管服务
4. 选择地域（建议：广州）

## 2. MySQL 数据库配置

### 2.1 创建 MySQL 实例

1. 进入「云数据库」
2. 选择「MySQL」
3. 创建实例
   - 版本：MySQL 8.0
   - 规格：1核2GB（可按需调整）
   - 存储：20GB

### 2.2 数据库初始化

```sql
CREATE DATABASE subtrack CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2.3 连接信息

记录以下信息，用于后端服务配置：

- 主机地址：`xxx.mysql.tencentcdb.com`
- 端口：`3306`
- 数据库名：`subtrack`
- 用户名：`root`
- 密码：`your_password`

## 3. 环境变量配置

### 3.1 云托管环境变量

在云托管服务配置中添加以下环境变量：

```bash
# 数据库配置
DB_HOST=xxx.mysql.tencentcdb.com
DB_PORT=3306
DB_NAME=subtrack
DB_USER=root
DB_PASSWORD=your_password

# 微信小程序配置
WX_APP_ID=your_app_id
WX_APP_SECRET=your_app_secret

# CloudBase 环境配置
CLOUDBASE_ENV_ID=your-env-id

# 服务配置
PORT=8080
ENV=production
```

## 4. 网络配置

### 4.1 VPC 配置

确保云托管服务和 MySQL 实例在同一 VPC 内，或配置网络互通。

### 4.2 安全组配置

MySQL 安全组规则：

- 入站规则：允许云托管服务访问 3306 端口

## 5. 域名配置

### 5.1 绑定自定义域名

1. 进入云托管服务详情
2. 点击「域名管理」
3. 添加自定义域名：`api.subtrack.example.com`
4. 配置 DNS 解析

### 5.2 HTTPS 证书

1. 申请 SSL 证书
2. 在云托管中上传证书
3. 开启 HTTPS

## 6. 监控与日志

### 6.1 开启日志服务

1. 进入「日志服务」
2. 创建日志集和日志主题
3. 配置云托管日志采集

### 6.2 配置告警

1. 进入「云监控」
2. 创建告警策略
   - CPU 使用率 > 80%
   - 内存使用率 > 80%
   - 错误率 > 5%

## 7. 成本优化

### 7.1 资源配置建议

**开发环境：**

- 云托管：0.5核1GB
- MySQL：1核2GB

**生产环境：**

- 云托管：1核2GB（自动扩缩容）
- MySQL：2核4GB

### 7.2 费用预估

- 云托管：约 ¥100-300/月
- MySQL：约 ¥200-500/月
- 总计：约 ¥300-800/月
