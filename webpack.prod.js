const path = require('path');

const webpack = require('webpack');
const merge = require('webpack-merge');
const autoPrefixer = require('autoprefixer');
const TerserPlugin = require('terser-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const common = require('./webpack.common');

module.exports = merge(common, {
  mode: 'production',
  output: {
    filename: '[name]_[hash].js',
    path: path.join(__dirname, 'dist'),
    pathinfo: true,
    publicPath: '/',
  },
  module: {
    rules: [
      {
        test: /\.css$/u,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
          {
            loader: 'postcss-loader',
            options: {
              plugins: () => [autoPrefixer()],
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('production'),
    }),
    new MiniCssExtractPlugin({
      filename: '[name]_[hash].css',
      publicPath: '/',
    }),
    new HtmlWebpackPlugin({
      inject: true,
      minify: {
        removeComments: true,
      },
      template: 'src/index.html',
    }),
  ],
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          output: {
            comments: false,
          },
        },
        extractComments: false,
      }),
    ],
    nodeEnv: 'production',
  },
});
