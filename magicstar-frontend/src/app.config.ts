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
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#6366f1',
    navigationBarTitleText: 'Magic Lightning',
    navigationBarTextStyle: 'white',
  },
  tabBar: {
    color: '#999999',
    selectedColor: '#6366f1',
    backgroundColor: '#ffffff',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '首页',
        iconPath: 'assets/icons/home.svg',
        selectedIconPath: 'assets/icons/home-active.svg'
      },
      {
        pagePath: 'pages/divination/index',
        text: '占卜',
        iconPath: 'assets/icons/divination.svg',
        selectedIconPath: 'assets/icons/divination-active.svg'
      },
      {
        pagePath: 'pages/shop/index',
        text: '商城',
        iconPath: 'assets/icons/shop.svg',
        selectedIconPath: 'assets/icons/shop-active.svg'
      },
      {
        pagePath: 'pages/profile/index',
        text: '我的',
        iconPath: 'assets/icons/profile.svg',
        selectedIconPath: 'assets/icons/profile-active.svg'
      }
    ],
  },
});
