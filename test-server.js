// 测试用的WebSocket服务器
// 使用方法: node test-server.js

const WebSocket = require('ws');
const protobuf = require('protobufjs');
const path = require('path');

// 创建WebSocket服务器
const wss = new WebSocket.Server({port: 8081});

console.log('WebSocket测试服务器已启动在 ws://localhost:8081');
console.log('等待客户端连接...\n');

// 加载proto文件
let root = null;
protobuf.load(path.join(__dirname, 'public', 'example.proto'), (err, loadedRoot) => {
    if (err) {
        console.error('Failed to load proto file:', err);
        return;
    }
    root = loadedRoot;
    console.log('Proto文件已加载\n');
});

// 处理客户端连接
wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress;
    console.log(`[${new Date().toISOString()}] 客户端连接: ${clientIp}`);

    // 处理接收到的消息
    ws.on('message', (data) => {
        console.log(`[${new Date().toISOString()}] 收到消息 (${data.length} bytes)`);

        // 处理心跳
        if (data.toString() === 'ping') {
            ws.send('pong');
            console.log('-> 回复心跳: pong');
            return;
        }

        // 尝试解码Protobuf消息
        if (root && data instanceof Buffer) {
            tryDecodeMessage(data, ws);
        } else {
            // 处理文本消息
            console.log('收到文本消息:', data.toString());

            // 回显消息
            const response = {
                type: 'echo',
                message: data.toString(),
                timestamp: Date.now()
            };
            ws.send(JSON.stringify(response));
        }
    });

    // 处理连接关闭
    ws.on('close', () => {
        console.log(`[${new Date().toISOString()}] 客户端断开连接: ${clientIp}\n`);
    });

    // 处理错误
    ws.on('error', (err) => {
        console.error(`[${new Date().toISOString()}] WebSocket错误:`, err);
    });

    // 发送欢迎消息
    const welcomeMsg = {
        type: 'welcome',
        message: 'Connected to ProSocket test server',
        serverTime: new Date().toISOString()
    };
    ws.send(JSON.stringify(welcomeMsg));
});

// 尝试解码Protobuf消息
function tryDecodeMessage(data, ws) {
    const messageTypes = [
        'example.LoginRequest',
        'example.LoginResponse',
        'example.ChatMessage',
        'example.Request',
        'example.Response',
        'example.Heartbeat',
        'example.User'
    ];

    for (const typeName of messageTypes) {
        try {
            const MessageType = root.lookupType(typeName);
            const message = MessageType.decode(data);
            const object = MessageType.toObject(message, {
                longs: String,
                enums: String,
                bytes: String,
                defaults: true
            });

            console.log(`成功解码为 ${typeName}:`, JSON.stringify(object, null, 2));

            // 根据消息类型生成响应
            const response = generateResponse(typeName, object);
            if (response) {
                ws.send(response);
                console.log('-> 发送响应');
            }

            return;
        } catch (err) {
            // 继续尝试下一个类型
        }
    }

    console.log('无法解码消息，原始数据:', data.toString('hex'));
}

// 根据请求生成响应
function generateResponse(typeName, message) {
    try {
        switch (typeName) {
            case 'example.LoginRequest': {
                // 生成登录响应
                const LoginResponse = root.lookupType('example.LoginResponse');
                const User = root.lookupType('example.User');
                const UserProfile = root.lookupType('example.UserProfile');

                const profile = UserProfile.create({
                    firstName: 'Test',
                    lastName: 'User',
                    age: 25,
                    avatarUrl: 'https://example.com/avatar.jpg',
                    bio: 'Test user account'
                });

                const user = User.create({
                    id: 12345,
                    username: message.username,
                    email: message.username + '@example.com',
                    isActive: true,
                    roles: ['user', 'admin'],
                    profile: profile
                });

                const response = LoginResponse.create({
                    success: true,
                    token: 'test-token-' + Date.now(),
                    user: user,
                    message: 'Login successful'
                });

                return LoginResponse.encode(response).finish();
            }

            case 'example.ChatMessage': {
                // 回显聊天消息
                const ChatMessage = root.lookupType('example.ChatMessage');
                const response = ChatMessage.create({
                    id: Date.now(),
                    senderId: 0, // 服务器
                    receiverId: message.senderId,
                    content: 'Echo: ' + message.content,
                    type: message.type,
                    timestamp: Date.now(),
                    isRead: false,
                    attachments: []
                });

                return ChatMessage.encode(response).finish();
            }

            case 'example.Heartbeat': {
                // 回复心跳
                const Heartbeat = root.lookupType('example.Heartbeat');
                const response = Heartbeat.create({
                    timestamp: Date.now(),
                    clientId: message.clientId
                });

                return Heartbeat.encode(response).finish();
            }

            case 'example.Request': {
                // 通用响应
                const Response = root.lookupType('example.Response');
                const response = Response.create({
                    code: 200,
                    message: 'Success',
                    data: Buffer.from(JSON.stringify({action: message.action})),
                    metadata: {
                        'server': 'test-server',
                        'timestamp': Date.now().toString()
                    }
                });

                return Response.encode(response).finish();
            }

            default:
                return null;
        }
    } catch (err) {
        console.error('生成响应失败:', err);
        return null;
    }
}

// 定期发送通知消息（模拟服务器推送）
setInterval(() => {
    if (root && wss.clients.size > 0) {
        try {
            const Notification = root.lookupType('example.Notification');
            const notification = Notification.create({
                id: 'notif-' + Date.now(),
                title: '系统通知',
                body: '这是一条来自服务器的测试通知',
                icon: 'info',
                url: 'https://example.com',
                createdAt: Date.now(),
                isRead: false
            });

            const buffer = Notification.encode(notification).finish();

            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(buffer);
                }
            });

            console.log(`[${new Date().toISOString()}] 广播通知消息到 ${wss.clients.size} 个客户端`);
        } catch (err) {
            console.error('发送通知失败:', err);
        }
    }
}, 30000); // 每30秒发送一次

console.log('提示: 可以使用 ProSocket 工具连接到 ws://localhost:8081 进行测试');
console.log('支持的Proto消息类型:');
console.log('- LoginRequest/LoginResponse');
console.log('- ChatMessage');
console.log('- Heartbeat');
console.log('- Request/Response');
console.log('- Notification (服务器推送)\n');
