# 嵌套消息使用指南

## 概述

ProSocket 现在支持处理 Protobuf 中的嵌套消息类型。当您的消息定义中包含 `bytes` 字段或直接引用其他消息类型时，系统会自动识别并提供相应的编辑功能。

## 功能特性

### 1. 自动识别嵌套消息

系统会自动识别两种类型的嵌套消息：

- **直接消息类型字段**：如 `UserInfo user = 2;`
- **bytes字段**：可能包含序列化的消息，如 `bytes auth_data = 4;`

### 2. Bytes字段的三种输入模式

对于 `bytes` 类型的字段，系统提供三种输入模式：

1. **原始字节模式**：输入十六进制字节（如：`12 34 AB CD`）
2. **消息类型模式**：选择一个消息类型并编辑其内容
3. **Base64模式**：输入Base64编码的数据

### 3. 嵌套消息编辑器

点击"编辑嵌套消息"按钮，会打开一个专门的JSON编辑器，让您可以：

- 编辑嵌套消息的内容
- 自动生成消息模板
- 验证消息格式

## 使用步骤

### 步骤1：导入Proto文件

导入包含嵌套消息定义的proto文件，例如 `nested-example.proto`：

```proto
message ComplexRequest {
  string request_id = 1;
  UserInfo user = 2;        // 直接的消息类型
  bytes auth_data = 4;       // 可能包含AuthToken
  bytes payload = 5;         // 可能包含任意消息
}
```

### 步骤2：选择主消息类型

在消息编辑器中选择要发送的主消息类型（如 `nested.ComplexRequest`）。

### 步骤3：编辑嵌套字段

#### 对于直接消息类型字段（如 `UserInfo user`）：

1. 点击"编辑 UserInfo"按钮
2. 在弹出的编辑器中输入JSON数据
3. 点击保存

#### 对于bytes字段（如 `bytes auth_data`）：

1. 选择输入模式：
    - **原始字节**：直接输入十六进制数据
    - **消息类型**：选择一个Proto消息类型
    - **Base64**：输入Base64编码的数据

2. 如果选择"消息类型"模式：
    - 从下拉框选择消息类型（如 `nested.AuthToken`）
    - 点击"编辑嵌套消息"
    - 输入消息内容
    - 系统会自动将消息编码为二进制

### 步骤4：发送消息

编辑完成后，点击"发送消息"。系统会：

1. 自动处理所有嵌套消息的编码
2. 将主消息编码为Protobuf二进制格式
3. 通过WebSocket发送

## 示例

### 示例1：简单嵌套消息

```json
{
  "request_id": "req-001",
  "user": {
    "user_id": "12345",
    "username": "testuser",
    "email": "test@example.com",
    "level": 10
  },
  "device": {
    "device_id": "dev-001",
    "device_type": "mobile",
    "os_version": "iOS 15",
    "app_version": "1.0.0"
  },
  "timestamp": 1639500000000
}
```

### 示例2：带有bytes字段的嵌套消息

当 `auth_data` 字段设置为消息类型模式并选择 `AuthToken` 时：

```json
// auth_data 字段的内容（会自动编码为bytes）
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "expires_at": 1639600000000,
  "scopes": [
    "read",
    "write"
  ]
}
```

### 示例3：数组类型的嵌套消息

```json
{
  "character_id": "char-001",
  "name": "Hero",
  "level": 50,
  "inventory": [
    {
      "item_id": "item-001",
      "name": "Sword",
      "quantity": 1,
      "attributes": {
        "damage": 100,
        "durability": 80
      }
    },
    {
      "item_id": "item-002",
      "name": "Shield",
      "quantity": 1,
      "attributes": {
        "defense": 50,
        "durability": 90
      }
    }
  ]
}
```

## 高级功能

### 字段名推断

系统会尝试从字段名推断可能的消息类型。例如：

- `user_data` → 可能对应 `UserData` 或 `UserInfo` 消息
- `auth_token` → 可能对应 `AuthToken` 消息

### 批量处理

对于包含多个bytes字段的消息，您可以为每个字段设置不同的消息类型，系统会分别处理每个嵌套消息的编码。

## 注意事项

1. **消息验证**：在发送前，系统会验证所有嵌套消息的格式是否正确
2. **编码顺序**：嵌套消息会先被编码，然后作为bytes字段嵌入主消息
3. **调试信息**：打开浏览器控制台可以查看消息编码的详细过程

## 故障排除

### 问题：bytes字段没有显示消息类型选项

**解决**：确保已经导入了包含相关消息定义的proto文件

### 问题：嵌套消息编码失败

**解决**：

1. 检查消息格式是否符合proto定义
2. 查看控制台错误信息
3. 确保必填字段都已填写

### 问题：无法识别消息类型字段

**解决**：

1. 刷新消息类型列表（点击刷新按钮）
2. 重新导入proto文件
3. 检查proto文件语法是否正确

## 最佳实践

1. **使用有意义的字段名**：如 `user_data`、`auth_token` 等，便于系统推断消息类型
2. **模块化设计**：将常用的数据结构定义为独立的消息类型
3. **文档注释**：在proto文件中添加注释，说明bytes字段的预期内容
4. **测试验证**：使用测试服务器验证嵌套消息的编解码是否正确
