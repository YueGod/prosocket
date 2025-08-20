<template>
  <div class="proto-manager">
    <div class="manager-header">
      <h3>Proto文件管理</h3>
      <div class="header-actions">
        <el-upload
            ref="uploadRef"
            :auto-upload="false"
            :multiple="true"
            :show-file-list="false"
            accept=".proto"
            :on-change="handleFileChange"
        >
          <el-button type="primary" size="small">
            <el-icon class="el-icon--left">
              <Upload/>
            </el-icon>
            导入Proto
          </el-button>
        </el-upload>
        <el-button size="small" @click="clearAllProtos" :disabled="protoFiles.length === 0">
          <el-icon class="el-icon--left">
            <Delete/>
          </el-icon>
          清空
        </el-button>
      </div>
    </div>

    <div class="proto-content">
      <!-- Proto文件列表 -->
      <div class="proto-files" v-if="protoFiles.length > 0">
        <el-collapse v-model="activeNames">
          <el-collapse-item
              v-for="(proto, index) in protoFiles"
              :key="proto.fileName"
              :name="index"
          >
            <template #title>
              <div class="proto-file-header">
                <el-icon>
                  <Document/>
                </el-icon>
                <span class="file-name">{{ proto.fileName }}</span>
                <el-tag size="small" type="info">{{ proto.messageCount }} 消息</el-tag>
              </div>
            </template>
            <div class="proto-file-content">
              <div class="file-info">
                <span>加载时间: {{ formatDate(proto.loadedAt) }}</span>
                <el-button
                    link
                    type="danger"
                    size="small"
                    @click.stop="removeProto(proto.fileName)"
                >
                  <el-icon>
                    <Delete/>
                  </el-icon>
                  删除
                </el-button>
              </div>
              <div class="message-types">
                <div class="types-header">消息类型:</div>
                <el-tree
                    :data="getProtoMessages(proto.fileName)"
                    :props="treeProps"
                    node-key="id"
                    default-expand-all
                    @node-click="selectMessageType"
                    highlight-current
                >
                  <template #default="{ data }">
                    <div class="tree-node">
                      <el-icon v-if="data.isMessage">
                        <Document/>
                      </el-icon>
                      <el-icon v-else>
                        <FolderOpened/>
                      </el-icon>
                      <span class="node-label">{{ data.label }}</span>
                      <el-tag v-if="data.fieldCount" size="small">
                        {{ data.fieldCount }} 字段
                      </el-tag>
                    </div>
                  </template>
                </el-tree>
              </div>
            </div>
          </el-collapse-item>
        </el-collapse>
      </div>

      <!-- 空状态 -->
      <el-empty
          v-else
          description="暂无Proto文件"
          :image-size="100"
      >
        <el-upload
            :auto-upload="false"
            :multiple="true"
            :show-file-list="false"
            accept=".proto"
            :on-change="handleFileChange"
        >
          <el-button type="primary">
            <el-icon class="el-icon--left">
              <Upload/>
            </el-icon>
            导入Proto文件
          </el-button>
        </el-upload>
      </el-empty>
    </div>

    <!-- 消息类型详情对话框 -->
    <el-dialog
        v-model="detailVisible"
        :title="`消息类型: ${selectedType?.name || ''}`"
        width="600px"
    >
      <div v-if="selectedType" class="type-detail">
        <h4>字段列表</h4>
        <el-table :data="selectedType.fields" stripe>
          <el-table-column prop="name" label="字段名" width="150"/>
          <el-table-column prop="type" label="类型" width="120"/>
          <el-table-column prop="rule" label="规则" width="100">
            <template #default="{ row }">
              <el-tag size="small" :type="getRuleType(row.rule)">
                {{ row.rule }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="id" label="ID" width="60"/>
          <el-table-column label="属性">
            <template #default="{ row }">
              <el-tag v-if="row.repeated" size="small" type="warning">数组</el-tag>
              <el-tag v-if="row.required" size="small" type="danger">必填</el-tag>
              <span v-if="row.defaultValue !== undefined">
                默认: {{ row.defaultValue }}
              </span>
            </template>
          </el-table-column>
        </el-table>

        <div class="template-section">
          <h4>消息模板</h4>
          <el-input
              v-model="messageTemplate"
              type="textarea"
              :rows="8"
              readonly
          />
          <el-button
              type="primary"
              size="small"
              @click="useTemplate"
              style="margin-top: 10px"
          >
            使用此模板
          </el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import {ref} from 'vue'
import {ElMessage, ElMessageBox} from 'element-plus'
import protoManager from '@/utils/protobuf'
import simpleProtoManager from '@/utils/protobuf-simple'

// 使用简化版protobuf管理器
const useSimpleManager = true
const activeProtoManager = useSimpleManager ? simpleProtoManager : protoManager

// 事件定义
// eslint-disable-next-line no-undef
const emit = defineEmits(['select-type', 'use-template', 'proto-loaded'])

// 响应式数据
const protoFiles = ref([])
const activeNames = ref([0])
const selectedType = ref(null)
const detailVisible = ref(false)
const messageTemplate = ref('')

// Tree组件配置
const treeProps = {
  label: 'label',
  children: 'children'
}

// 处理文件选择
const handleFileChange = async (file) => {
  if (!file.raw) return

  try {
    const result = await activeProtoManager.loadProtoFromContent(
        file.name,
        await readFileAsText(file.raw)
    )

    if (result.success) {
      ElMessage.success(`成功加载 ${file.name}`)
      updateProtoFiles()
      // 通知父组件proto文件已加载
      emit('proto-loaded')
    }
  } catch (error) {
    ElMessage.error(`加载失败: ${error.message}`)
  }
}

// 读取文件内容
const readFileAsText = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = reject
    reader.readAsText(file)
  })
}

// 更新proto文件列表
const updateProtoFiles = () => {
  const loaded = activeProtoManager.getLoadedProtos()
  const types = activeProtoManager.getMessageTypes()

  protoFiles.value = loaded.map(proto => ({
    ...proto,
    messageCount: types.filter(t =>
        t.name.startsWith(proto.namespace) || proto.namespace === 'default'
    ).length
  }))
}

// 获取proto的消息类型树
const getProtoMessages = (fileName) => {
  const types = activeProtoManager.getMessageTypes()
  const proto = protoFiles.value.find(p => p.fileName === fileName)

  if (!proto) return []

  // 过滤属于这个proto的消息类型
  const protoTypes = types.filter(t => {
    if (proto.namespace === 'default') {
      // 如果没有命名空间，显示所有没有命名空间的消息
      return !t.name.includes('.')
    }
    return t.name.startsWith(proto.namespace)
  })

  // 构建树形结构
  const tree = []
  const nodeMap = new Map()

  protoTypes.forEach(type => {
    const parts = type.name.split('.')
    const isMessage = true

    // 创建节点
    const node = {
      id: type.name,
      label: parts[parts.length - 1],
      isMessage,
      fieldCount: type.fields ? type.fields.length : 0,
      data: type,
      children: []
    }

    if (parts.length === 1) {
      // 顶级节点
      tree.push(node)
    } else {
      // 嵌套节点
      const parentPath = parts.slice(0, -1).join('.')
      const parent = nodeMap.get(parentPath)

      if (parent) {
        parent.children.push(node)
      } else {
        // 创建父节点
        const parentNode = {
          id: parentPath,
          label: parts[parts.length - 2],
          isMessage: false,
          children: [node]
        }
        tree.push(parentNode)
        nodeMap.set(parentPath, parentNode)
      }
    }

    nodeMap.set(type.name, node)
  })

  return tree
}

// 选择消息类型
const selectMessageType = (data) => {
  if (!data.isMessage) return

  selectedType.value = data.data

  // 生成消息模板
  try {
    const template = activeProtoManager.generateMessageTemplate(data.id)
    messageTemplate.value = JSON.stringify(template, null, 2)
  } catch (error) {
    messageTemplate.value = '{}'
  }

  // 触发事件
  emit('select-type', {
    name: data.id,
    fields: data.data.fields,
    template: messageTemplate.value
  })

  // 显示详情
  detailVisible.value = true
}

// 使用模板
const useTemplate = () => {
  emit('use-template', {
    typeName: selectedType.value.name,
    template: messageTemplate.value
  })
  detailVisible.value = false
  ElMessage.success('已设置消息模板')
}

// 删除proto文件
const removeProto = async (fileName) => {
  try {
    await ElMessageBox.confirm(
        `确定要删除 ${fileName} 吗？`,
        '提示',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
    )

    activeProtoManager.removeProto(fileName)
    updateProtoFiles()
    ElMessage.success('删除成功')
    // 通知父组件proto文件已更新
    emit('proto-loaded')
  } catch (error) {
    // 取消删除
  }
}

// 清空所有proto
const clearAllProtos = async () => {
  try {
    await ElMessageBox.confirm(
        '确定要清空所有Proto文件吗？',
        '提示',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
    )

    activeProtoManager.clear()
    protoFiles.value = []
    ElMessage.success('已清空所有Proto文件')
    // 通知父组件proto文件已更新
    emit('proto-loaded')
  } catch (error) {
    // 取消清空
  }
}

// 格式化日期
const formatDate = (date) => {
  if (!date) return ''
  const d = new Date(date)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`
}

// 获取规则类型
const getRuleType = (rule) => {
  switch (rule) {
    case 'required':
      return 'danger'
    case 'repeated':
      return 'warning'
    case 'optional':
      return 'info'
    default:
      return 'info'
  }
}

// 初始化
updateProtoFiles()
</script>

<style scoped>
.proto-manager {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.manager-header {
  padding: 15px;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.manager-header h3 {
  margin: 0;
  font-size: 16px;
  color: #303133;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.proto-content {
  flex: 1;
  overflow-y: auto;
  padding: 15px;
}

.proto-files {
  height: 100%;
}

.proto-file-header {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.file-name {
  flex: 1;
  font-weight: 500;
}

.proto-file-content {
  padding: 10px;
}

.file-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #ebeef5;
  font-size: 12px;
  color: #909399;
}

.message-types {
  margin-top: 10px;
}

.types-header {
  font-weight: 500;
  margin-bottom: 10px;
  color: #606266;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
}

.node-label {
  flex: 1;
}

.type-detail {
  max-height: 500px;
  overflow-y: auto;
}

.type-detail h4 {
  margin: 15px 0 10px;
  color: #303133;
}

.template-section {
  margin-top: 20px;
}

:deep(.el-collapse-item__header) {
  height: auto;
  line-height: normal;
  padding: 10px 0;
}

:deep(.el-tree-node__content) {
  height: 32px;
}

:deep(.el-tree-node__content:hover) {
  background-color: #f5f7fa;
}

:deep(.el-tree--highlight-current .el-tree-node.is-current > .el-tree-node__content) {
  background-color: #ecf5ff;
}
</style>
