# Cube Scene 使用说明

## 概述

这是一个简化的演示场景，专注于展示天空盒、雾效和Toon Shader材质效果。场景中包含多个不同距离和颜色的立方体，用于测试雾效的视觉效果。

## 场景特点

### ✨ 核心功能

1. **渐变天空盒**
   - 从底部温暖桃色到顶部天空蓝的平滑渐变
   - 使用球体几何体和自定义shader实现

2. **线性雾效**
   - 近距离：5 units
   - 远距离：25 units
   - 颜色：0xffd7a8（与天空盒底部一致）

3. **Toon Shader立方体**
   - 使用与Fox场景相同的动漫风格材质
   - 11个不同颜色的立方体
   - 分布在近、中、远三个距离层次

4. **动态光照**
   - 旋转的方向光源
   - 实时更新所有材质的光照方向

## 场景结构

### 立方体分布

| 距离层次 | 位置范围 | 数量 | 大小 | 用途 |
|---------|----------|------|------|------|
| 近处 | Z: 0-2 | 3 | 1.0-1.2 | 展示清晰的Toon效果 |
| 中距离 | Z: -3 ~ -5 | 3 | 1.5-2.0 | 展示雾效开始生效 |
| 远处 | Z: -8 ~ -12 | 3 | 2.0-3.0 | 展示明显的雾效 |
| 极远处 | Z: -15 | 2 | 2.5 | 展示接近完全雾化 |

### 立方体详细配置

```typescript
// 近处立方体 (清晰可见)
{ position: (-2, 0.5, 2), color: 0xff6b6b, scale: 1 }     // 红色
{ position: (2, 0.5, 2), color: 0x4ecdc4, scale: 1 }      // 青色
{ position: (0, 0.5, 0), color: 0xffe66d, scale: 1.2 }    // 黄色

// 中距离立方体 (开始模糊)
{ position: (-4, 0.75, -3), color: 0x95e1d3, scale: 1.5 } // 薄荷绿
{ position: (4, 0.75, -3), color: 0xf38181, scale: 1.5 }  // 粉红
{ position: (0, 1, -5), color: 0xaa96da, scale: 2 }       // 紫色

// 远处立方体 (明显雾化)
{ position: (-6, 1, -8), color: 0xfcbad3, scale: 2 }      // 浅粉
{ position: (6, 1, -8), color: 0xa8e6cf, scale: 2 }       // 浅绿
{ position: (0, 1.5, -12), color: 0xffd3b6, scale: 3 }    // 桃色

// 极远处立方体 (接近完全雾化)
{ position: (-3, 1, -15), color: 0xffaaa5, scale: 2.5 }   // 珊瑚色
{ position: (3, 1, -15), color: 0xff8b94, scale: 2.5 }    // 玫瑰色
```

## Toon Shader 参数

所有立方体使用统一的Toon Shader参数：

```typescript
uShadowThreshold: 0.3        // 阴影阈值
uShadowSmoothness: 0.4       // 阴影平滑度
uSpecularThreshold: 0.7      // 高光阈值
uSpecularSmoothness: 0.1     // 高光平滑度
uSpecularPower: 16.0         // 高光锐度
uSpecularIntensity: 0.3      // 高光强度
uDiffuseStrength: 0.9        // 漫反射强度
uShadowIntensity: 0.4        // 阴影强度
uAmbientStrength: 0.35       // 环境光强度
uRimThreshold: 0.5           // 边缘光阈值
uRimAmount: 0.6              // 边缘光数量
uRimColor: 0x6699cc          // 边缘光颜色
```

## 光照配置

### 环境光
- 颜色：0x404040（深灰）
- 强度：0.6

### 方向光
- 颜色：0xffffff（白色）
- 强度：0.9
- 位置：旋转（半径10，高度10）
- 旋转速度：0.0005 rad/ms
- 启用阴影投射

## 相机设置

```typescript
位置：(8, 5, 8)
目标：(0, 0, 0)
FOV：75°
近裁剪面：0.1
远裁剪面：1000
```

## 使用场景选择器启动

场景已自动注册到场景选择器中，位于列表顶部：

```
📋 场景菜单
  └─ Cube Scene (Skybox + Fog)
      简单场景 - 展示天空盒、雾效和Toon Shader立方体
```

### 启动方式

1. **通过UI**：点击右上角"📋 场景菜单"按钮，选择"Cube Scene (Skybox + Fog)"

2. **编程方式**：
```typescript
import { startCubeScene } from './scenes/cubeScene';
startCubeScene();
```

## 观察要点

### 雾效测试

1. **近处立方体（Z: 0-2）**
   - 完全清晰，无雾效影响
   - Toon Shader效果最明显
   - 颜色鲜艳，边缘清晰

2. **中距离立方体（Z: -3 ~ -5）**
   - 开始受雾效影响
   - 颜色开始变浅
   - Toon效果依然可见

3. **远处立方体（Z: -8 ~ -12）**
   - 明显的雾化效果
   - 颜色大幅度向桃色过渡
   - 细节开始模糊

4. **极远处立方体（Z: -15）**
   - 接近完全雾化
   - 几乎融入天空背景
   - 仅能看到轮廓

### 光照效果

使用OrbitControls旋转相机观察：
- **正面光照**：明亮的高光和清晰的阴影分界
- **侧面光照**：边缘光效果明显
- **背面光照**：阴影区域显示柔和的环境光

### 动画效果

- 光源每秒完整旋转约0.3圈
- 观察阴影和高光的动态变化
- 注意边缘光随光源移动的效果

## 自定义修改

### 调整雾效范围

在代码中修改雾效参数：

```typescript
// 雾效更浓（距离更近）
scene.fog = new THREE.Fog(0xffd7a8, 3, 15);

// 雾效更淡（距离更远）
scene.fog = new THREE.Fog(0xffd7a8, 10, 40);

// 使用指数雾（更自然）
scene.fog = new THREE.FogExp2(0xffd7a8, 0.08);
```

### 添加新立方体

```typescript
const newCube = {
    position: new THREE.Vector3(x, y, z),
    color: 0xRRGGBB,
    scale: size
};
```

将配置添加到`cubeConfigs`数组即可。

### 修改天空颜色

```typescript
// 夜晚效果
topColor: { value: new THREE.Color(0x000033) },
bottomColor: { value: new THREE.Color(0x1a1a2e) },

// 日落效果
topColor: { value: new THREE.Color(0xff6b35) },
bottomColor: { value: new THREE.Color(0xffd93d) },
```

## 性能说明

### 资源占用
- **几何体**：1个立方体几何体（共享）+ 1个球体（天空盒）+ 1个平面（地面）
- **材质**：11个Toon Shader材质 + 1个天空盒材质 + 1个地面材质
- **光源**：1个环境光 + 1个方向光
- **阴影贴图**：2048x2048

### 优化建议
- 立方体使用共享几何体，减少内存占用
- 所有材质在退出时正确清理
- 使用requestAnimationFrame进行流畅渲染

## 故障排除

### 雾效不可见
- 确保相机far裁剪面大于雾的far值
- 检查shader材质的`fog: true`设置
- 确认雾颜色与背景有足够对比度

### 立方体过暗
- 增加环境光强度：`ambientLight.intensity`
- 增加方向光强度：`directionalLight.intensity`
- 调整shader的`uAmbientStrength`参数

### 立方体颜色不正确
- 检查材质的`uColor`值
- 确认光照颜色为白色（不影响物体颜色）
- 查看浏览器控制台是否有shader编译错误

## 技术细节

### Shader资源加载
场景使用资源加载器加载shader文件：
```typescript
resources: {
    shaders: {
        vertex: './assets/shaders/fox_toon.vert.glsl',
        fragment: './assets/shaders/fox_toon.frag.glsl',
    }
}
```

### 光照方向更新
每帧更新所有材质的光照方向（视图空间）：
```typescript
const worldLightDir = new THREE.Vector3().subVectors(
    new THREE.Vector3(0, 0, 0),
    directionalLight.position
).normalize();
const viewLightDir = worldLightDir.clone()
    .transformDirection(camera.matrixWorldInverse);
```

## 总结

这个场景是学习和测试以下技术的理想起点：
- ✅ 天空盒实现
- ✅ 雾效配置
- ✅ Toon Shader应用
- ✅ 动态光照
- ✅ 资源管理
- ✅ 场景清理

相比Fox场景，这个场景更简洁，加载更快，适合快速测试和实验。

