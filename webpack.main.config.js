const path = require('path');

module.exports = {
  target: 'electron-main',
  entry: './src/main/index.ts',
  output: {
    path: path.resolve(__dirname, 'dist/main'),
    filename: 'index.js'
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@main': path.resolve(__dirname, 'src/main'),
      '@shared': path.resolve(__dirname, 'src/shared')
    }
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  node: {
    __dirname: false,
    __filename: false
  },
  externals: {
    electron: 'commonjs electron'
  }
};