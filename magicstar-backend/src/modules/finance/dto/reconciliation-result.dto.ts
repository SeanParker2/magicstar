import { ApiProperty } from '@nestjs/swagger';
import {
  ReconciliationType,
  ReconciliationStatus,
  PaymentChannel,
} from '../entities/reconciliation-record.entity';

export class ReconciliationSystemDataDto {
  @ApiProperty({ description: '交易笔数' })
  transactionCount: number;

  @ApiProperty({ description: '交易金额' })
  transactionAmount: number;

  @ApiProperty({ description: '退款笔数' })
  refundCount: number;

  @ApiProperty({ description: '退款金额' })
  refundAmount: number;
}

export class ReconciliationThirdPartyDataDto {
  @ApiProperty({ description: '交易笔数' })
  transactionCount: number;

  @ApiProperty({ description: '交易金额' })
  transactionAmount: number;

  @ApiProperty({ description: '退款笔数' })
  refundCount: number;

  @ApiProperty({ description: '退款金额' })
  refundAmount: number;
}

export class ReconciliationDifferencesDto {
  @ApiProperty({ description: '交易笔数差异' })
  transactionCountDiff: number;

  @ApiProperty({ description: '交易金额差异' })
  transactionAmountDiff: number;

  @ApiProperty({ description: '退款笔数差异' })
  refundCountDiff: number;

  @ApiProperty({ description: '退款金额差异' })
  refundAmountDiff: number;
}

export class ReconciliationMatchResultDto {
  @ApiProperty({ description: '匹配成功笔数' })
  matchedCount: number;

  @ApiProperty({ description: '未匹配笔数' })
  unmatchedCount: number;

  @ApiProperty({ description: '异常笔数' })
  exceptionCount: number;
}

export class ReconciliationResultDto {
  @ApiProperty({ description: '对账记录ID' })
  id: string;

  @ApiProperty({ description: '对账批次号' })
  batchNo: string;

  @ApiProperty({ description: '对账类型', enum: ReconciliationType })
  type: ReconciliationType;

  @ApiProperty({ description: '对账状态', enum: ReconciliationStatus })
  status: ReconciliationStatus;

  @ApiProperty({ description: '支付渠道', enum: PaymentChannel })
  paymentChannel: PaymentChannel;

  @ApiProperty({ description: '对账日期' })
  reconciliationDate: Date;

  @ApiProperty({ description: '是否有差异' })
  hasDiscrepancy: boolean;

  @ApiProperty({ description: '匹配率' })
  matchRate: number;

  @ApiProperty({ description: '系统数据', type: ReconciliationSystemDataDto })
  systemData: ReconciliationSystemDataDto;

  @ApiProperty({ description: '第三方数据', type: ReconciliationThirdPartyDataDto })
  thirdPartyData: ReconciliationThirdPartyDataDto;

  @ApiProperty({ description: '差异数据', type: ReconciliationDifferencesDto })
  differences: ReconciliationDifferencesDto;

  @ApiProperty({ description: '匹配结果', type: ReconciliationMatchResultDto })
  matchResult: ReconciliationMatchResultDto;

  @ApiProperty({ description: '报告文件路径', required: false })
  reportFilePath?: string;

  @ApiProperty({ description: '处理耗时（毫秒）', required: false })
  processingDuration?: number;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;
}

export class ReconciliationListDto {
  @ApiProperty({ description: '对账记录列表', type: [ReconciliationResultDto] })
  reconciliations: ReconciliationResultDto[];

  @ApiProperty({ description: '总数' })
  total: number;

  @ApiProperty({ description: '当前页码' })
  page: number;

  @ApiProperty({ description: '每页数量' })
  pageSize: number;
}