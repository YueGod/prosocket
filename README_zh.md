# ProSocket

中文 | [English](./README.md)

## ProSocket - WebSocket Protobuf 调试工具

ProSocket 是一个基于 Vue 3 构建的强大 WebSocket 调试工具，专门用于处理 Protocol Buffer 消息的编码和解码。它提供了一个完整的界面来测试使用
Protobuf 编码消息的 WebSocket 连接。

### ✨ 特性

- **🔌 WebSocket 连接管理**
    - 支持 ws:// 和 wss:// 协议
    - 自动重连机制
    - 连接状态监控
    - 心跳检测支持
    - 连接配置持久化

- **📄 Proto 文件管理**
    - 批量导入 .proto 文件
    - 自动提取消息类型
    - 消息类型树形展示
    - 支持嵌套消息结构
    - Proto 文件热重载

- **📝 消息编辑器**
    - 双编辑模式：表单和 JSON
    - 自动生成消息模板
    - 字段验证
    - 支持嵌套消息
    - bytes 字段特殊处理（原始/消息/base64）
    - 数组字段支持
    - 丰富的数据类型支持（字符串、数字、布尔值、字节等）

- **📊 消息历史**
    - 完整的发送/接收消息记录
    - 消息过滤和搜索
    - 二进制数据预览（十六进制/Base64/字节）
    - 消息重新解码功能
    - 导出历史记录为 JSON
    - 自动解码接收的消息
    - 嵌套消息检测和解码

- **🛠️ 开发者工具**
    - 包含测试 WebSocket 服务器
    - 提供示例 proto 文件
    - 二进制数据可视化
    - 消息大小跟踪
    - 解码错误处理

### 🚀 快速开始

#### 环境要求

- Node.js >= 12.0.0
- npm 或 yarn

#### 安装

```bash
# 克隆仓库
git clone https://github.com/yourusername/prosocket.git
cd prosocket

# 安装依赖
npm install

# 启动开发服务器
npm run serve

# 构建生产版本
npm run build
```

#### 运行测试服务器

```bash
# 安装测试服务器依赖（如果需要）
npm install ws protobufjs

# 启动测试服务器
node test-server.js
```

测试服务器将在 `ws://localhost:8081` 启动并支持示例 proto 消息。

### 📖 使用指南

#### 1. 建立 WebSocket 连接

1. 在连接栏输入 WebSocket 服务器地址（如：`localhost:8080`）
2. 选择协议（ws:// 或 wss://）
3. 点击"连接"按钮
4. 状态指示器将显示连接状态

#### 2. 导入 Proto 文件

1. 点击左侧边栏的"导入 Proto"按钮
2. 选择一个或多个 .proto 文件
3. 系统将自动解析并提取消息类型
4. 消息类型将显示在树形视图中

#### 3. 编辑消息

**表单模式：**

- 从下拉列表中选择消息类型
- 使用表单界面填写字段
- 嵌套消息可在单独的对话框中编辑
- 数组支持动态添加/删除项目

**JSON 模式：**

- 直接以 JSON 格式编辑消息内容
- 使用格式化/验证按钮辅助操作
- 支持复制/粘贴操作

#### 4. 发送消息

1. 选择消息类型
2. 编辑消息内容
3. 点击"发送消息"
4. 消息将被编码为 Protobuf 二进制格式
5. 在历史面板中查看已发送的消息

#### 5. 查看消息历史

- 所有发送和接收的消息都显示在右侧面板
- 点击任何消息查看详情
- 使用过滤器搜索特定消息
- 导出历史记录进行分析

### 🏗️ 项目结构

```
prosocket/
├── public/
│   ├── example.proto         # 示例 proto 文件
│   └── nested-example.proto  # 嵌套消息示例
├── src/
│   ├── components/
│   │   └── ProSocket/
│   │       ├── ConnectionPanel.vue    # WebSocket 连接管理
│   │       ├── ProtoManager.vue       # Proto 文件管理
│   │       ├── MessageSender.vue      # 消息编辑器和发送器
│   │       └── MessageHistory.vue     # 消息历史显示
│   ├── utils/
│   │   ├── websocket.js              # WebSocket 管理器
│   │   ├── protobuf.js               # Protobuf 处理器
│   │   └── protobuf-simple.js        # 简化的 protobuf 处理器
│   ├── views/
│   │   ├── HomeView.vue              # 主页
│   │   └── ProSocketView.vue         # ProSocket 主界面
│   └── main.js                       # 应用入口
├── test-server.js                    # 测试 WebSocket 服务器
└── package.json
```

### 🔧 配置

#### WebSocket 配置

```javascript
// 连接设置
{
    autoReconnect: true,          // 启用自动重连
        maxReconnectAttempts
:
    5,      // 最大重连次数
        enableHeartbeat
:
    false,       // 启用心跳检测
        heartbeatInterval
:
    30         // 心跳间隔（秒）
}
```

#### 消息解码设置

- **自动解码**：自动尝试解码接收的二进制消息
- **默认消息类型**：设置解码接收消息的默认类型
- **备选类型**：默认类型失败时尝试的替代消息类型

### 🛡️ 支持的 Proto 特性

- ✅ 基本类型（string、int32、bool 等）
- ✅ 重复字段（数组）
- ✅ 嵌套消息
- ✅ 枚举
- ✅ 映射（Map）
- ✅ 字节字段
- ✅ Oneof 字段（有限支持）
- ✅ 默认值

### 💡 高级功能

#### 嵌套消息处理

对于包含编码消息的 bytes 字段：

1. 为 bytes 字段选择"消息类型"模式
2. 选择要编码的消息类型
3. 编辑嵌套消息内容
4. 系统将自动将其编码为字节

#### 二进制数据格式

支持多种二进制数据输入/输出格式：

- **十六进制**：`0x12 0x34 0x56`
- **Base64**：`EjRW`
- **字节数组**：`[18, 52, 86]`

#### 消息模板

系统根据 proto 定义自动生成模板：

- 所有字段类型的默认值
- 重复字段的空数组
- 嵌套消息结构
- Map 字段的正确初始化

### 🤝 贡献

欢迎贡献！请随时提交 Pull Request。

1. Fork 仓库
2. 创建功能分支（`git checkout -b feature/AmazingFeature`）
3. 提交更改（`git commit -m 'Add some AmazingFeature'`）
4. 推送到分支（`git push origin feature/AmazingFeature`）
5. 开启 Pull Request

### 📄 许可证

本项目采用 Apache License 2.0 开源许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

### 🙏 致谢

- [Vue.js](https://vuejs.org/) - 渐进式 JavaScript 框架
- [Element Plus](https://element-plus.org/) - Vue 3 UI 框架
- [protobuf.js](https://github.com/protobufjs/protobuf.js) - JavaScript 的 Protocol Buffers 实现

### 📮 联系方式

如有问题或建议，请通过 [GitHub Issues](https://github.com/yourusername/prosocket/issues) 提交。

### 🔍 常见问题

**Q: 为什么接收的消息无法解码？**  
A: 请确保已导入正确的 proto 文件，并在解码设置中配置正确的消息类型。

**Q: 如何处理包含嵌套消息的 bytes 字段？**  
A: 在表单模式下，将 bytes 字段设置为"消息类型"模式，然后选择相应的消息类型进行编辑。

**Q: 支持哪些 WebSocket 子协议？**  
A: 目前支持标准的 ws:// 和 wss:// 协议，暂不支持自定义子协议。

**Q: 如何调试复杂的嵌套消息？**  
A: 使用消息历史中的"解码嵌套消息"功能，可以逐层解析嵌套的二进制数据。

---

**ProSocket** - 让 WebSocket + Protobuf 调试变得简单高效！
