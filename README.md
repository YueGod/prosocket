# ProSocket - WebSocket Protobuf 调试工具

一个功能强大的WebSocket调试工具，专门用于测试和调试基于Protobuf协议的WebSocket服务。

## 🚀 特性

- ✅ **WebSocket连接管理** - 支持连接、断开、自动重连、心跳检测
- ✅ **Proto文件管理** - 批量导入.proto文件，自动解析消息类型
- ✅ **双模式消息编辑** - 支持表单和JSON两种编辑模式
- ✅ **消息编解码** - 自动将消息编码为Protobuf二进制格式
- ✅ **消息历史记录** - 记录所有发送和接收的消息，支持搜索和过滤
- ✅ **二进制数据查看** - 支持十六进制、Base64等多种格式查看
- ✅ **消息模板生成** - 自动生成消息模板，快速填写
- ✅ **配置保存** - 保存连接配置，方便下次使用

## 📦 安装

```bash
# 克隆项目
git clone [repository-url]
cd prosocket

# 安装依赖
npm install

# 启动开发服务器
npm run serve
```

## 🎯 使用方法

### 1. 启动应用

```bash
npm run serve
```

访问 http://localhost:8080

### 2. 启动测试服务器（可选）

项目包含一个测试用的WebSocket服务器：

```bash
# 安装ws依赖（如果还没安装）
npm install ws

# 启动测试服务器
node test-server.js
```

测试服务器运行在 `ws://localhost:8081`

### 3. 使用步骤

1. **建立连接**
    - 在顶部输入WebSocket服务器地址（如 `ws://localhost:8081`）
    - 点击"连接"按钮

2. **导入Proto文件**
    - 点击左侧"导入Proto"按钮
    - 选择一个或多个.proto文件
    - 系统会自动解析所有消息类型

3. **编辑消息**
    - 在中间区域选择消息类型
    - 使用表单模式填写字段值，或使用JSON模式直接编辑
    - 系统会自动验证消息格式

4. **发送消息**
    - 点击"发送消息"按钮
    - 消息会被编码为Protobuf二进制格式并发送
    - 可以选择"显示二进制"查看编码后的数据

5. **查看历史**
    - 右侧显示所有消息历史
    - 点击消息可查看详细信息
    - 支持导出历史记录为JSON文件

## 🛠️ 技术栈

- **Vue 3** - 前端框架
- **Element Plus** - UI组件库
- **protobufjs** - Protobuf处理库
- **WebSocket API** - 原生WebSocket支持

## 📁 项目结构

```
prosocket/
├── public/
│   └── example.proto          # 示例Proto文件
├── src/
│   ├── components/
│   │   └── ProSocket/
│   │       ├── ConnectionPanel.vue    # 连接管理面板
│   │       ├── ProtoManager.vue       # Proto文件管理
│   │       ├── MessageSender.vue      # 消息发送组件
│   │       └── MessageHistory.vue     # 消息历史组件
│   ├── utils/
│   │   ├── websocket.js      # WebSocket管理工具
│   │   └── protobuf.js       # Protobuf处理工具
│   └── views/
│       └── ProSocketView.vue  # 主视图
└── test-server.js             # 测试服务器

```

## 🎨 界面预览

### 主界面布局

```
┌─────────────────────────────────────────────────────┐
│                   连接管理栏                          │
├──────────┬────────────────────────┬─────────────────┤
│          │                        │                  │
│  Proto   │      消息编辑器         │   消息历史       │
│  文件    │                        │                  │
│  管理    │   - 消息类型选择        │   发送/接收记录   │
│          │   - 字段编辑           │                  │
│          │   - JSON编辑           │                  │
│          │                        │                  │
└──────────┴────────────────────────┴─────────────────┘
```

## 📝 示例Proto文件

项目包含一个示例Proto文件 `public/example.proto`，包含以下消息类型：

- User / UserProfile - 用户信息
- LoginRequest / LoginResponse - 登录消息
- ChatMessage - 聊天消息
- Request / Response - 通用请求响应
- Heartbeat - 心跳消息
- Notification - 通知消息

## 🔧 配置说明

### WebSocket连接配置

- **自动重连** - 连接断开后自动尝试重连
- **重连次数** - 最大重连尝试次数
- **心跳检测** - 定期发送心跳保持连接
- **心跳间隔** - 心跳发送间隔时间

### 消息发送选项

- **显示二进制** - 发送前预览二进制数据
- **自动格式化** - 发送后自动格式化JSON显示

## 🚧 注意事项

1. Proto文件必须是有效的Protocol Buffers格式
2. WebSocket服务器需要支持二进制消息
3. 大型Proto文件可能需要较长加载时间
4. 建议在开发环境使用，生产环境请谨慎

## 📄 License

MIT

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📞 联系方式

如有问题或建议，请提交Issue。