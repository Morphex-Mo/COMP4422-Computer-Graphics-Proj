# Azure Sky 参数修复说明

## 修改内容

### 1. cubeScene.ts - 参数调整

**旧参数（错误的尺度）：**
- `rayleigh`: 2.0 (无意义的倍数)
- `turbidity`: 10.0 (Unity 特有参数)
- `mieCoefficient`: 0.005 (错误的尺度)
- `globalFogDistance`: 50.0 (太小)
- `heightFogDistance`: 30.0 (太小)
- `fogBluishDistance`: 100.0 (太小)

**新参数（Azure Sky 风格）：**
- `kr`: 8400.0 (Rayleigh 散射高度，单位：米)
- `km`: 1200.0 (Mie 散射高度，单位：米)
- `wavelength`: new THREE.Vector3(680.0, 550.0, 450.0) (波长，单位：纳米)
- `molecularDensity`: 2.545 (分子密度系数)
- `rayleigh`: 1.5 (Rayleigh 散射倍数)
- `mie`: 1.0 (Mie 散射倍数)
- `mieDirectionalG`: 0.75 (Mie 方向性因子 g)
- `scattering`: 15.0 (散射强度倍数)
- `exposure`: 2.0 (曝光值)
- `globalFogDistance`: 1000.0 (Azure 默认)
- `heightFogDistance`: 100.0 (Azure 默认)
- `fogBluishDistance`: 12288.0 (Azure 默认)
- `fogBluishIntensity`: 0.15 (Azure 默认)

**新增计算函数：**
```typescript
// 基于波长和物理参数计算 Rayleigh 系数
const computeRayleigh = (): THREE.Vector3 => {
    const lambda = skyParams.wavelength.clone().multiplyScalar(1e-9);
    const n = 1.0003; // 空气折射率
    const pn = 0.035; // 去极化因子
    const n2 = n * n;
    const N = skyParams.molecularDensity * 1e25;
    const temp = (8.0 * Math.PI * Math.PI * Math.PI * ((n2 - 1.0) * (n2 - 1.0))) / 
                 (3.0 * N) * ((6.0 + 3.0 * pn) / (6.0 - 7.0 * pn));
    return new THREE.Vector3(
        temp / Math.pow(lambda.x, 4.0),
        temp / Math.pow(lambda.y, 4.0),
        temp / Math.pow(lambda.z, 4.0)
    ).multiplyScalar(skyParams.rayleigh);
};

// 基于波长计算 Mie 系数
const computeMie = (): THREE.Vector3 => {
    const k = new THREE.Vector3(686.0, 678.0, 682.0);
    const c = (0.6544 * 5.0 - 0.6510) * 10.0 * 1e-9;
    return new THREE.Vector3(
        434.0 * c * Math.PI * Math.pow((4.0 * Math.PI) / skyParams.wavelength.x, 2.0) * k.x,
        434.0 * c * Math.PI * Math.pow((4.0 * Math.PI) / skyParams.wavelength.y, 2.0) * k.y,
        434.0 * c * Math.PI * Math.pow((4.0 * Math.PI) / skyParams.wavelength.z, 2.0) * k.z
    ).multiplyScalar(skyParams.mie);
};

// 计算 Mie G 参数
const computeMieG = (): THREE.Vector3 => {
    const g = skyParams.mieDirectionalG;
    return new THREE.Vector3(
        1.0 - g * g,  // mieG.x
        1.0 + g * g,  // mieG.y
        2.0 * g       // mieG.z
    );
};
```

### 2. atmospheric_scattering.frag.glsl - 天空盒着色器重写

**主要改进：**
- 使用 Azure Sky 的光学深度计算公式
- 正确计算 Rayleigh 和 Mie 相位函数
- 使用预计算的系数而不是在着色器中计算
- 添加日出/日落效果
- 使用 Azure Sky 的色调映射

**关键公式：**
```glsl
// 光学深度（Optical Depth）
float zenith = acos(saturate(dot(vec3(0.0, 1.0, 0.0), viewDir)));
float z = cos(zenith) + 0.15 * pow(93.885 - ((zenith * 180.0) / PI), -1.253);
float SR = kr / z;  // Rayleigh 散射路径长度
float SM = km / z;  // Mie 散射路径长度

// 消光（Extinction）
vec3 fex = exp(-(rayleighCoef * SR + mieCoef * SM));

// Rayleigh 相位函数（简化版）
float rayPhase = 2.0 + 0.5 * pow(sunCosTheta, 2.0);

// Mie 相位函数（Henyey-Greenstein 简化版）
float miePhase = mieG.x / pow(mieG.y - mieG.z * sunCosTheta, 1.5);
```

### 3. fog_scattering.frag.glsl - 雾气散射着色器修复

**关键修复：**

1. **深度归一化**（Azure Sky 使用 Linear01Depth）：
```glsl
float depth = (cameraFar - dist) / (cameraFar - cameraNear);
depth = clamp(depth, 0.0, 1.0);
```

2. **Mie 深度计算**（使用正确的尺度）：
```glsl
// Azure Sky: depth * (_ProjectionParams.z / 10000.0) 和 depth * (_ProjectionParams.z / 1000.0)
float mieDepth = clamp(mix(depth * (cameraFar / 10000.0), depth * (cameraFar / 1000.0), mieDistance), 0.0, 1.0);
```

3. **三种光学深度模式**（Azure Sky 的核心算法）：
```glsl
// 光学深度 1 - 适合日落
float zenith1 = acos(clamp(dot(normalize(vec3(-1.0, 1.0, -1.0)), vec3(depth)), 0.0, 1.0));
float z1 = cos(zenith1) + 0.15 * pow(93.885 - degrees(zenith1), -1.253);
float SR1 = kr / z1;

// 光学深度 2 - 适合正午（蓝色雾气）
float z2 = clamp((1.0 - depth * (cameraFar / fogBluishDistance)) * fogBluishIntensity, 0.0, 1.0);
float SR2 = kr / z2;

// 光学深度 3 - 适合背景
float zenith3 = acos(clamp(dot(vec3(0.0, 1.0, 0.0), viewDir), 0.0, 1.0));
float z3 = cos(zenith3) + 0.15 * pow(93.885 - degrees(zenith3), -1.253);
float SR3 = kr / z3;
```

4. **消光混合**（使用 depth 而不是距离比）：
```glsl
vec3 fex = mix(fex2, fex3, depth);  // 正确
// 而不是 vec3 fex = mix(fex2, fex3, dist / cameraFar);  // 错误
```

5. **高度雾气计算**（Azure Sky 公式）：
```glsl
float heightFog = clamp((worldPos.y - heightFogStart) / (heightFogEnd + heightFogStart), 0.0, 1.0);
heightFog = 1.0 - heightFog;
heightFog *= heightFog; // Azure Sky 只平方一次，不是两次
heightFog *= heightFogDist;
heightFog *= heightFogDensity;
```

## 参数尺度对比

| 参数 | 旧值（错误） | 新值（Azure Sky） | 说明 |
|------|------------|-----------------|------|
| Kr (Rayleigh 高度) | 0.005 | 8400.0 | 单位：米 |
| Km (Mie 高度) | 5.0 | 1200.0 | 单位：米 |
| Rayleigh 系数 | 直接使用 2.0 | 物理计算 ~1e-5 | 基于波长计算 |
| Mie 系数 | 直接使用 0.005 | 物理计算 ~1e-5 | 基于波长计算 |
| 全局雾距离 | 50.0 | 1000.0 | 单位：场景单位 |
| 高度雾距离 | 30.0 | 100.0 | 单位：场景单位 |
| 雾气蓝色距离 | 100.0 | 12288.0 | Unity 的默认值 |

## 测试建议

1. **调整全局雾气**：按键 1/2 调整 globalFogDistance，范围 100-5000
2. **调整全局雾气密度**：按键 3/4 调整 globalFogDensity，范围 0-2.0
3. **调整高度雾气**：按键 5/6 调整 heightFogDensity，范围 0-2.0
4. **调整散射强度**：按键 T/G 调整 scattering，范围 1-30
5. **调整曝光**：按键 E/Q 调整 exposure，范围 0.1-5.0
6. **旋转太阳**：方向键调整太阳位置，观察日出/日落效果

## 已知效果

- 天空盒现在应该显示正确的蓝天效果
- 日落时会有橙红色渐变
- 雾气会根据距离和高度正确渲染
- Mie 散射会在太阳周围产生光晕效果
- 远处物体会有蓝色雾气（大气透视）

