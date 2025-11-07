# COMP4422 Computer Graphics Project

使用 TypeScript + Three.js + Webpack 的计算机图形学项目

## 安装依赖

```bash
npm install
```

## 开发

启动开发服务器（带热重载）:

```bash
npm start
```

服务器将在 http://localhost:8080 启动

## 构建

开发模式构建:

```bash
npm run dev
```

生产模式构建:

```bash
npm run build
```

构建后的文件将在 `dist/` 目录中。

## 项目结构

```
├── src/
│   ├── index.html    # HTML模板
│   └── index.ts      # TypeScript入口文件
├── dist/             # 构建输出目录
├── webpack.config.js # Webpack配置
├── tsconfig.json     # TypeScript配置
└── package.json      # 项目配置
```

## 技术栈

- TypeScript
- Three.js
- Webpack 5
- Webpack Dev Server
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM"],
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,
    "outDir": "./dist",
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}

