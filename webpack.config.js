const path = require('path');

module.exports = {
    entry: './src/main.ts',
    output: {
        path: __dirname,
        filename: 'main.js',
        libraryTarget: 'commonjs'
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
    externals: {
        obsidian: 'obsidian',
    },
};