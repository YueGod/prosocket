import * as protobuf from 'protobufjs'

// Protobuf处理工具类
export class ProtobufManager {
    constructor() {
        this.root = new protobuf.Root()
        this.loadedProtos = new Map() // 存储已加载的proto文件
        this.messageTypes = new Map() // 存储消息类型
    }

    // 从文件内容加载proto
    async loadProtoFromContent(fileName, content) {
        try {
            console.log(`Loading proto file: ${fileName}`)

            // 直接使用Root.fromDescriptor来加载proto
            const root = protobuf.Root.fromJSON(protobuf.parse(content, {keepCase: true}).root.toJSON())

            if (root) {
                // 如果是第一个文件，直接使用它作为root
                if (this.loadedProtos.size === 0) {
                    this.root = root
                } else {
                    // 否则合并到现有的root
                    this.root.add(root)
                }

                // 存储加载的proto信息
                this.loadedProtos.set(fileName, {
                    fileName,
                    content,
                    loadedAt: new Date(),
                    namespace: root.nested ? Object.keys(root.nested)[0] : 'default'
                })

                console.log('Proto file parsed, extracting message types...')
                // 提取所有消息类型
                this.extractMessageTypes()

                console.log(`Proto file ${fileName} loaded successfully with ${this.messageTypes.size} message types`)

                return {
                    success: true,
                    fileName,
                    messageCount: this.messageTypes.size
                }
            }
        } catch (error) {
            console.error('Failed to load proto:', error)
            throw new Error(`Failed to load proto file ${fileName}: ${error.message}`)
        }
    }

    // 批量加载proto文件
    async loadProtoFiles(files) {
        const results = []

        for (const file of files) {
            try {
                const content = await this.readFileContent(file)
                const result = await this.loadProtoFromContent(file.name, content)
                results.push(result)
            } catch (error) {
                results.push({
                    success: false,
                    fileName: file.name,
                    error: error.message
                })
            }
        }

        return results
    }

    // 读取文件内容
    readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()

            reader.onload = (e) => {
                resolve(e.target.result)
            }

            reader.onerror = (error) => {
                reject(error)
            }

            reader.readAsText(file)
        })
    }

    // 提取所有消息类型
    extractMessageTypes() {
        this.messageTypes.clear()
        console.log('Starting to extract message types...')
        console.log('Root object:', this.root)
        console.log('Root nested:', this.root.nested)

        // 使用递归函数提取所有类型
        const extractTypes = (current, prefix = '') => {
            if (!current) return

            // 如果current有nestedArray，使用它（这是protobufjs的内部属性）
            if (current.nestedArray) {
                current.nestedArray.forEach(nested => {
                    const fullName = prefix ? `${prefix}.${nested.name}` : nested.name

                    if (nested instanceof protobuf.Type || (nested && nested.fields)) {
                        // 这是一个消息类型
                        this.messageTypes.set(fullName, nested)
                        console.log('Found message type (via nestedArray):', fullName)
                    }

                    // 递归处理
                    if (nested.nested || nested.nestedArray) {
                        extractTypes(nested, fullName)
                    }
                })
            }

            // 如果有nested对象，也处理它
            if (current.nested) {
                Object.keys(current.nested).forEach(key => {
                    const nested = current.nested[key]
                    const fullName = prefix ? `${prefix}.${key}` : key

                    // 检查是否是Type（消息类型）
                    if (nested instanceof protobuf.Type || (nested && nested.fields && typeof nested.fields === 'object')) {
                        this.messageTypes.set(fullName, nested)
                        console.log('Found message type (via nested):', fullName, 'fields:', Object.keys(nested.fields || {}))
                    }

                    // 递归处理嵌套的命名空间
                    extractTypes(nested, fullName)
                })
            }
        }

        extractTypes(this.root)

        // 如果还是没有找到，尝试使用root的lookupType方法
        if (this.messageTypes.size === 0 && this.root.nested) {
            console.log('Trying alternative method to find types...')

            const findAllTypes = (obj, prefix = '') => {
                Object.keys(obj).forEach(key => {
                    const fullName = prefix ? `${prefix}.${key}` : key
                    try {
                        const type = this.root.lookupType(fullName)
                        if (type) {
                            this.messageTypes.set(fullName, type)
                            console.log('Found type via lookup:', fullName)
                        }
                    } catch (e) {
                        // Not a type, check if it has nested items
                        if (obj[key] && obj[key].nested) {
                            findAllTypes(obj[key].nested, fullName)
                        }
                    }
                })
            }

            findAllTypes(this.root.nested)
        }

        console.log('Total message types extracted:', this.messageTypes.size)

        // 打印所有找到的消息类型
        if (this.messageTypes.size > 0) {
            console.log('Message types found:')
            this.messageTypes.forEach((type, name) => {
                console.log(`  - ${name}`)
            })
        } else {
            console.log('WARNING: No message types found!')
            console.log('Root structure:', JSON.stringify(this.root.toJSON(), null, 2))
        }
    }

    // 获取所有消息类型列表
    getMessageTypes() {
        const types = []

        this.messageTypes.forEach((type, name) => {
            types.push({
                name,
                fields: this.getMessageFields(type)
            })
        })

        console.log('getMessageTypes returning:', types.length, 'types')
        return types
    }

    // 获取消息的字段信息
    getMessageFields(messageType) {
        const fields = []

        if (messageType.fields) {
            Object.keys(messageType.fields).forEach(fieldName => {
                const field = messageType.fields[fieldName]
                fields.push({
                    name: fieldName,
                    type: field.type,
                    rule: field.rule || 'optional',
                    id: field.id,
                    defaultValue: field.defaultValue,
                    repeated: field.repeated || false,
                    required: field.required || false,
                    options: field.options || {}
                })
            })
        }

        return fields
    }

    // 根据消息类型名称获取消息类型
    getMessageType(typeName) {
        // 先尝试从缓存中获取
        if (this.messageTypes.has(typeName)) {
            return this.messageTypes.get(typeName)
        }

        // 尝试从root中查找
        try {
            const type = this.root.lookupType(typeName)
            return type
        } catch (error) {
            console.error(`Message type ${typeName} not found:`, error)
            return null
        }
    }

    // 编码消息为二进制
    encodeMessage(typeName, data) {
        const MessageType = this.getMessageType(typeName)

        if (!MessageType) {
            throw new Error(`Message type ${typeName} not found`)
        }

        try {
            // 验证消息数据
            const errMsg = MessageType.verify(data)
            if (errMsg) {
                throw new Error(`Validation error: ${errMsg}`)
            }

            // 创建消息实例
            const message = MessageType.create(data)

            // 编码为二进制
            const buffer = MessageType.encode(message).finish()

            return buffer
        } catch (error) {
            console.error(`Failed to encode message ${typeName}:`, error)
            throw error
        }
    }

    // 解码二进制消息
    decodeMessage(typeName, buffer) {
        const MessageType = this.getMessageType(typeName)

        if (!MessageType) {
            throw new Error(`Message type ${typeName} not found`)
        }

        try {
            // 确保buffer是Uint8Array类型
            if (buffer instanceof ArrayBuffer) {
                buffer = new Uint8Array(buffer)
            }

            // 解码消息
            const message = MessageType.decode(buffer)

            // 转换为普通对象
            const object = MessageType.toObject(message, {
                longs: String,
                enums: String,
                bytes: String,
                defaults: true
            })

            return object
        } catch (error) {
            console.error(`Failed to decode message ${typeName}:`, error)
            throw error
        }
    }

    // 生成消息模板
    generateMessageTemplate(typeName) {
        const MessageType = this.getMessageType(typeName)

        if (!MessageType) {
            throw new Error(`Message type ${typeName} not found`)
        }

        const template = {}

        if (MessageType.fields) {
            Object.keys(MessageType.fields).forEach(fieldName => {
                const field = MessageType.fields[fieldName]

                // 根据字段类型生成默认值
                if (field.repeated) {
                    template[fieldName] = []
                } else {
                    switch (field.type) {
                        case 'string':
                            template[fieldName] = ''
                            break
                        case 'bool':
                            template[fieldName] = false
                            break
                        case 'int32':
                        case 'uint32':
                        case 'sint32':
                        case 'fixed32':
                        case 'sfixed32':
                        case 'int64':
                        case 'uint64':
                        case 'sint64':
                        case 'fixed64':
                        case 'sfixed64':
                            template[fieldName] = 0
                            break
                        case 'float':
                        case 'double':
                            template[fieldName] = 0.0
                            break
                        case 'bytes':
                            template[fieldName] = []
                            break
                        default:
                            // 可能是嵌套的消息类型
                            if (this.messageTypes.has(field.type)) {
                                template[fieldName] = this.generateMessageTemplate(field.type)
                            } else {
                                template[fieldName] = null
                            }
                    }
                }

                // 如果有默认值，使用默认值
                if (field.defaultValue !== undefined) {
                    template[fieldName] = field.defaultValue
                }
            })
        }

        return template
    }

    // 清空所有加载的proto
    clear() {
        this.root = new protobuf.Root()
        this.loadedProtos.clear()
        this.messageTypes.clear()
    }

    // 获取已加载的proto文件列表
    getLoadedProtos() {
        return Array.from(this.loadedProtos.values())
    }

    // 删除指定的proto文件
    removeProto(fileName) {
        if (this.loadedProtos.has(fileName)) {
            this.loadedProtos.delete(fileName)

            // 重新加载所有剩余的proto
            this.reloadAllProtos()

            return true
        }

        return false
    }

    // 重新加载所有proto
    async reloadAllProtos() {
        this.root = new protobuf.Root()
        this.messageTypes.clear()

        for (const protoInfo of this.loadedProtos.values()) {
            try {
                const parsed = protobuf.parse(protoInfo.content)
                if (parsed.root) {
                    this.root = this.root.addJSON(parsed.root.toJSON())
                }
            } catch (error) {
                console.error(`Failed to reload proto ${protoInfo.fileName}:`, error)
            }
        }

        this.extractMessageTypes()
    }

    // 验证JSON数据是否符合消息格式
    validateMessage(typeName, data) {
        const MessageType = this.getMessageType(typeName)

        if (!MessageType) {
            return {
                valid: false,
                error: `Message type ${typeName} not found`
            }
        }

        const errMsg = MessageType.verify(data)

        if (errMsg) {
            return {
                valid: false,
                error: errMsg
            }
        }

        return {
            valid: true,
            error: null
        }
    }
}

// 创建单例实例
export const protoManager = new ProtobufManager()

export default protoManager
