import * as protobuf from 'protobufjs'

// 简化版的Protobuf处理工具类
export class SimpleProtobufManager {
    constructor() {
        this.roots = [] // 存储所有加载的root
        this.messageTypes = new Map() // 存储消息类型
        this.loadedProtos = new Map() // 存储已加载的proto文件
    }

    // 从文件内容加载proto（简化版）
    async loadProtoFromContent(fileName, content) {
        try {
            console.log(`[SimpleProtobuf] Loading proto file: ${fileName}`)

            // 使用protobufjs的parse方法
            const parseResult = protobuf.parse(content)

            if (parseResult.root) {
                // 保存root
                this.roots.push(parseResult.root)

                // 存储加载的proto信息
                this.loadedProtos.set(fileName, {
                    fileName,
                    content,
                    loadedAt: new Date(),
                    root: parseResult.root
                })

                // 提取消息类型
                this.extractAllMessageTypes()

                console.log(`[SimpleProtobuf] Loaded ${fileName} successfully with ${this.messageTypes.size} message types`)

                return {
                    success: true,
                    fileName,
                    messageCount: this.messageTypes.size
                }
            }
        } catch (error) {
            console.error('[SimpleProtobuf] Failed to load proto:', error)
            throw error
        }
    }

    // 提取所有消息类型
    extractAllMessageTypes() {
        this.messageTypes.clear()

        // 遍历所有root
        this.roots.forEach(root => {
            this.extractTypesFromRoot(root)
        })

        console.log(`[SimpleProtobuf] Total types found: ${this.messageTypes.size}`)

        if (this.messageTypes.size > 0) {
            console.log('[SimpleProtobuf] Message types:')
            this.messageTypes.forEach((type, name) => {
                console.log(`  - ${name}`)
            })
        }
    }

    // 从一个root提取类型
    extractTypesFromRoot(root) {
        const extract = (obj, prefix = '') => {
            if (!obj) return

            // 如果有nested属性，遍历它
            if (obj.nested) {
                Object.keys(obj.nested).forEach(key => {
                    const item = obj.nested[key]
                    const fullName = prefix ? `${prefix}.${key}` : key

                    // 如果有fields属性，说明是一个消息类型
                    if (item && item.fields) {
                        console.log(`[SimpleProtobuf] Found type: ${fullName}`)
                        // 尝试从root获取实际的Type对象
                        try {
                            const type = root.lookupType(fullName)
                            this.messageTypes.set(fullName, type)
                        } catch (e) {
                            // 如果lookup失败，直接存储item
                            this.messageTypes.set(fullName, item)
                        }
                    }

                    // 递归处理嵌套
                    extract(item, fullName)
                })
            }

            // 如果有nestedArray属性，也遍历它
            if (obj.nestedArray) {
                obj.nestedArray.forEach(item => {
                    const fullName = prefix ? `${prefix}.${item.name}` : item.name

                    if (item && item.fields) {
                        console.log(`[SimpleProtobuf] Found type (via nestedArray): ${fullName}`)
                        this.messageTypes.set(fullName, item)
                    }

                    extract(item, fullName)
                })
            }
        }

        extract(root)
    }

    // 获取所有消息类型列表
    getMessageTypes() {
        const types = []

        this.messageTypes.forEach((type, name) => {
            const fields = []

            if (type.fields) {
                Object.keys(type.fields).forEach(fieldName => {
                    const field = type.fields[fieldName]
                    fields.push({
                        name: fieldName,
                        type: field.type,
                        rule: field.rule || 'optional',
                        id: field.id,
                        defaultValue: field.defaultValue,
                        repeated: field.repeated || false,
                        required: field.required || false
                    })
                })
            } else if (type.fieldsArray) {
                // 使用fieldsArray如果fields不可用
                type.fieldsArray.forEach(field => {
                    fields.push({
                        name: field.name,
                        type: field.type,
                        rule: field.rule || 'optional',
                        id: field.id,
                        defaultValue: field.defaultValue,
                        repeated: field.repeated || false,
                        required: field.required || false
                    })
                })
            }

            types.push({
                name,
                fields
            })
        })

        console.log(`[SimpleProtobuf] Returning ${types.length} message types`)
        return types
    }

    // 获取消息类型
    getMessageType(typeName) {
        // 先从缓存获取
        if (this.messageTypes.has(typeName)) {
            return this.messageTypes.get(typeName)
        }

        // 尝试从所有root中查找
        for (const root of this.roots) {
            try {
                const type = root.lookupType(typeName)
                if (type) {
                    return type
                }
            } catch (e) {
                // 继续尝试下一个root
            }
        }

        return null
    }

    // 编码消息
    encodeMessage(typeName, data) {
        const MessageType = this.getMessageType(typeName)

        if (!MessageType) {
            throw new Error(`Message type ${typeName} not found`)
        }

        try {
            // 如果MessageType有create和encode方法，使用它们
            if (MessageType.create && MessageType.encode) {
                const message = MessageType.create(data)
                return MessageType.encode(message).finish()
            } else {
                // 否则尝试使用root的方法
                for (const root of this.roots) {
                    try {
                        const type = root.lookupType(typeName)
                        if (type) {
                            const message = type.create(data)
                            return type.encode(message).finish()
                        }
                    } catch (e) {
                        // 继续尝试
                    }
                }
                throw new Error('Cannot encode message')
            }
        } catch (error) {
            console.error(`[SimpleProtobuf] Failed to encode ${typeName}:`, error)
            throw error
        }
    }

    // 解码消息
    decodeMessage(typeName, buffer) {
        const MessageType = this.getMessageType(typeName)

        if (!MessageType) {
            throw new Error(`Message type ${typeName} not found`)
        }

        try {
            if (buffer instanceof ArrayBuffer) {
                buffer = new Uint8Array(buffer)
            }

            // 如果MessageType有decode方法，使用它
            if (MessageType.decode && MessageType.toObject) {
                const message = MessageType.decode(buffer)
                return MessageType.toObject(message, {
                    longs: String,
                    enums: String,
                    bytes: String,
                    defaults: true
                })
            } else {
                // 否则尝试使用root的方法
                for (const root of this.roots) {
                    try {
                        const type = root.lookupType(typeName)
                        if (type) {
                            const message = type.decode(buffer)
                            return type.toObject(message, {
                                longs: String,
                                enums: String,
                                bytes: String,
                                defaults: true
                            })
                        }
                    } catch (e) {
                        // 继续尝试
                    }
                }
                throw new Error('Cannot decode message')
            }
        } catch (error) {
            console.error(`[SimpleProtobuf] Failed to decode ${typeName}:`, error)
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
        const fields = MessageType.fields || MessageType.fieldsArray

        if (fields) {
            const processFields = (fieldsObj) => {
                if (Array.isArray(fieldsObj)) {
                    // fieldsArray
                    fieldsObj.forEach(field => {
                        if (field.repeated) {
                            template[field.name] = []
                        } else {
                            template[field.name] = this.getDefaultValue(field.type)
                        }
                    })
                } else {
                    // fields object
                    Object.keys(fieldsObj).forEach(fieldName => {
                        const field = fieldsObj[fieldName]
                        if (field.repeated) {
                            template[fieldName] = []
                        } else {
                            template[fieldName] = this.getDefaultValue(field.type)
                        }
                    })
                }
            }

            processFields(fields)
        }

        return template
    }

    // 获取字段的默认值
    getDefaultValue(type) {
        switch (type) {
            case 'string':
                return ''
            case 'bool':
                return false
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
                return 0
            case 'float':
            case 'double':
                return 0.0
            case 'bytes':
                return []
            default:
                // 可能是另一个消息类型
                if (this.messageTypes.has(type)) {
                    return this.generateMessageTemplate(type)
                }
                return null
        }
    }

    // 检查字段是否是消息类型
    isMessageType(type) {
        // 检查是否是已知的消息类型
        return this.messageTypes.has(type)
    }

    // 获取字段的详细信息
    getFieldInfo(field) {
        const info = {
            name: field.name,
            type: field.type,
            rule: field.rule || 'optional',
            id: field.id,
            defaultValue: field.defaultValue,
            repeated: field.repeated || false,
            required: field.required || false,
            isMessage: false,
            isBytesWithMessage: false,
            resolvedType: null
        }

        // 检查是否是消息类型
        if (this.isMessageType(field.type)) {
            info.isMessage = true
            info.resolvedType = field.type
        }

        // 如果是bytes类型，标记可能包含消息
        if (field.type === 'bytes') {
            info.isBytesWithMessage = true
            // 尝试从字段名推断消息类型
            // 例如：user_data 可能对应 UserData 消息
            const possibleType = this.inferMessageTypeFromFieldName(field.name)
            if (possibleType) {
                info.resolvedType = possibleType
            }
        }

        return info
    }

    // 从字段名推断消息类型
    inferMessageTypeFromFieldName(fieldName) {
        // 转换 snake_case 到 PascalCase
        const pascalCase = fieldName.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase())
            .replace(/^[a-z]/, letter => letter.toUpperCase())

        // 查找匹配的消息类型
        for (const [typeName] of this.messageTypes) {
            // 简单匹配
            if (typeName.toLowerCase().includes(fieldName.toLowerCase().replace(/_/g, ''))) {
                return typeName
            }
            // PascalCase匹配
            if (typeName.endsWith(pascalCase)) {
                return typeName
            }
        }

        return null
    }

    // 验证消息
    validateMessage(typeName, data) {
        const MessageType = this.getMessageType(typeName)

        if (!MessageType) {
            return {
                valid: false,
                error: `Message type ${typeName} not found`
            }
        }

        if (MessageType.verify) {
            const errMsg = MessageType.verify(data)
            if (errMsg) {
                return {
                    valid: false,
                    error: errMsg
                }
            }
        }

        return {
            valid: true,
            error: null
        }
    }

    // 清空所有数据
    clear() {
        this.roots = []
        this.messageTypes.clear()
        this.loadedProtos.clear()
    }

    // 获取已加载的proto文件列表
    getLoadedProtos() {
        return Array.from(this.loadedProtos.values())
    }
}

// 创建单例实例
export const simpleProtoManager = new SimpleProtobufManager()

export default simpleProtoManager
