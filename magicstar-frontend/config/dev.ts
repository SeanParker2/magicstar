import type { UserConfigExport } from "@tarojs/cli";
export default {
   logger: {
    quiet: false,
    stats: true
  },
  mini: {},
  h5: {
    webpackChain(chain) {
      // 忽略第三方库的Sass弃用警告
      chain.module
        .rule('sass')
        .use('sass-loader')
        .tap(options => {
          return {
            ...options,
            sassOptions: {
              ...options.sassOptions,
              quietDeps: true, // 忽略依赖包的弃用警告
              verbose: false
            }
          }
        })
      
      // 配置webpack忽略特定警告
      chain.stats({
        warnings: false,
        warningsFilter: [
          /Deprecation Warning/,
          /taro-ui/,
          /Global built-in functions/,
          /sass-loader/,
          /@import/,
          /mix\(#FFF/
        ]
      })
    }
  }
} satisfies UserConfigExport<'webpack5'>
