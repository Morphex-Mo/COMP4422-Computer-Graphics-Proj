const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const CopyWebpackPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const isRelease = process.env.BUILD_MODE === 'release';

module.exports = {
    entry: isRelease ? './src/index-release.ts' : './src/index.ts',
    mode: isRelease ? 'production' : 'development',
    target:['web','es5'],
    devtool: isRelease ? false : 'inline-source-map',
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader'],
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
        alias: {
            // 强制 three.js 使用同一个实例
            three: path.resolve(__dirname, 'node_modules/three'),
            // 如果遇到类似 'three/some/module' 的深度引入，也可以考虑这样配置
            // 'three/': path.resolve(__dirname, 'node_modules/three/')
        },
    },
    output: {
        filename: '[name].js',
        chunkFilename: '[name].[contenthash].js',
        path: path.resolve(__dirname, 'dist'),
        clean: true,
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './src/index.html',
            title: isRelease ? 'Star Collector' : 'COMP4422 Computer Graphics Project',
        }),
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: 'src/assets',
                    to: 'assets',
                }
            ]
        }),
        /*new BundleAnalyzerPlugin({
            analyzerMode: 'server', // 构建后会打开一个展示 bundle 的服务器窗口
            openAnalyzer: true,
        })*/
    ],
    devServer: {
        static: './dist',
        port: 8080,
        hot: true,
    },
    optimization: isRelease?{
        minimize: true,
        minimizer: [new TerserPlugin({
            terserOptions: {
                compress: {
                    drop_console: true
                },
                // 3. 配置 format/output 选项，保留空格和删除注释
                format: {
                    beautify: true, // 保持代码美观（保留缩进和换行）
                    comments: false, // 删除所有注释
                },
                // 4. 关闭 mangle（变量和函数名混淆），保持代码可读性
                mangle: false,
            }
        })],
        //runtimeChunk: 'single',
        splitChunks: {
            chunks: 'all', // 作用于同步和异步 chunk
            // 默认的配置已经很智能，通常不需要手动添加 cacheGroups
            // 但如果你想更精细地控制，可以添加 cacheGroups
            cacheGroups: {
                vendor: {
                    test: /[\\/]node_modules[\\/]/, // 匹配 node_modules 目录
                    name: 'threejs', // 生成的 chunk 名称
                    chunks: 'all',
                    // 优先级，数字越大，优先级越高
                    // 默认的 cacheGroups.vendors 优先级为 -10
                    // 这里可以设置更高的优先级，确保 node_modules 的模块优先被打包到 'vendors' chunk
                    priority: -10,
                    // 如果一个模块已经被打包成独立的 chunk，就不会再被打包到其他 chunk
                    // 这个选项在某些复杂场景下很有用
                    reuseExistingChunk: true,
                },
            },
        },
    }:{},
    "sideEffects": false
};