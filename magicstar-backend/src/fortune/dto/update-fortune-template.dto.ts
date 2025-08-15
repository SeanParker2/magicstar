import { PartialType } from '@nestjs/mapped-types';
import { CreateFortuneTemplateDto } from './create-fortune-template.dto';

export class UpdateFortuneTemplateDto extends PartialType(CreateFortuneTemplateDto) {}