export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/login/index',
    'pages/register/index',
    'pages/profile/index',
    'pages/divination/index',
    'pages/tarot/index',
    'pages/tarot/draw/index',
    'pages/tarot/result/index',
    'pages/tarot/history/index',
    'pages/fortune/index',
    'pages/fortune/detail/index',
    'pages/fortune/history/index',
    'pages/ai/index',
    'pages/ai/detail/index',
    'pages/shop/index',
    'pages/shop/product-list/index',
    'pages/shop/product-detail/index',
    'pages/shop/cart/index',
    'pages/shop/order/index',
    'pages/shop/order-detail/index',
    'pages/shop/payment/index',
    'pages/shop/order-success/index',
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#6366f1',
    navigationBarTitleText: 'Magic Lightning',
    navigationBarTextStyle: 'white',
  },
  tabBar: {
    color: '#999999',
    selectedColor: '#E4DED7',
    backgroundColor: '#1A1D25',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '首页',
        iconPath: 'assets/icons/ic_tab_home_unselected.svg',
        selectedIconPath: 'assets/icons/ic_tab_home_selected.svg'
      },
      {
        pagePath: 'pages/divination/index',
        text: '星盘',
        iconPath: 'assets/icons/ic_tab_astrolabe_unselected.svg',
        selectedIconPath: 'assets/icons/ic_tab_astrolabe_selected.svg'
      },
      {
        pagePath: 'pages/shop/index',
        text: '商城',
        iconPath: 'assets/icons/ic_tab_store_unselected.svg',
        selectedIconPath: 'assets/icons/ic_tab_store_selected.svg'
      },
      {
        pagePath: 'pages/profile/index',
        text: '我的',
        iconPath: 'assets/icons/ic_tab_profile_unselected.svg',
        selectedIconPath: 'assets/icons/ic_tab_profile_selected.svg'
      }
    ],
  },
});
