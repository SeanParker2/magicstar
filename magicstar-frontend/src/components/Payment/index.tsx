import { Component } from 'react';
import { View, Text } from '@tarojs/components';
import {
  AtIcon,
  AtButton,
  AtModal,
  AtModalHeader,
  AtModalContent,
  AtModalAction,
  AtInput,
} from 'taro-ui';
import Taro from '@tarojs/taro';
import './index.css';

interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  description: string;
  enabled: boolean;
  fee?: number;
}

interface PaymentProps {
  visible: boolean;
  amount: number;
  orderId: string;
  paymentMethods: PaymentMethod[];
  onClose: () => void;
  onPaymentSuccess: (paymentId: string) => void;
  onPaymentError: (error: string) => void;
  loading?: boolean;
}

interface PaymentState {
  selectedMethod: string;
  paymentPassword: string;
  showPasswordInput: boolean;
  processing: boolean;
}

export default class Payment extends Component<PaymentProps, PaymentState> {
  static defaultProps = {
    visible: false,
    amount: 0,
    orderId: '',
    paymentMethods: [],
    loading: false,
  };

  constructor(props: PaymentProps) {
    super(props);
    this.state = {
      selectedMethod: '',
      paymentPassword: '',
      showPasswordInput: false,
      processing: false,
    };
  }

  componentDidMount() {
    // 默认选择第一个可用的支付方式
    const { paymentMethods } = this.props;
    const firstEnabled = paymentMethods.find(method => method.enabled);
    if (firstEnabled) {
      this.setState({ selectedMethod: firstEnabled.id });
    }
  }

  componentDidUpdate(prevProps: PaymentProps) {
    // 当支付方式列表更新时，重新选择默认方式
    if (prevProps.paymentMethods !== this.props.paymentMethods) {
      const { paymentMethods } = this.props;
      const firstEnabled = paymentMethods.find(method => method.enabled);
      if (firstEnabled && !this.state.selectedMethod) {
        this.setState({ selectedMethod: firstEnabled.id });
      }
    }
  }

  // 处理支付方式选择
  handleMethodSelect = (value: string) => {
    this.setState({ selectedMethod: value });
  };

  // 处理支付密码输入
  handlePasswordChange = (value: string) => {
    this.setState({ paymentPassword: value });
  };

  // 获取选中的支付方式
  getSelectedMethod = () => {
    const { paymentMethods } = this.props;
    const { selectedMethod } = this.state;
    return paymentMethods.find(method => method.id === selectedMethod);
  };

  // 计算实际支付金额（包含手续费）
  calculateTotalAmount = () => {
    const { amount } = this.props;
    const selectedMethod = this.getSelectedMethod();
    const fee = selectedMethod?.fee || 0;
    return amount + fee;
  };

  // 处理支付确认
  handlePaymentConfirm = async () => {
    const { selectedMethod, paymentPassword } = this.state;
    const { orderId, onPaymentSuccess, onPaymentError } = this.props;

    if (!selectedMethod) {
      Taro.showToast({
        title: '请选择支付方式',
        icon: 'none',
      });
      return;
    }

    const method = this.getSelectedMethod();
    if (!method) return;

    // 如果需要密码验证
    if (method.id === 'balance' && !paymentPassword) {
      this.setState({ showPasswordInput: true });
      return;
    }

    this.setState({ processing: true });

    try {
      // 模拟支付处理
      await this.processPayment(method, orderId, paymentPassword);

      // 支付成功
      const paymentId = `pay_${Date.now()}`;
      onPaymentSuccess(paymentId);

      Taro.showToast({
        title: '支付成功',
        icon: 'success',
      });

      this.resetState();
    } catch (error) {
      // 支付失败
      const errorMessage = error instanceof Error ? error.message : '支付失败';
      onPaymentError(errorMessage);

      Taro.showToast({
        title: errorMessage,
        icon: 'none',
      });
    } finally {
      this.setState({ processing: false });
    }
  };

  // 处理支付流程
  processPayment = async (method: PaymentMethod, orderId: string, password?: string) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // 模拟不同支付方式的处理逻辑
        console.log('Processing payment for order:', orderId);
        switch (method.id) {
          case 'wechat':
            // 微信支付
            this.handleWechatPay().then(resolve).catch(reject);
            break;
          case 'alipay':
            // 支付宝支付
            this.handleAlipay().then(resolve).catch(reject);
            break;
          case 'balance':
            // 余额支付
            this.handleBalancePay(password).then(resolve).catch(reject);
            break;
          default:
            reject(new Error('不支持的支付方式'));
        }
      }, 1000);
    });
  };

  // 微信支付
  handleWechatPay = async () => {
    // 这里应该调用微信支付API
    // 模拟支付成功
    return Promise.resolve();
  };

  // 支付宝支付
  handleAlipay = async () => {
    // 这里应该调用支付宝API
    // 模拟支付成功
    return Promise.resolve();
  };

  // 余额支付
  handleBalancePay = async (password?: string) => {
    if (!password) {
      throw new Error('请输入支付密码');
    }

    // 这里应该验证支付密码
    if (password !== '123456') {
      throw new Error('支付密码错误');
    }

    return Promise.resolve();
  };

  // 重置状态
  resetState = () => {
    this.setState({
      paymentPassword: '',
      showPasswordInput: false,
      processing: false,
    });
  };

  // 处理关闭
  handleClose = () => {
    const { onClose } = this.props;
    this.resetState();
    onClose();
  };

  // 渲染支付方式列表
  renderPaymentMethods = () => {
    const { paymentMethods } = this.props;
    const { selectedMethod } = this.state;

    return (
      <View className="payment-methods-list">
        {paymentMethods
          .filter(method => method.enabled)
          .map(method => (
            <View
              key={method.id}
              className={`payment-method-item ${selectedMethod === method.id ? 'selected' : ''}`}
              onClick={() => this.handleMethodSelect(method.id)}
            >
              <View className="method-radio">
                <View className={`radio-circle ${selectedMethod === method.id ? 'checked' : ''}`}>
                  {selectedMethod === method.id && <View className="radio-dot" />}
                </View>
              </View>
              <View className="method-info">
                <AtIcon value={method.icon} size="24" color="#333" />
                <View className="method-details">
                  <Text className="method-name">{method.name}</Text>
                  <Text className="method-description">{method.description}</Text>
                </View>
              </View>
              {method.fee && method.fee > 0 && (
                <Text className="method-fee">手续费: ¥{method.fee.toFixed(2)}</Text>
              )}
            </View>
          ))}
      </View>
    );
  };

  // 渲染支付密码输入
  renderPasswordInput = () => {
    const { showPasswordInput, paymentPassword } = this.state;

    if (!showPasswordInput) return null;

    return (
      <AtModal isOpened={showPasswordInput}>
        <AtModalHeader>输入支付密码</AtModalHeader>
        <AtModalContent>
          <View className="password-input-container">
            <AtInput
              name="password"
              type="password"
              placeholder="请输入6位支付密码"
              value={paymentPassword}
              onChange={this.handlePasswordChange}
              maxLength={6}
            />
          </View>
        </AtModalContent>
        <AtModalAction>
          <AtButton onClick={() => this.setState({ showPasswordInput: false })}>取消</AtButton>
          <AtButton type="primary" onClick={this.handlePaymentConfirm}>
            确认支付
          </AtButton>
        </AtModalAction>
      </AtModal>
    );
  };

  render() {
    const { visible, amount, loading } = this.props;
    const { processing } = this.state;
    const totalAmount = this.calculateTotalAmount();
    const selectedMethod = this.getSelectedMethod();

    return (
      <>
        <AtModal isOpened={visible} className="payment-modal">
          <AtModalHeader>选择支付方式</AtModalHeader>
          <AtModalContent>
            <View className="payment-content">
              {/* 订单金额 */}
              <View className="amount-section">
                <View className="amount-row">
                  <Text className="amount-label">订单金额:</Text>
                  <Text className="amount-value">¥{amount.toFixed(2)}</Text>
                </View>
                {selectedMethod?.fee && selectedMethod.fee > 0 && (
                  <View className="amount-row">
                    <Text className="amount-label">手续费:</Text>
                    <Text className="amount-value">¥{selectedMethod.fee.toFixed(2)}</Text>
                  </View>
                )}
                <View className="amount-row total">
                  <Text className="amount-label">实付金额:</Text>
                  <Text className="amount-value total-amount">¥{totalAmount.toFixed(2)}</Text>
                </View>
              </View>

              {/* 支付方式 */}
              <View className="payment-methods-section">
                <Text className="section-title">选择支付方式</Text>
                {loading ? (
                  <View className="loading-methods">
                    <AtIcon value="loading-3" size="24" color="#ccc" />
                    <Text className="loading-text">加载支付方式...</Text>
                  </View>
                ) : (
                  this.renderPaymentMethods()
                )}
              </View>
            </View>
          </AtModalContent>
          <AtModalAction>
            <AtButton onClick={this.handleClose} disabled={processing}>
              取消
            </AtButton>
            <AtButton
              type="primary"
              onClick={this.handlePaymentConfirm}
              loading={processing}
              disabled={processing || !selectedMethod || loading}
            >
              {processing ? '支付中...' : `确认支付 ¥${totalAmount.toFixed(2)}`}
            </AtButton>
          </AtModalAction>
        </AtModal>

        {/* 支付密码输入弹窗 */}
        {this.renderPasswordInput()}
      </>
    );
  }
}
