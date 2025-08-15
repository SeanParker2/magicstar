import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PromptTemplate, PromptTemplateStatus } from '../entities/prompt-template.entity';
import { AiRequestType } from '../entities/ai-request.entity';

@Injectable()
export class PromptService {
  private readonly logger = new Logger(PromptService.name);

  constructor(
    @InjectRepository(PromptTemplate)
    private readonly promptTemplateRepository: Repository<PromptTemplate>,
  ) {}

  /**
   * 获取Prompt模板
   */
  async getTemplate(
    templateId?: string,
    requestType?: AiRequestType,
  ): Promise<PromptTemplate> {
    let template: PromptTemplate | null = null;

    // 如果指定了模板ID，优先使用
    if (templateId) {
      template = await this.promptTemplateRepository.findOne({
        where: { 
          id: templateId,
          status: PromptTemplateStatus.ACTIVE,
        },
      });

      if (!template) {
        throw new BadRequestException(`Prompt template ${templateId} not found or inactive`);
      }
    }
    // 否则根据请求类型获取默认模板
    else if (requestType) {
      template = await this.promptTemplateRepository.findOne({
        where: {
          requestType,
          status: PromptTemplateStatus.ACTIVE,
          isDefault: true,
        },
        order: {
          priority: 'DESC',
          createdAt: 'DESC',
        },
      });

      if (!template) {
        // 如果没有默认模板，获取该类型的第一个可用模板
        template = await this.promptTemplateRepository.findOne({
          where: {
            requestType,
            status: PromptTemplateStatus.ACTIVE,
          },
          order: {
            priority: 'DESC',
            usageCount: 'DESC',
            createdAt: 'DESC',
          },
        });
      }

      if (!template) {
        throw new BadRequestException(`No active prompt template found for request type: ${requestType}`);
      }
    } else {
      throw new BadRequestException('Either templateId or requestType must be provided');
    }

    // 增加使用计数
    await this.incrementUsageCount(template.id);

    return template;
  }

  /**
   * 生成Prompt文本
   */
  async generatePrompt(
    template: PromptTemplate,
    inputData: any,
    contextData?: any,
  ): Promise<string> {
    try {
      // 验证输入数据
      const validation = template.validateInput(inputData);
      if (!validation.valid) {
        throw new BadRequestException(`Input validation failed: ${validation.errors.join(', ')}`);
      }

      // 准备变量数据
      const variables = {
        ...inputData,
        ...contextData,
        timestamp: new Date().toISOString(),
        date: new Date().toLocaleDateString('zh-CN'),
        time: new Date().toLocaleTimeString('zh-CN'),
      };

      // 渲染用户Prompt
      const userPrompt = template.renderTemplate(variables);

      // 组合系统Prompt和用户Prompt
      let fullPrompt = '';
      if (template.systemPrompt) {
        fullPrompt += `System: ${template.systemPrompt}\n\n`;
      }
      fullPrompt += `User: ${userPrompt}`;

      this.logger.debug(`Generated prompt for template ${template.id}, length: ${fullPrompt.length}`);
      
      return fullPrompt;
    } catch (error) {
      this.logger.error(`Failed to generate prompt: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 创建新的Prompt模板
   */
  async createTemplate(templateData: Partial<PromptTemplate>): Promise<PromptTemplate> {
    try {
      // 验证必填字段
      if (!templateData.name || !templateData.requestType || !templateData.userPromptTemplate) {
        throw new BadRequestException('Name, requestType, and userPromptTemplate are required');
      }

      // 如果设置为默认模板，取消其他默认模板
      if (templateData.isDefault) {
        await this.promptTemplateRepository.update(
          {
            requestType: templateData.requestType,
            isDefault: true,
          },
          { isDefault: false },
        );
      }

      const template = this.promptTemplateRepository.create({
        ...templateData,
        status: templateData.status || PromptTemplateStatus.TESTING,
        version: templateData.version || '1.0.0',
        usageCount: 0,
      });

      const savedTemplate = await this.promptTemplateRepository.save(template);
      
      this.logger.log(`Created new prompt template: ${savedTemplate.id}`);
      
      return savedTemplate;
    } catch (error) {
      this.logger.error(`Failed to create prompt template: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 更新Prompt模板
   */
  async updateTemplate(
    templateId: string,
    updateData: Partial<PromptTemplate>,
  ): Promise<PromptTemplate> {
    try {
      const template = await this.promptTemplateRepository.findOne({
        where: { id: templateId },
      });

      if (!template) {
        throw new BadRequestException('Prompt template not found');
      }

      // 如果设置为默认模板，取消其他默认模板
      if (updateData.isDefault && !template.isDefault) {
        await this.promptTemplateRepository.update(
          {
            requestType: template.requestType,
            isDefault: true,
          },
          { isDefault: false },
        );
      }

      await this.promptTemplateRepository.update(templateId, {
        ...updateData,
        updatedAt: new Date(),
      });

      const updatedTemplate = await this.promptTemplateRepository.findOne({
        where: { id: templateId },
      });

      this.logger.log(`Updated prompt template: ${templateId}`);
      
      return updatedTemplate!;
    } catch (error) {
      this.logger.error(`Failed to update prompt template: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 获取模板列表
   */
  async getTemplates(
    requestType?: AiRequestType,
    status?: PromptTemplateStatus,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ templates: PromptTemplate[]; total: number }> {
    const where: any = {};
    
    if (requestType) {
      where.requestType = requestType;
    }
    
    if (status) {
      where.status = status;
    }

    const [templates, total] = await this.promptTemplateRepository.findAndCount({
      where,
      order: {
        isDefault: 'DESC',
        priority: 'DESC',
        usageCount: 'DESC',
        createdAt: 'DESC',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { templates, total };
  }

  /**
   * 删除Prompt模板
   */
  async deleteTemplate(templateId: string): Promise<void> {
    try {
      const template = await this.promptTemplateRepository.findOne({
        where: { id: templateId },
      });

      if (!template) {
        throw new BadRequestException('Prompt template not found');
      }

      // 不能删除默认模板
      if (template.isDefault) {
        throw new BadRequestException('Cannot delete default template');
      }

      await this.promptTemplateRepository.delete(templateId);
      
      this.logger.log(`Deleted prompt template: ${templateId}`);
    } catch (error) {
      this.logger.error(`Failed to delete prompt template: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 更新模板统计信息
   */
  async updateTemplateStats(
    templateId: string,
    processingTime: number,
    qualityScore?: number,
    success: boolean = true,
  ): Promise<void> {
    try {
      const template = await this.promptTemplateRepository.findOne({
        where: { id: templateId },
      });

      if (!template) {
        return;
      }

      // 计算新的平均值
      const totalRequests = template.usageCount;
      const currentAvgTime = template.avgProcessingTime || 0;
      const currentAvgQuality = template.avgQualityScore || 0;
      const currentSuccessRate = template.successRate || 0;

      const newAvgTime = totalRequests > 0 
        ? Math.round((currentAvgTime * totalRequests + processingTime) / (totalRequests + 1))
        : processingTime;

      let newAvgQuality = currentAvgQuality;
      if (qualityScore !== undefined) {
        newAvgQuality = totalRequests > 0
          ? (currentAvgQuality * totalRequests + qualityScore) / (totalRequests + 1)
          : qualityScore;
      }

      const successCount = Math.round(currentSuccessRate * totalRequests);
      const newSuccessCount = success ? successCount + 1 : successCount;
      const newSuccessRate = (newSuccessCount) / (totalRequests + 1);

      await this.promptTemplateRepository.update(templateId, {
        avgProcessingTime: newAvgTime,
        avgQualityScore: newAvgQuality,
        successRate: newSuccessRate,
      });

      this.logger.debug(`Updated stats for template ${templateId}`);
    } catch (error) {
      this.logger.error(`Failed to update template stats: ${error.message}`, error.stack);
    }
  }

  /**
   * 私有方法：增加使用计数
   */
  private async incrementUsageCount(templateId: string): Promise<void> {
    try {
      await this.promptTemplateRepository.increment(
        { id: templateId },
        'usageCount',
        1,
      );
    } catch (error) {
      this.logger.error(`Failed to increment usage count: ${error.message}`);
    }
  }

  /**
   * 测试模板渲染
   */
  async testTemplate(
    templateId: string,
    testData: any,
  ): Promise<{ prompt: string; validation: { valid: boolean; errors: string[] } }> {
    try {
      const template = await this.promptTemplateRepository.findOne({
        where: { id: templateId },
      });

      if (!template) {
        throw new BadRequestException('Prompt template not found');
      }

      const validation = template.validateInput(testData);
      let prompt = '';

      if (validation.valid) {
        prompt = await this.generatePrompt(template, testData);
      }

      return { prompt, validation };
    } catch (error) {
      this.logger.error(`Failed to test template: ${error.message}`, error.stack);
      throw error;
    }
  }
}