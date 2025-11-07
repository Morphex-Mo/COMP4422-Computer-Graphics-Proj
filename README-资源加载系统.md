# 资源加载系统 - 项目更新说明

## 新增内容概述

本次更新为项目添加了一套完整的资源加载和场景管理系统，支持异步加载各种资源并在加载完成后进入"场景"或"关卡"。

## 新增文件

### 核心模块 (`src/core/`)

1. **ResourceLoader.ts** - 资源加载器
   - 支持加载：图片、音频、视频、脚本、Three.js纹理、3D模型(GLTF/FBX/OBJ)、Shader、JSON、字体
   - 提供统一的加载接口和进度跟踪
   - 支持超时控制和错误处理

2. **SceneManager.ts** - 场景管理器
   - 管理场景的注册、加载和切换
   - 自动处理场景的进入和退出
   - 跟踪当前场景状态

3. **SceneLoader.ts** - 场景加载包装器
   - 提供简化的API：`defineScene()` 和 `createLevelLoader()`
   - 内置加载UI创建函数：`createLoadingUI()`
   - 支持声明式的资源配置

### 示例文件 (`src/examples/`)

1. **sceneLoaderDemo.ts** - 完整的使用示例
   - 展示如何定义场景
   - 展示如何加载资源
   - 展示如何创建加载UI

2. **testScene.ts** - 简单测试场景
   - 不需要外部资源的测试场景
   - 可直接运行验证系统功能
   - 包含带UI和不带UI两个版本

### 文档文件

1. **资源加载器使用文档.md** - 完整的使用文档
   - 详细的API说明
   - 多个使用示例
   - 最佳实践建议

2. **资源加载器快速开始.md** - 快速入门指南
   - 简单的入门示例
   - 常见问题解答
   - 快速参考

3. **README-资源加载系统.md** - 本文件
   - 系统概述
   - 快速开始
   - 架构说明

## 快速开始

### 1. 运行测试场景

启动开发服务器后，在浏览器控制台中运行：

```javascript
// 简单测试场景（不带加载UI）
window.startSimpleTest()

// 带加载UI的测试场景
window.startTestWithUI()
```

### 2. 创建你的第一个场景

```typescript
import { defineScene } from './core';

const myScene = defineScene({
    id: 'my_scene',
    name: '我的场景',
    resources: {
        textures: {
            'ground': '/textures/ground.jpg'
        },
        gltfModels: {
            'player': '/models/player.gltf'
        }
    },
    main: async (resources) => {
        const groundTexture = resources.get('ground');
        const playerModel = resources.get('player');
        // 初始化场景...
    }
});

// 启动场景
myScene();
```

## 系统架构

```
资源加载系统
├── ResourceLoader (底层加载器)
│   ├── 图片加载
│   ├── 音视频加载
│   ├── Three.js资源加载
│   │   ├── 纹理
│   │   ├── 立方体纹理
│   │   ├── GLTF/FBX/OBJ模型
│   │   └── 字体
│   ├── Shader文件加载
│   └── JSON数据加载
│
├── SceneManager (场景管理)
│   ├── 场景注册
│   ├── 场景切换
│   ├── 资源加载协调
│   └── 生命周期管理
│
└── SceneLoader (便捷API)
    ├── defineScene() - 定义场景
    ├── createLevelLoader() - 创建关卡加载器
    └── createLoadingUI() - 创建加载UI
```

## 主要特性

### 1. 支持多种资源类型

- ✅ 图片 (Image)
- ✅ 音频 (Audio)
- ✅ 视频 (Video)
- ✅ JavaScript脚本 (Script)
- ✅ Three.js纹理 (Texture)
- ✅ 立方体纹理/天空盒 (CubeTexture)
- ✅ GLTF/GLB 3D模型
- ✅ FBX 3D模型
- ✅ OBJ 3D模型
- ✅ GLSL Shader文件
- ✅ JSON数据文件
- ✅ Three.js字体文件

### 2. 异步资源加载

- Promise-based API
- 支持加载进度跟踪
- 支持超时控制
- 支持错误处理

### 3. 场景管理

- 声明式场景定义
- 自动资源加载
- 场景生命周期管理 (onEnter/onExit)
- 场景切换

### 4. 用户体验

- 内置加载进度UI
- 可自定义进度显示
- 平滑的过渡动画

## 使用场景

### 场景1：游戏关卡加载

```typescript
import { defineScene } from './core';

const level1 = defineScene({
    id: 'level1',
    name: '第一关',
    resources: {
        textures: { /* ... */ },
        gltfModels: { /* ... */ }
    },
    main: async (resources) => {
        // 关卡逻辑
    }
});

// 开始游戏
level1();
```

### 场景2：多关卡系统

```typescript
// 定义多个关卡
const level1 = defineScene({ /* ... */ });
const level2 = defineScene({ /* ... */ });
const level3 = defineScene({ /* ... */ });

// 关卡选择界面
function selectLevel(levelNumber) {
    switch(levelNumber) {
        case 1: level1(); break;
        case 2: level2(); break;
        case 3: level3(); break;
    }
}
```

### 场景3：带加载屏幕的应用

```typescript
import { defineScene, createLoadingUI } from './core';

function startApp() {
    const loadingUI = createLoadingUI('app');
    
    const mainApp = defineScene({
        id: 'main',
        name: '主应用',
        resources: { /* 大量资源 */ },
        onLoadProgress: (loaded, total, percentage) => {
            loadingUI.update(percentage);
        },
        main: async (resources) => {
            loadingUI.remove();
            // 启动应用
        }
    });
    
    mainApp();
}
```

## API 快速参考

### defineScene(definition)

```typescript
const scene = defineScene({
    id: string,              // 场景ID
    name: string,            // 场景名称
    resources: {             // 资源配置
        textures?: {...},
        gltfModels?: {...},
        // ... 更多资源类型
    },
    onLoadProgress?: (loaded, total, percentage) => void,
    main: async (resources) => void,
    onExit?: () => void
});

scene(); // 启动场景
```

### createLevelLoader(resources, levelFunction, options)

```typescript
const level = createLevelLoader(
    { textures: {...} },     // 资源
    (resources) => {         // 关卡函数
        // 关卡逻辑
    },
    {                        // 可选配置
        id: 'level1',
        name: '第一关',
        onProgress: (percentage) => {}
    }
);

level(); // 启动关卡
```

### createLoadingUI(containerId)

```typescript
const ui = createLoadingUI('app');
ui.update(50);  // 更新进度到50%
ui.remove();    // 移除UI
```

## 集成到现有项目

### 步骤1：导入模块

```typescript
import { defineScene, createLoadingUI } from './core';
```

### 步骤2：定义场景

```typescript
const myScene = defineScene({
    // ... 配置
});
```

### 步骤3：启动场景

```typescript
myScene();
```

## 与现有系统的兼容性

- ✅ 与现有的 Timer 系统兼容
- ✅ 与现有的 Animation 系统兼容
- ✅ 与 Three.js 完全兼容
- ✅ 不影响现有代码

## 性能优化建议

1. **按需加载**：只加载当前场景需要的资源
2. **资源复用**：全局资源提前加载并缓存
3. **压缩资源**：使用压缩的纹理和模型格式
4. **懒加载**：非关键资源可以在场景启动后异步加载
5. **资源清理**：在 onExit 中释放不再使用的资源

## 未来扩展

可以考虑添加：

- [ ] 资源预加载/预热
- [ ] 资源缓存策略
- [ ] 资源版本管理
- [ ] 加载优先级控制
- [ ] 断点续传支持
- [ ] 离线资源支持

## 问题反馈

如果在使用过程中遇到问题，请查看：

1. `资源加载器使用文档.md` - 完整文档
2. `资源加载器快速开始.md` - 快速入门
3. `src/examples/sceneLoaderDemo.ts` - 示例代码

## 总结

本资源加载系统为项目提供了：

- 🎯 统一的资源加载接口
- 🎮 完整的场景管理能力
- 📦 Three.js资源的原生支持
- 🎨 可视化的加载进度
- 🚀 简洁易用的API
- 📚 详细的文档和示例

现在你可以轻松地：
- 定义游戏关卡
- 加载3D模型和纹理
- 管理Shader资源
- 创建流畅的加载体验

开始使用吧！ 🎉

