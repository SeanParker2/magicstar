import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { User } from '../src/modules/user/entities/user.entity';
import { Payment } from '../src/modules/payment/entities/payment.entity';
import { PaymentRecord } from '../src/modules/payment/entities/payment-record.entity';
import { createTestApp, cleanupTestData } from './test-setup';

describe('PaymentController (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let authToken: string;
  let testUser: User;

  beforeAll(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
    dataSource = testApp.dataSource;

    // 创建测试用户
    const registerResponse = await request
      .default(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'payment@example.com',
        password: 'Test123456',
        nickname: 'PaymentUser',
      });

    authToken = registerResponse.body.data.token;
    testUser = registerResponse.body.data.user;
  });

  afterAll(async () => {
    await cleanupTestData(dataSource);
    await app.close();
  });

  describe('/payment/create-order (POST)', () => {
    it('should create payment order with authentication', async () => {
      const response = await request
        .default(app.getHttpServer())
        .post('/payment/create-order')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productType: 'tarot_reading',
          productId: 'premium_reading',
          amount: 29.99,
          currency: 'CNY',
          description: '高级塔罗牌占卜',
        })
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('orderId');
      expect(response.body.data).toHaveProperty('amount', 29.99);
      expect(response.body.data).toHaveProperty('currency', 'CNY');
      expect(response.body.data).toHaveProperty('status', 'pending');
      expect(response.body.data).toHaveProperty('productType', 'tarot_reading');
    });

    it('should not create order without authentication', async () => {
      await request
        .default(app.getHttpServer())
        .post('/payment/create-order')
        .send({
          productType: 'tarot_reading',
          productId: 'premium_reading',
          amount: 29.99,
          currency: 'CNY',
          description: '高级塔罗牌占卜',
        })
        .expect(401);
    });

    it('should not create order with invalid amount', async () => {
      await request
        .default(app.getHttpServer())
        .post('/payment/create-order')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productType: 'tarot_reading',
          productId: 'premium_reading',
          amount: -10,
          currency: 'CNY',
          description: '高级塔罗牌占卜',
        })
        .expect(400);
    });

    it('should not create order with missing required fields', async () => {
      await request
        .default(app.getHttpServer())
        .post('/payment/create-order')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productType: 'tarot_reading',
          // 缺少 amount 字段
          currency: 'CNY',
          description: '高级塔罗牌占卜',
        })
        .expect(400);
    });

    it('should not create order with invalid currency', async () => {
      await request
        .default(app.getHttpServer())
        .post('/payment/create-order')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productType: 'tarot_reading',
          productId: 'premium_reading',
          amount: 29.99,
          currency: 'INVALID',
          description: '高级塔罗牌占卜',
        })
        .expect(400);
    });
  });

  describe('/payment/orders (GET)', () => {
    let orderId: string;

    beforeAll(async () => {
      // 创建测试订单
      const orderResponse = await request
        .default(app.getHttpServer())
        .post('/payment/create-order')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productType: 'tarot_reading',
          productId: 'premium_reading',
          amount: 29.99,
          currency: 'CNY',
          description: '测试订单',
        });

      orderId = orderResponse.body.data.orderId;
    });

    it('should get user payment orders with authentication', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/payment/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      // 验证订单结构
      const order = response.body.data[0];
      expect(order).toHaveProperty('orderId');
      expect(order).toHaveProperty('amount');
      expect(order).toHaveProperty('currency');
      expect(order).toHaveProperty('status');
      expect(order).toHaveProperty('productType');
      expect(order).toHaveProperty('createdAt');
    });

    it('should not get orders without authentication', async () => {
      await request
        .default(app.getHttpServer())
        .get('/payment/orders')
        .expect(401);
    });

    it('should support pagination', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/payment/orders?page=1&limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });

    it('should support status filtering', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/payment/orders?status=pending')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      response.body.data.forEach((order: any) => {
        expect(order.status).toBe('pending');
      });
    });
  });

  describe('/payment/orders/:orderId (GET)', () => {
    let orderId: string;

    beforeAll(async () => {
      // 创建测试订单
      const orderResponse = await request
        .default(app.getHttpServer())
        .post('/payment/create-order')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productType: 'tarot_reading',
          productId: 'premium_reading',
          amount: 29.99,
          currency: 'CNY',
          description: '详细订单测试',
        });

      orderId = orderResponse.body.data.orderId;
    });

    it('should get specific order details with authentication', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/payment/orders/${orderId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('orderId', orderId);
      expect(response.body.data).toHaveProperty('amount', 29.99);
      expect(response.body.data).toHaveProperty('currency', 'CNY');
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('productType', 'tarot_reading');
      expect(response.body.data).toHaveProperty('description', '详细订单测试');
    });

    it('should not get order details without authentication', async () => {
      await request
        .default(app.getHttpServer())
        .get(`/payment/orders/${orderId}`)
        .expect(401);
    });

    it('should not get non-existent order', async () => {
      await request
        .default(app.getHttpServer())
        .get('/payment/orders/non-existent-order-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('/payment/wechat-pay (POST)', () => {
    let orderId: string;

    beforeAll(async () => {
      // 创建测试订单
      const orderResponse = await request
        .default(app.getHttpServer())
        .post('/payment/create-order')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productType: 'tarot_reading',
          productId: 'premium_reading',
          amount: 29.99,
          currency: 'CNY',
          description: '微信支付测试',
        });

      orderId = orderResponse.body.data.orderId;
    });

    it('should initiate wechat payment with valid order', async () => {
      const response = await request
        .default(app.getHttpServer())
        .post('/payment/wechat-pay')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          orderId: orderId,
          paymentMethod: 'JSAPI',
          openid: 'test_openid_123',
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('prepayId');
      expect(response.body.data).toHaveProperty('paySign');
      expect(response.body.data).toHaveProperty('timeStamp');
      expect(response.body.data).toHaveProperty('nonceStr');
    });

    it('should not initiate payment without authentication', async () => {
      await request
        .default(app.getHttpServer())
        .post('/payment/wechat-pay')
        .send({
          orderId: orderId,
          paymentMethod: 'JSAPI',
          openid: 'test_openid_123',
        })
        .expect(401);
    });

    it('should not initiate payment with invalid order ID', async () => {
      await request
        .default(app.getHttpServer())
        .post('/payment/wechat-pay')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          orderId: 'invalid-order-id',
          paymentMethod: 'JSAPI',
          openid: 'test_openid_123',
        })
        .expect(404);
    });

    it('should not initiate payment without required fields', async () => {
      await request
        .default(app.getHttpServer())
        .post('/payment/wechat-pay')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          orderId: orderId,
          // 缺少 paymentMethod 字段
          openid: 'test_openid_123',
        })
        .expect(400);
    });
  });

  describe('/payment/alipay (POST)', () => {
    let orderId: string;

    beforeAll(async () => {
      // 创建测试订单
      const orderResponse = await request
        .default(app.getHttpServer())
        .post('/payment/create-order')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productType: 'tarot_reading',
          productId: 'premium_reading',
          amount: 29.99,
          currency: 'CNY',
          description: '支付宝支付测试',
        });

      orderId = orderResponse.body.data.orderId;
    });

    it('should initiate alipay payment with valid order', async () => {
      const response = await request
        .default(app.getHttpServer())
        .post('/payment/alipay')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          orderId: orderId,
          paymentMethod: 'page',
          returnUrl: 'https://example.com/return',
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('paymentUrl');
    });

    it('should not initiate alipay payment without authentication', async () => {
      await request
        .default(app.getHttpServer())
        .post('/payment/alipay')
        .send({
          orderId: orderId,
          paymentMethod: 'page',
          returnUrl: 'https://example.com/return',
        })
        .expect(401);
    });
  });

  describe('/payment/webhook/wechat (POST)', () => {
    it('should handle wechat payment webhook', async () => {
      const mockWebhookData = {
        id: 'webhook_test_id',
        create_time: '2023-01-01T00:00:00+08:00',
        resource_type: 'encrypt-resource',
        event_type: 'TRANSACTION.SUCCESS',
        summary: '支付成功',
        resource: {
          original_type: 'transaction',
          algorithm: 'AEAD_AES_256_GCM',
          ciphertext: 'test_encrypted_data',
          associated_data: 'transaction',
          nonce: 'test_nonce',
        },
      };

      const response = await request
        .default(app.getHttpServer())
        .post('/payment/webhook/wechat')
        .send(mockWebhookData)
        .expect(200);

      expect(response.body).toHaveProperty('code', 'SUCCESS');
      expect(response.body).toHaveProperty('message', '成功');
    });
  });

  describe('/payment/webhook/alipay (POST)', () => {
    it('should handle alipay payment webhook', async () => {
      const mockWebhookData = {
        gmt_create: '2023-01-01 00:00:00',
        charset: 'utf-8',
        gmt_payment: '2023-01-01 00:00:01',
        notify_time: '2023-01-01 00:00:02',
        subject: '测试商品',
        sign: 'test_signature',
        buyer_id: '2088000000000000',
        invoice_amount: '29.99',
        version: '1.0',
        notify_id: 'test_notify_id',
        fund_bill_list: '[{"amount":"29.99","fundChannel":"ALIPAYACCOUNT"}]',
        notify_type: 'trade_status_sync',
        out_trade_no: 'test_order_id',
        total_amount: '29.99',
        trade_status: 'TRADE_SUCCESS',
        trade_no: 'test_trade_no',
        auth_app_id: 'test_app_id',
        receipt_amount: '29.99',
        point_amount: '0.00',
        app_id: 'test_app_id',
        buyer_pay_amount: '29.99',
        sign_type: 'RSA2',
        seller_id: 'test_seller_id',
      };

      const response = await request
        .default(app.getHttpServer())
        .post('/payment/webhook/alipay')
        .send(mockWebhookData)
        .expect(200);

      expect(response.text).toBe('success');
    });
  });
});