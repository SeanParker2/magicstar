import { Component } from 'react';
import { View, Text } from '@tarojs/components';
import { AtIcon, AtTag, AtSteps, AtTimeline } from 'taro-ui';
import './index.scss';

// 订单状态类型定义
type OrderStatusType =
  | 'pending'
  | 'paid'
  | 'shipped'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'refunded';

interface OrderStatusProps {
  status: OrderStatusType;
  showTimeline?: boolean;
  showSteps?: boolean;
  size?: 'small' | 'normal' | 'large';
  className?: string;
  orderLogs?: OrderLog[];
}

interface OrderLog {
  id: string;
  status: OrderStatusType;
  description: string;
  createdAt: string;
  operator?: string;
}

interface OrderStatusState {
  // 组件内部状态
}

export default class OrderStatus extends Component<OrderStatusProps, OrderStatusState> {
  static defaultProps = {
    showTimeline: false,
    showSteps: false,
    size: 'normal',
    className: '',
    orderLogs: [],
  };

  constructor(props: OrderStatusProps) {
    super(props);
    this.state = {};
  }

  // 获取状态配置
  getStatusConfig = (status: OrderStatusType) => {
    const configs = {
      pending: {
        text: '待付款',
        color: '#ff9800',
        icon: 'clock',
        bgColor: '#fff3e0',
        description: '订单已创建，等待付款',
      },
      paid: {
        text: '已付款',
        color: '#2196f3',
        icon: 'check-circle',
        bgColor: '#e3f2fd',
        description: '付款成功，准备发货',
      },
      shipped: {
        text: '已发货',
        color: '#ff6b6b',
        icon: 'shopping-bag',
        bgColor: '#ffebee',
        description: '商品已发货，正在配送中',
      },
      delivered: {
        text: '已送达',
        color: '#4caf50',
        icon: 'check',
        bgColor: '#e8f5e8',
        description: '商品已送达，请确认收货',
      },
      completed: {
        text: '已完成',
        color: '#4caf50',
        icon: 'check-circle',
        bgColor: '#e8f5e8',
        description: '订单已完成',
      },
      cancelled: {
        text: '已取消',
        color: '#9e9e9e',
        icon: 'close-circle',
        bgColor: '#f5f5f5',
        description: '订单已取消',
      },
      refunded: {
        text: '已退款',
        color: '#9e9e9e',
        icon: 'reload',
        bgColor: '#f5f5f5',
        description: '订单已退款',
      },
    };
    return configs[status] || configs.pending;
  };

  // 获取步骤配置
  getStepsConfig = () => {
    const { status } = this.props;
    const allSteps = [
      { orderStatus: 'pending', title: '下单', desc: '订单已创建' },
      { orderStatus: 'paid', title: '付款', desc: '付款成功' },
      { orderStatus: 'shipped', title: '发货', desc: '商品已发货' },
      { orderStatus: 'delivered', title: '送达', desc: '商品已送达' },
      { orderStatus: 'completed', title: '完成', desc: '订单已完成' },
    ];

    const statusOrder = ['pending', 'paid', 'shipped', 'delivered', 'completed'];
    const currentIndex = statusOrder.indexOf(status);

    // 如果是取消或退款状态，只显示到当前状态
    if (status === 'cancelled' || status === 'refunded') {
      return [
        { title: '下单', desc: '订单已创建', status: 'success' as const },
        {
          title: status === 'cancelled' ? '取消' : '退款',
          desc: status === 'cancelled' ? '订单已取消' : '订单已退款',
          status: 'error' as const,
        },
      ];
    }

    return allSteps.map((step, index) => ({
      title: step.title,
      desc: step.desc,
      status: (index <= currentIndex ? 'success' : undefined) as 'success' | undefined,
    }));
  };

  // 格式化时间
  formatTime = (timeStr: string) => {
    const date = new Date(timeStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (days > 0) {
      return `${days}天前`;
    } else if (hours > 0) {
      return `${hours}小时前`;
    } else if (minutes > 0) {
      return `${minutes}分钟前`;
    } else {
      return '刚刚';
    }
  };

  // 渲染基础状态
  renderBasicStatus = () => {
    const { status, size } = this.props;
    const config = this.getStatusConfig(status);
    const sizeClass = `status-${size}`;

    return (
      <View className={`order-status-basic ${sizeClass}`}>
        <AtTag
          type="primary"
          size={size === 'small' ? 'small' : 'normal'}
          customStyle={{
            color: config.color,
            backgroundColor: config.bgColor,
            border: `1px solid ${config.color}`,
            borderRadius: '16px',
          }}
        >
          <View className="status-content">
            <AtIcon
              value={config.icon}
              size={size === 'small' ? '14' : size === 'large' ? '20' : '16'}
              color={config.color}
            />
            <Text className="status-text">{config.text}</Text>
          </View>
        </AtTag>
        {size !== 'small' && <Text className="status-description">{config.description}</Text>}
      </View>
    );
  };

  // 渲染步骤状态
  renderStepsStatus = () => {
    const steps = this.getStepsConfig();

    return (
      <View className="order-status-steps">
        <AtSteps
          items={steps}
          current={steps.findIndex(step => step.status === 'success')}
          onChange={() => {}}
        />
      </View>
    );
  };

  // 渲染时间线状态
  renderTimelineStatus = () => {
    const { orderLogs } = this.props;

    if (!orderLogs || orderLogs.length === 0) {
      return this.renderBasicStatus();
    }

    const timelineItems = orderLogs
      .map(log => {
        const config = this.getStatusConfig(log.status);
        return {
          title: config.text,
          content: [
            log.description,
            log.operator && `操作人：${log.operator}`,
            this.formatTime(log.createdAt),
          ].filter(Boolean),
          icon: config.icon,
          color: config.color,
        };
      })
      .reverse(); // 最新的在上面

    return (
      <View className="order-status-timeline">
        <AtTimeline
          items={timelineItems.map(item => ({
            title: item.title,
            content: item.content,
            icon: item.icon,
          }))}
        />
      </View>
    );
  };

  render() {
    const { showTimeline, showSteps, className } = this.props;

    return (
      <View className={`order-status ${className}`}>
        {showTimeline
          ? this.renderTimelineStatus()
          : showSteps
            ? this.renderStepsStatus()
            : this.renderBasicStatus()}
      </View>
    );
  }
}
