-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS magicstar CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS magicstar_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 使用生产数据库
USE magicstar;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nickname VARCHAR(50),
    avatar_url VARCHAR(255),
    phone VARCHAR(20),
    birth_date DATE,
    gender ENUM('male', 'female', 'other'),
    status ENUM('active', 'inactive', 'banned') DEFAULT 'active',
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 用户配置表
CREATE TABLE IF NOT EXISTS user_profiles (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    timezone VARCHAR(50) DEFAULT 'Asia/Shanghai',
    language VARCHAR(10) DEFAULT 'zh-CN',
    theme VARCHAR(20) DEFAULT 'light',
    notification_settings JSON,
    privacy_settings JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uk_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 角色表
CREATE TABLE IF NOT EXISTS roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    permissions JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 用户角色关联表
CREATE TABLE IF NOT EXISTS user_roles (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    role_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    UNIQUE KEY uk_user_role (user_id, role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 插入默认角色
INSERT INTO roles (name, description, permissions) VALUES 
('admin', '系统管理员', '["*"]'),
('user', '普通用户', '["user:read", "user:update"]'),
('vip', 'VIP用户', '["user:read", "user:update", "divination:premium"]')
ON DUPLICATE KEY UPDATE description=VALUES(description);

-- 使用开发数据库
USE magicstar_dev;

-- 复制相同的表结构到开发数据库
CREATE TABLE IF NOT EXISTS users LIKE magicstar.users;
CREATE TABLE IF NOT EXISTS user_profiles LIKE magicstar.user_profiles;
CREATE TABLE IF NOT EXISTS roles LIKE magicstar.roles;
CREATE TABLE IF NOT EXISTS user_roles LIKE magicstar.user_roles;

-- 插入开发环境的默认角色
INSERT INTO roles (name, description, permissions) VALUES 
('admin', '系统管理员', '["*"]'),
('user', '普通用户', '["user:read", "user:update"]'),
('vip', 'VIP用户', '["user:read", "user:update", "divination:premium"]')
ON DUPLICATE KEY UPDATE description=VALUES(description);

-- 插入测试用户（仅开发环境）
INSERT INTO users (username, email, password_hash, nickname, status, email_verified) VALUES 
('admin', 'admin@magicstar.com', '$2b$10$example.hash.for.development', '管理员', 'active', TRUE),
('testuser', 'test@magicstar.com', '$2b$10$example.hash.for.development', '测试用户', 'active', TRUE)
ON DUPLICATE KEY UPDATE nickname=VALUES(nickname);

-- 为测试用户分配角色
INSERT INTO user_roles (user_id, role_id) 
SELECT u.id, r.id FROM users u, roles r 
WHERE u.username = 'admin' AND r.name = 'admin'
ON DUPLICATE KEY UPDATE user_id=VALUES(user_id);

INSERT INTO user_roles (user_id, role_id) 
SELECT u.id, r.id FROM users u, roles r 
WHERE u.username = 'testuser' AND r.name = 'user'
ON DUPLICATE KEY UPDATE user_id=VALUES(user_id);