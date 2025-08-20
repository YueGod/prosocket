// WebSocket连接管理类
export class WebSocketManager {
    constructor() {
        this.ws = null
        this.url = ''
        this.isConnected = false
        this.reconnectAttempts = 0
        this.maxReconnectAttempts = 5
        this.reconnectTimeout = null
        this.messageHandlers = new Set()
        this.connectionHandlers = new Set()
        this.errorHandlers = new Set()
        this.closeHandlers = new Set()
    }

    // 连接WebSocket
    connect(url) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.warn('WebSocket already connected')
            return Promise.resolve()
        }

        this.url = url

        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(url)
                this.ws.binaryType = 'arraybuffer' // 用于处理二进制数据

                this.ws.onopen = () => {
                    console.log('WebSocket connected to:', url)
                    this.isConnected = true
                    this.reconnectAttempts = 0
                    this.notifyConnectionHandlers(true)
                    resolve()
                }

                this.ws.onmessage = (event) => {
                    this.handleMessage(event.data)
                }

                this.ws.onerror = (error) => {
                    console.error('WebSocket error:', error)
                    this.notifyErrorHandlers(error)
                    reject(error)
                }

                this.ws.onclose = (event) => {
                    console.log('WebSocket closed:', event.code, event.reason)
                    this.isConnected = false
                    this.notifyConnectionHandlers(false)
                    this.notifyCloseHandlers(event)

                    // 自动重连逻辑
                    if (this.reconnectAttempts < this.maxReconnectAttempts && !event.wasClean) {
                        this.scheduleReconnect()
                    }
                }
            } catch (error) {
                console.error('Failed to create WebSocket:', error)
                reject(error)
            }
        })
    }

    // 断开连接
    disconnect() {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout)
            this.reconnectTimeout = null
        }

        if (this.ws) {
            this.ws.close(1000, 'User disconnected')
            this.ws = null
        }
        this.isConnected = false
        this.reconnectAttempts = 0
    }

    // 发送二进制数据
    sendBinary(data) {
        if (!this.isConnected || !this.ws) {
            throw new Error('WebSocket is not connected')
        }

        if (!(data instanceof ArrayBuffer) && !(data instanceof Uint8Array)) {
            throw new Error('Data must be ArrayBuffer or Uint8Array')
        }

        try {
            this.ws.send(data)
            return true
        } catch (error) {
            console.error('Failed to send binary data:', error)
            throw error
        }
    }

    // 发送文本数据（用于调试）
    sendText(text) {
        if (!this.isConnected || !this.ws) {
            throw new Error('WebSocket is not connected')
        }

        try {
            this.ws.send(text)
            return true
        } catch (error) {
            console.error('Failed to send text data:', error)
            throw error
        }
    }

    // 处理接收到的消息
    handleMessage(data) {
        this.messageHandlers.forEach(handler => {
            try {
                handler(data)
            } catch (error) {
                console.error('Message handler error:', error)
            }
        })
    }

    // 注册消息处理器
    onMessage(handler) {
        this.messageHandlers.add(handler)
        return () => this.messageHandlers.delete(handler)
    }

    // 注册连接状态处理器
    onConnectionChange(handler) {
        this.connectionHandlers.add(handler)
        return () => this.connectionHandlers.delete(handler)
    }

    // 注册错误处理器
    onError(handler) {
        this.errorHandlers.add(handler)
        return () => this.errorHandlers.delete(handler)
    }

    // 注册关闭处理器
    onClose(handler) {
        this.closeHandlers.add(handler)
        return () => this.closeHandlers.delete(handler)
    }

    // 通知连接状态变化
    notifyConnectionHandlers(isConnected) {
        this.connectionHandlers.forEach(handler => {
            try {
                handler(isConnected)
            } catch (error) {
                console.error('Connection handler error:', error)
            }
        })
    }

    // 通知错误
    notifyErrorHandlers(error) {
        this.errorHandlers.forEach(handler => {
            try {
                handler(error)
            } catch (error) {
                console.error('Error handler error:', error)
            }
        })
    }

    // 通知关闭
    notifyCloseHandlers(event) {
        this.closeHandlers.forEach(handler => {
            try {
                handler(event)
            } catch (error) {
                console.error('Close handler error:', error)
            }
        })
    }

    // 安排重连
    scheduleReconnect() {
        this.reconnectAttempts++
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000)

        console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`)

        this.reconnectTimeout = setTimeout(() => {
            this.connect(this.url).catch(error => {
                console.error('Reconnect failed:', error)
            })
        }, delay)
    }

    // 获取连接状态
    getState() {
        if (!this.ws) return 'DISCONNECTED'

        switch (this.ws.readyState) {
            case WebSocket.CONNECTING:
                return 'CONNECTING'
            case WebSocket.OPEN:
                return 'CONNECTED'
            case WebSocket.CLOSING:
                return 'CLOSING'
            case WebSocket.CLOSED:
                return 'DISCONNECTED'
            default:
                return 'UNKNOWN'
        }
    }

    // 清理资源
    destroy() {
        this.disconnect()
        this.messageHandlers.clear()
        this.connectionHandlers.clear()
        this.errorHandlers.clear()
        this.closeHandlers.clear()
    }
}

// 创建单例实例
export const wsManager = new WebSocketManager()

export default wsManager
