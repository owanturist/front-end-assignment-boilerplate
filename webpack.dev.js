const path = require('path');

const webpack = require('webpack');
const merge = require('webpack-merge');
const common = require('./webpack.common');

module.exports = merge(common, {
  mode: 'development',
  devtool: 'cheap-module-eval-source-map',
  devServer: {
    compress: false,
    contentBase: path.join(__dirname, 'dist'),
    historyApiFallback: true,
    hot: true,
    inline: true,
    overlay: true,
    writeToDisk: false,
  },
  output: {
    filename: 'chunks/[name].js',
    pathinfo: true,
    publicPath: '/',
  },
  module: {
    rules: [
      {
        test: /\.css$/u,
        use: [
          'style-loader',
          'css-loader',
          {
            loader: 'postcss-loader',
            options: {
              plugins: () => [autoPrefixer()],
              sourceMap: true,
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('development'),
    }),
    new HtmlWebpackPlugin({
      inject: true,
      minify: false,
      template: 'src/index.html',
    }),
  ],
  watch: true,
  watchOptions: {
    ignored: /node_modules/u,
  },
});
