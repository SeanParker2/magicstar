# 使用官方Node.js运行时作为基础镜像
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制package.json和package-lock.json
COPY package*.json ./
COPY yarn.lock ./

# 安装依赖
RUN npm install -g yarn && yarn install --frozen-lockfile

# 复制源代码
COPY . .

# 构建H5版本
RUN yarn build:h5

# 生产环境镜像 - 使用nginx提供静态文件服务
FROM nginx:alpine AS production

# 复制nginx配置
COPY nginx.conf /etc/nginx/nginx.conf

# 从builder阶段复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 暴露端口
EXPOSE 80

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

# 启动nginx
CMD ["nginx", "-g", "daemon off;"]