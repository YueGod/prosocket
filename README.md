# ProSocket

[中文文档](./README_zh.md) | English

## ProSocket - WebSocket Protobuf Debugging Tool

ProSocket is a powerful WebSocket debugging tool built with Vue 3 that specializes in Protocol Buffer message encoding
and decoding. It provides a comprehensive interface for testing WebSocket connections with Protobuf-encoded messages.

### ✨ Features

- **🔌 WebSocket Connection Management**
    - Support for ws:// and wss:// protocols
    - Auto-reconnection mechanism
    - Connection status monitoring
    - Heartbeat detection support
    - Connection configuration persistence

- **📄 Proto File Management**
    - Batch import of .proto files
    - Automatic message type extraction
    - Message type tree view
    - Support for nested message structures
    - Proto file hot-reloading

- **📝 Message Editor**
    - Dual editing modes: Form and JSON
    - Automatic message template generation
    - Field validation
    - Support for nested messages
    - Special handling for bytes fields (raw/message/base64)
    - Array field support
    - Rich data type support (string, number, boolean, bytes, etc.)

- **📊 Message History**
    - Complete sent/received message logging
    - Message filtering and searching
    - Binary data preview (Hex/Base64/Bytes)
    - Message re-decoding capability
    - Export history to JSON
    - Automatic decoding of received messages
    - Nested message detection and decoding

- **🛠️ Developer Tools**
    - Test WebSocket server included
    - Example proto files provided
    - Binary data visualization
    - Message size tracking
    - Decode error handling

### 🚀 Quick Start

#### Prerequisites

- Node.js >= 12.0.0
- npm or yarn

#### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/prosocket.git
cd prosocket

# Install dependencies
npm install

# Start development server
npm run serve

# Build for production
npm run build
```

#### Running the Test Server

```bash
# Install test server dependencies (if needed)
npm install ws protobufjs

# Start the test server
node test-server.js
```

The test server will start on `ws://localhost:8081` and support the example proto messages.

### 📖 Usage Guide

#### 1. Establish WebSocket Connection

1. Enter the WebSocket server address in the connection bar (e.g., `localhost:8080`)
2. Select protocol (ws:// or wss://)
3. Click the "Connect" button
4. The status indicator will show the connection state

#### 2. Import Proto Files

1. Click the "Import Proto" button in the left sidebar
2. Select one or more .proto files
3. The system will automatically parse and extract message types
4. Message types will appear in the tree view

#### 3. Edit Messages

**Form Mode:**

- Select a message type from the dropdown
- Fill in the fields using the form interface
- Nested messages can be edited in a separate dialog
- Arrays support adding/removing items dynamically

**JSON Mode:**

- Edit message content directly in JSON format
- Use the format/validate buttons for assistance
- Support for copy/paste operations

#### 4. Send Messages

1. Choose the message type
2. Edit the message content
3. Click "Send Message"
4. The message will be encoded to Protobuf binary format
5. View the sent message in the history panel

#### 5. View Message History

- All sent and received messages are displayed in the right panel
- Click on any message to view details
- Use filters to search specific messages
- Export history for analysis

### 🏗️ Project Structure

```
prosocket/
├── public/
│   ├── example.proto         # Example proto file
│   └── nested-example.proto  # Nested message examples
├── src/
│   ├── components/
│   │   └── ProSocket/
│   │       ├── ConnectionPanel.vue    # WebSocket connection management
│   │       ├── ProtoManager.vue       # Proto file management
│   │       ├── MessageSender.vue      # Message editor and sender
│   │       └── MessageHistory.vue     # Message history display
│   ├── utils/
│   │   ├── websocket.js              # WebSocket manager
│   │   ├── protobuf.js               # Protobuf handler
│   │   └── protobuf-simple.js        # Simplified protobuf handler
│   ├── views/
│   │   ├── HomeView.vue              # Home page
│   │   └── ProSocketView.vue         # Main ProSocket interface
│   └── main.js                       # Application entry
├── test-server.js                    # Test WebSocket server
└── package.json
```

### 🔧 Configuration

#### WebSocket Configuration

```javascript
// Connection settings
{
    autoReconnect: true,          // Enable auto-reconnection
        maxReconnectAttempts
:
    5,      // Maximum reconnection attempts
        enableHeartbeat
:
    false,       // Enable heartbeat detection
        heartbeatInterval
:
    30         // Heartbeat interval (seconds)
}
```

#### Message Decoding Settings

- **Auto Decode**: Automatically attempt to decode received binary messages
- **Default Message Type**: Set default type for decoding received messages
- **Fallback Types**: Alternative message types to try if default fails

### 🛡️ Supported Proto Features

- ✅ Basic types (string, int32, bool, etc.)
- ✅ Repeated fields (arrays)
- ✅ Nested messages
- ✅ Enums
- ✅ Maps
- ✅ Bytes fields
- ✅ Oneof fields (limited support)
- ✅ Default values

### 💡 Advanced Features

#### Nested Message Handling

For bytes fields that contain encoded messages:

1. Select "Message Type" mode for the bytes field
2. Choose the message type to encode
3. Edit the nested message content
4. The system will automatically encode it to bytes

#### Binary Data Formats

Support for multiple binary data input/output formats:

- **Hexadecimal**: `0x12 0x34 0x56`
- **Base64**: `EjRW`
- **Byte Array**: `[18, 52, 86]`

#### Message Templates

The system automatically generates templates based on proto definitions:

- Default values for all field types
- Empty arrays for repeated fields
- Nested message structures
- Proper initialization of map fields

### 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### 📄 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

### 🙏 Acknowledgments

- [Vue.js](https://vuejs.org/) - The Progressive JavaScript Framework
- [Element Plus](https://element-plus.org/) - Vue 3 UI Framework
- [protobuf.js](https://github.com/protobufjs/protobuf.js) - Protocol Buffers for JavaScript

### 📮 Contact

For issues and suggestions, please use [GitHub Issues](https://github.com/yourusername/prosocket/issues).

### 🔍 FAQ

**Q: Why can't received messages be decoded?**  
A: Make sure you have imported the correct proto files and configured the correct message type in the decoding settings.

**Q: How to handle bytes fields containing nested messages?**  
A: In form mode, set the bytes field to "Message Type" mode, then select the appropriate message type for editing.

**Q: Which WebSocket subprotocols are supported?**  
A: Currently supports standard ws:// and wss:// protocols. Custom subprotocols are not yet supported.

**Q: How to debug complex nested messages?**  
A: Use the "Decode Nested Messages" feature in the message history to parse nested binary data layer by layer.

---

**ProSocket** - Making WebSocket + Protobuf debugging simple and efficient!