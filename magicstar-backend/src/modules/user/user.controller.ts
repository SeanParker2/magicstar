import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { ResponseDto, PaginatedResponseDto } from '../../common/dto/response.dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { Public } from '../../decorators/public.decorator';
import { CurrentUser } from '../../decorators/user.decorator';
import { User } from './entities/user.entity';

@ApiTags('用户管理')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @Public()
  @ApiOperation({ summary: '创建用户' })
  @ApiResponse({
    status: 201,
    description: '用户创建成功',
    type: ResponseDto<User>,
  })
  async create(@Body() createUserDto: CreateUserDto) {
    const user = await this.userService.create(createUserDto);
    return ResponseDto.success(user, '用户创建成功');
  }

  @Get()
  @ApiOperation({ summary: '获取用户列表' })
  @ApiQuery({ type: PaginationQueryDto })
  @ApiResponse({
    status: 200,
    description: '获取用户列表成功',
    type: PaginatedResponseDto<User>,
  })
  async findAll(@Query() query: PaginationQueryDto) {
    const { users, pagination } = await this.userService.findAll(query);
    return new PaginatedResponseDto(users, pagination);
  }

  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前用户信息' })
  @ApiResponse({
    status: 200,
    description: '获取用户信息成功',
    type: ResponseDto<User>,
  })
  async getProfile(@CurrentUser() user: User) {
    return ResponseDto.success(user, '获取用户信息成功');
  }

  @Get(':id')
  @ApiOperation({ summary: '根据ID获取用户' })
  @ApiResponse({
    status: 200,
    description: '获取用户成功',
    type: ResponseDto<User>,
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const user = await this.userService.findOne(id);
    return ResponseDto.success(user, '获取用户成功');
  }

  @Patch('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新当前用户信息' })
  @ApiResponse({
    status: 200,
    description: '用户信息更新成功',
    type: ResponseDto<User>,
  })
  async updateProfile(
    @CurrentUser() user: User,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const updatedUser = await this.userService.update(user.id, updateUserDto);
    return ResponseDto.success(updatedUser, '用户信息更新成功');
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新用户信息' })
  @ApiResponse({
    status: 200,
    description: '用户信息更新成功',
    type: ResponseDto<User>,
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const user = await this.userService.update(id, updateUserDto);
    return ResponseDto.success(user, '用户信息更新成功');
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除用户' })
  @ApiResponse({
    status: 200,
    description: '用户删除成功',
    type: ResponseDto,
  })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.userService.remove(id);
    return ResponseDto.success(null, '用户删除成功');
  }
}