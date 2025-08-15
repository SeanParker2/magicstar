import type { UserConfigExport } from "@tarojs/cli";

export default {
  mini: {
    // 小程序优化配置
    optimizeMainPackage: {
      enable: true
    },
    // 启用分包预下载
    preloadRule: {
      'pages/tarot/index': {
        network: 'all',
        packages: ['tarot']
      },
      'pages/fortune/index': {
        network: 'all', 
        packages: ['fortune']
      }
    }
  },
  h5: {
    // 启用 gzip 压缩
    enableExtract: true,
    // 优化输出文件名
    output: {
      filename: 'js/[name].[contenthash:8].js',
      chunkFilename: 'js/[name].[contenthash:8].js'
    },
    miniCssExtractPluginOption: {
      ignoreOrder: true,
      filename: 'css/[name].[contenthash:8].css',
      chunkFilename: 'css/[name].[contenthash:8].css'
    },
    // Webpack 优化配置
    webpackChain(chain) {
      // 代码分割优化
      chain.optimization.splitChunks({
        chunks: 'all',
        cacheGroups: {
          vendor: {
            name: 'vendor',
            test: /[\\/]node_modules[\\/]/,
            priority: 10,
            chunks: 'all'
          },
          taro: {
            name: 'taro',
            test: /[\\/]node_modules[\\/]@tarojs[\\/]/,
            priority: 20,
            chunks: 'all'
          },
          common: {
            name: 'common',
            minChunks: 2,
            priority: 5,
            chunks: 'all',
            reuseExistingChunk: true
          }
        }
      })
      
      // 启用持久化缓存
      chain.cache({
        type: 'filesystem',
        buildDependencies: {
          config: [__filename]
        }
      })
      
      // 压缩优化
      chain.optimization.minimize(true)
      
      // 如果需要分析包体积，取消注释下面的代码
      // chain.plugin('analyzer')
      //   .use(require('webpack-bundle-analyzer').BundleAnalyzerPlugin, [])
    }
  }
} satisfies UserConfigExport<'webpack5'>
