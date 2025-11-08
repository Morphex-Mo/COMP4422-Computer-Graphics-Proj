const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
    entry: './src/index.ts',
    mode: 'development',
    devtool: 'inline-source-map',
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
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist'),
        clean: true,
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './src/index.html',
            title: 'COMP4422 Computer Graphics Project',
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
};

