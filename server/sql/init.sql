-- myshop 数据库初始化脚本（由 Docker 容器挂载或手动执行）
CREATE DATABASE IF NOT EXISTS myshop DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE myshop;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(32) NOT NULL UNIQUE,
  password VARCHAR(128) NOT NULL COMMENT 'scrypt 存储: salt:hash',
  avatar VARCHAR(255) DEFAULT '/images/avatar1.jpg',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 分类表（parent_id=0 为一级分类，否则为二级分类）
CREATE TABLE IF NOT EXISTS category (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(32) NOT NULL,
  parent_id INT NOT NULL DEFAULT 0,
  pic_url VARCHAR(255) DEFAULT '',
  sort INT DEFAULT 0,
  KEY idx_parent (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 商品表
CREATE TABLE IF NOT EXISTS goods (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(64) NOT NULL,
  `desc` VARCHAR(255) DEFAULT '',
  pic_url VARCHAR(255) DEFAULT NULL COMMENT '商品专属图',
  price DECIMAL(10,2) NOT NULL,
  sales INT NOT NULL DEFAULT 0,
  stock INT NOT NULL DEFAULT 500 COMMENT '库存',
  category_id INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_category (category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 商品相册表
CREATE TABLE IF NOT EXISTS goods_album (
  id INT AUTO_INCREMENT PRIMARY KEY,
  goods_id INT NOT NULL,
  pic_url VARCHAR(255) NOT NULL,
  sort INT DEFAULT 0,
  KEY idx_goods (goods_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 购物车表
CREATE TABLE IF NOT EXISTS cart (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  goods_id INT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_goods (user_id, goods_id),
  KEY idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 订单表（status: 0待付款 1待发货 2已完成 3已取消）
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_no VARCHAR(32) NOT NULL UNIQUE,
  user_id INT NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status TINYINT NOT NULL DEFAULT 0,
  receiver_name VARCHAR(32) NOT NULL DEFAULT '',
  receiver_phone VARCHAR(20) NOT NULL DEFAULT '',
  receiver_address VARCHAR(255) NOT NULL DEFAULT '',
  remark VARCHAR(255) DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 订单明细表
CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  goods_id INT NOT NULL,
  goods_name VARCHAR(64) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  quantity INT NOT NULL,
  pic_url VARCHAR(255) DEFAULT '',
  KEY idx_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ================= 种子数据 =================
-- 一级分类
INSERT INTO category (id, name, parent_id, sort) VALUES
  (1, '食品', 0, 1),
  (2, '服装', 0, 2),
  (3, '数码', 0, 3),
  (4, '家居', 0, 4),
  (5, '母婴', 0, 5),
  (6, '美妆', 0, 6);

-- 二级分类（图片用 mock 阶段生成的分类图，上线时替换为真实商品图）
INSERT INTO category (name, parent_id, pic_url, sort) VALUES
  ('休闲零食', 1, '/images/mock/food.jpg', 1), ('生鲜水果', 1, '/images/mock/food.jpg', 2),
  ('米面粮油', 1, '/images/mock/food.jpg', 3), ('酒水饮料', 1, '/images/mock/food.jpg', 4),
  ('调味品', 1, '/images/mock/food.jpg', 5), ('速食方便', 1, '/images/mock/food.jpg', 6),
  ('男装', 2, '/images/mock/clothing.jpg', 1), ('女装', 2, '/images/mock/clothing.jpg', 2),
  ('童装', 2, '/images/mock/clothing.jpg', 3), ('内衣', 2, '/images/mock/clothing.jpg', 4),
  ('鞋靴', 2, '/images/mock/clothing.jpg', 5), ('配饰', 2, '/images/mock/clothing.jpg', 6),
  ('手机', 3, '/images/mock/digital.jpg', 1), ('电脑', 3, '/images/mock/digital.jpg', 2),
  ('配件', 3, '/images/mock/digital.jpg', 3), ('智能家居', 3, '/images/mock/digital.jpg', 4),
  ('数码外设', 3, '/images/mock/digital.jpg', 5), ('游戏机', 3, '/images/mock/digital.jpg', 6),
  ('家具', 4, '/images/mock/home.jpg', 1), ('家纺', 4, '/images/mock/home.jpg', 2),
  ('厨具', 4, '/images/mock/home.jpg', 3), ('收纳', 4, '/images/mock/home.jpg', 4),
  ('装饰', 4, '/images/mock/home.jpg', 5), ('灯具', 4, '/images/mock/home.jpg', 6),
  ('奶粉', 5, '/images/mock/baby.jpg', 1), ('纸尿裤', 5, '/images/mock/baby.jpg', 2),
  ('童装', 5, '/images/mock/baby.jpg', 3), ('玩具', 5, '/images/mock/baby.jpg', 4),
  ('用品', 5, '/images/mock/baby.jpg', 5), ('辅食', 5, '/images/mock/baby.jpg', 6),
  ('护肤', 6, '/images/mock/beauty.jpg', 1), ('彩妆', 6, '/images/mock/beauty.jpg', 2),
  ('香水', 6, '/images/mock/beauty.jpg', 3), ('洗护', 6, '/images/mock/beauty.jpg', 4),
  ('面膜', 6, '/images/mock/beauty.jpg', 5), ('工具', 6, '/images/mock/beauty.jpg', 6);

-- 商品：每个二级分类 4 个商品（共 144 个）
INSERT INTO goods (name, `desc`, price, sales, category_id)
SELECT CONCAT(c.name, '精选商品', n.k),
       '品质优选，正品保障，七天无理由退换',
       ROUND(19.90 + (c.id * 100 + n.k) * 3.70, 2),
       FLOOR(100 + RAND() * 900),
       c.id
FROM category c
CROSS JOIN (SELECT 1 AS k UNION SELECT 2 UNION SELECT 3 UNION SELECT 4) n
WHERE c.parent_id != 0;

-- 商品相册：每商品 3 张同分类图
INSERT INTO goods_album (goods_id, pic_url, sort)
SELECT g.id, c.pic_url, 1 FROM goods g JOIN category c ON g.category_id = c.id;
INSERT INTO goods_album (goods_id, pic_url, sort)
SELECT g.id, c.pic_url, 2 FROM goods g JOIN category c ON g.category_id = c.id;
INSERT INTO goods_album (goods_id, pic_url, sort)
SELECT g.id, c.pic_url, 3 FROM goods g JOIN category c ON g.category_id = c.id;
