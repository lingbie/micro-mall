-- myshop 数据库初始化脚本（由 Docker 容器挂载或手动执行）
-- 关键：强制客户端连接使用 utf8mb4，避免容器 locale=C 时 mysql 客户端默认
-- latin1 连接导致 UTF-8 中文被双重编码（mojibake）入库
SET NAMES utf8mb4;
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
  status TINYINT NOT NULL DEFAULT 1 COMMENT '1上架 0下架',
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

-- 二级分类：每个分类配独立细分图 cat_{大类}_{子类}.jpg（public/images/mock 已提供 36 张）
INSERT INTO category (name, parent_id, pic_url, sort) VALUES
  ('休闲零食', 1, '/images/mock/cat_food_snack.jpg', 1), ('生鲜水果', 1, '/images/mock/cat_food_fruit.jpg', 2),
  ('米面粮油', 1, '/images/mock/cat_food_grain.jpg', 3), ('酒水饮料', 1, '/images/mock/cat_food_drink.jpg', 4),
  ('调味品', 1, '/images/mock/cat_food_condiment.jpg', 5), ('速食方便', 1, '/images/mock/cat_food_instant.jpg', 6),
  ('男装', 2, '/images/mock/cat_cloth_mens.jpg', 1), ('女装', 2, '/images/mock/cat_cloth_womens.jpg', 2),
  ('童装', 2, '/images/mock/cat_cloth_kids.jpg', 3), ('内衣', 2, '/images/mock/cat_cloth_underwear.jpg', 4),
  ('鞋靴', 2, '/images/mock/cat_cloth_shoes.jpg', 5), ('配饰', 2, '/images/mock/cat_cloth_accessory.jpg', 6),
  ('手机', 3, '/images/mock/cat_digi_phone.jpg', 1), ('电脑', 3, '/images/mock/cat_digi_computer.jpg', 2),
  ('配件', 3, '/images/mock/cat_digi_accessory.jpg', 3), ('智能家居', 3, '/images/mock/cat_digi_smarthome.jpg', 4),
  ('数码外设', 3, '/images/mock/cat_digi_peripheral.jpg', 5), ('游戏机', 3, '/images/mock/cat_digi_game.jpg', 6),
  ('家具', 4, '/images/mock/cat_home_furniture.jpg', 1), ('家纺', 4, '/images/mock/cat_home_bedding.jpg', 2),
  ('厨具', 4, '/images/mock/cat_home_cookware.jpg', 3), ('收纳', 4, '/images/mock/cat_home_storage.jpg', 4),
  ('装饰', 4, '/images/mock/cat_home_decor.jpg', 5), ('灯具', 4, '/images/mock/cat_home_lamp.jpg', 6),
  ('奶粉', 5, '/images/mock/cat_baby_milk.jpg', 1), ('纸尿裤', 5, '/images/mock/cat_baby_diaper.jpg', 2),
  ('童装', 5, '/images/mock/cat_baby_cloth.jpg', 3), ('玩具', 5, '/images/mock/cat_baby_toy.jpg', 4),
  ('用品', 5, '/images/mock/cat_baby_supply.jpg', 5), ('辅食', 5, '/images/mock/cat_baby_food.jpg', 6),
  ('护肤', 6, '/images/mock/cat_beauty_skincare.jpg', 1), ('彩妆', 6, '/images/mock/cat_beauty_makeup.jpg', 2),
  ('香水', 6, '/images/mock/cat_beauty_perfume.jpg', 3), ('洗护', 6, '/images/mock/cat_beauty_wash.jpg', 4),
  ('面膜', 6, '/images/mock/cat_beauty_mask.jpg', 5), ('工具', 6, '/images/mock/cat_beauty_tool.jpg', 6);

-- 商品：每个二级分类 4 个商品（共 144 个），每个商品配专属图 goods_{二级分类id}_{序号}.jpg
-- 价格按大类设定合理区间：食品15-102 / 服装49-234 / 数码199-1649 / 家居29-140 / 母婴39-174 / 美妆59-284
INSERT INTO goods (name, `desc`, price, sales, category_id, pic_url)
SELECT CONCAT(c.name, '精选商品', n.k),
       '品质优选，正品保障，七天无理由退换',
       ROUND(CASE c.parent_id
         WHEN 1 THEN 15 + (ROW_NUMBER() OVER (PARTITION BY c.parent_id ORDER BY c.id) - 1) * 12 + (n.k - 1) * 9
         WHEN 2 THEN 49 + (ROW_NUMBER() OVER (PARTITION BY c.parent_id ORDER BY c.id) - 1) * 25 + (n.k - 1) * 20
         WHEN 3 THEN 199 + (ROW_NUMBER() OVER (PARTITION BY c.parent_id ORDER BY c.id) - 1) * 200 + (n.k - 1) * 150
         WHEN 4 THEN 29 + (ROW_NUMBER() OVER (PARTITION BY c.parent_id ORDER BY c.id) - 1) * 15 + (n.k - 1) * 12
         WHEN 5 THEN 39 + (ROW_NUMBER() OVER (PARTITION BY c.parent_id ORDER BY c.id) - 1) * 18 + (n.k - 1) * 15
         WHEN 6 THEN 59 + (ROW_NUMBER() OVER (PARTITION BY c.parent_id ORDER BY c.id) - 1) * 30 + (n.k - 1) * 25
       END, 2),
       FLOOR(100 + RAND() * 900),
       c.id,
       CONCAT('/images/mock/goods_', c.id, '_', n.k, '.jpg')
FROM category c
CROSS JOIN (SELECT 1 AS k UNION SELECT 2 UNION SELECT 3 UNION SELECT 4) n
WHERE c.parent_id != 0;

-- 按网上真实价格参考更新商品价格（144 个，2026-09 京东/天猫主流区间）
UPDATE goods SET price = CASE id
  WHEN 1 THEN 59.90
  WHEN 2 THEN 12.90
  WHEN 3 THEN 19.90
  WHEN 4 THEN 25.90
  WHEN 5 THEN 89.90
  WHEN 6 THEN 49.90
  WHEN 7 THEN 45.90
  WHEN 8 THEN 39.90
  WHEN 9 THEN 49.90
  WHEN 10 THEN 29.90
  WHEN 11 THEN 129.00
  WHEN 12 THEN 35.90
  WHEN 13 THEN 89.00
  WHEN 14 THEN 49.90
  WHEN 15 THEN 39.90
  WHEN 16 THEN 29.90
  WHEN 17 THEN 19.90
  WHEN 18 THEN 15.90
  WHEN 19 THEN 5.90
  WHEN 20 THEN 12.90
  WHEN 21 THEN 16.90
  WHEN 22 THEN 24.90
  WHEN 23 THEN 29.90
  WHEN 24 THEN 25.90
  WHEN 25 THEN 119.00
  WHEN 26 THEN 199.00
  WHEN 27 THEN 59.00
  WHEN 28 THEN 129.00
  WHEN 29 THEN 159.00
  WHEN 30 THEN 129.00
  WHEN 31 THEN 109.00
  WHEN 32 THEN 399.00
  WHEN 33 THEN 49.90
  WHEN 34 THEN 59.90
  WHEN 35 THEN 69.90
  WHEN 36 THEN 69.90
  WHEN 37 THEN 89.00
  WHEN 38 THEN 39.90
  WHEN 39 THEN 69.90
  WHEN 40 THEN 49.90
  WHEN 41 THEN 129.00
  WHEN 42 THEN 199.00
  WHEN 43 THEN 259.00
  WHEN 44 THEN 69.00
  WHEN 45 THEN 199.00
  WHEN 46 THEN 129.00
  WHEN 47 THEN 99.00
  WHEN 48 THEN 149.00
  WHEN 49 THEN 2999.00
  WHEN 50 THEN 1999.00
  WHEN 51 THEN 1699.00
  WHEN 52 THEN 2599.00
  WHEN 53 THEN 4999.00
  WHEN 54 THEN 7499.00
  WHEN 55 THEN 3299.00
  WHEN 56 THEN 3499.00
  WHEN 57 THEN 19.90
  WHEN 58 THEN 29.90
  WHEN 59 THEN 39.90
  WHEN 60 THEN 199.00
  WHEN 61 THEN 149.00
  WHEN 62 THEN 249.00
  WHEN 63 THEN 899.00
  WHEN 64 THEN 1999.00
  WHEN 65 THEN 249.00
  WHEN 66 THEN 59.00
  WHEN 67 THEN 69.00
  WHEN 68 THEN 89.00
  WHEN 69 THEN 249.00
  WHEN 70 THEN 1699.00
  WHEN 71 THEN 2999.00
  WHEN 72 THEN 199.00
  WHEN 73 THEN 2599.00
  WHEN 74 THEN 2299.00
  WHEN 75 THEN 1799.00
  WHEN 76 THEN 499.00
  WHEN 77 THEN 79.00
  WHEN 78 THEN 159.00
  WHEN 79 THEN 39.90
  WHEN 80 THEN 199.00
  WHEN 81 THEN 129.00
  WHEN 82 THEN 159.00
  WHEN 83 THEN 89.00
  WHEN 84 THEN 49.90
  WHEN 85 THEN 39.90
  WHEN 86 THEN 299.00
  WHEN 87 THEN 19.90
  WHEN 88 THEN 9.90
  WHEN 89 THEN 69.00
  WHEN 90 THEN 39.90
  WHEN 91 THEN 59.00
  WHEN 92 THEN 199.00
  WHEN 93 THEN 259.00
  WHEN 94 THEN 299.00
  WHEN 95 THEN 149.00
  WHEN 96 THEN 219.00
  WHEN 97 THEN 189.00
  WHEN 98 THEN 229.00
  WHEN 99 THEN 219.00
  WHEN 100 THEN 269.00
  WHEN 101 THEN 89.00
  WHEN 102 THEN 99.00
  WHEN 103 THEN 29.90
  WHEN 104 THEN 25.90
  WHEN 105 THEN 69.00
  WHEN 106 THEN 59.00
  WHEN 107 THEN 29.90
  WHEN 108 THEN 79.00
  WHEN 109 THEN 89.00
  WHEN 110 THEN 99.00
  WHEN 111 THEN 49.90
  WHEN 112 THEN 39.90
  WHEN 113 THEN 79.00
  WHEN 114 THEN 29.90
  WHEN 115 THEN 129.00
  WHEN 116 THEN 1299.00
  WHEN 117 THEN 39.90
  WHEN 118 THEN 49.90
  WHEN 119 THEN 35.90
  WHEN 120 THEN 19.90
  WHEN 121 THEN 169.00
  WHEN 122 THEN 129.00
  WHEN 123 THEN 89.00
  WHEN 124 THEN 59.00
  WHEN 125 THEN 129.00
  WHEN 126 THEN 159.00
  WHEN 127 THEN 179.00
  WHEN 128 THEN 59.00
  WHEN 129 THEN 199.00
  WHEN 130 THEN 159.00
  WHEN 131 THEN 219.00
  WHEN 132 THEN 129.00
  WHEN 133 THEN 19.90
  WHEN 134 THEN 79.00
  WHEN 135 THEN 59.00
  WHEN 136 THEN 39.90
  WHEN 137 THEN 59.00
  WHEN 138 THEN 39.90
  WHEN 139 THEN 49.90
  WHEN 140 THEN 45.90
  WHEN 141 THEN 99.00
  WHEN 142 THEN 19.90
  WHEN 143 THEN 15.90
  WHEN 144 THEN 49.90
END;

-- 按商品图内容更新为具体商品名（144 个）
UPDATE goods SET name = CASE id
  WHEN 1 THEN '每日坚果礼盒'
  WHEN 2 THEN '原味香脆薯片'
  WHEN 3 THEN '奶油夹心饼干'
  WHEN 4 THEN '蜜饯综合果脯'
  WHEN 5 THEN '时令鲜果礼盒'
  WHEN 6 THEN '新鲜葡萄草莓'
  WHEN 7 THEN '沙瓤西瓜哈密瓜'
  WHEN 8 THEN '翠冠梨猕猴桃'
  WHEN 9 THEN '东北珍珠香米'
  WHEN 10 THEN '低筋小麦面粉'
  WHEN 11 THEN '一级压榨花生油'
  WHEN 12 THEN '五谷杂粮组合'
  WHEN 13 THEN '精酿原浆啤酒'
  WHEN 14 THEN '冰爽可乐'
  WHEN 15 THEN 'NFC鲜榨橙汁'
  WHEN 16 THEN '天然饮用矿泉水'
  WHEN 17 THEN '特级酿造酱油'
  WHEN 18 THEN '上等蚝油'
  WHEN 19 THEN '加碘精制食盐'
  WHEN 20 THEN '老冰糖调味罐'
  WHEN 21 THEN '红烧牛肉方便面'
  WHEN 22 THEN '自热麻辣火锅'
  WHEN 23 THEN '手工猪肉水饺'
  WHEN 24 THEN '即食燕麦片'
  WHEN 25 THEN '商务免烫衬衫'
  WHEN 26 THEN '休闲连帽夹克'
  WHEN 27 THEN '纯棉圆领T恤'
  WHEN 28 THEN '修身休闲长裤'
  WHEN 29 THEN '碎花雪纺连衣裙'
  WHEN 30 THEN '高腰百褶半身裙'
  WHEN 31 THEN '温柔针织开衫'
  WHEN 32 THEN '双面呢大衣'
  WHEN 33 THEN '卡通印花童T恤'
  WHEN 34 THEN '儿童连帽卫衣'
  WHEN 35 THEN '新生儿连体衣'
  WHEN 36 THEN '儿童直筒牛仔裤'
  WHEN 37 THEN '无钢圈舒适文胸'
  WHEN 38 THEN '舒适家居裤'
  WHEN 39 THEN '纯棉睡袍上衣'
  WHEN 40 THEN '长袖家居衫'
  WHEN 41 THEN '经典小白鞋'
  WHEN 42 THEN '商务牛津皮鞋'
  WHEN 43 THEN '英伦磨砂短靴'
  WHEN 44 THEN '休闲帆布鞋'
  WHEN 45 THEN '精钢石英腕表'
  WHEN 46 THEN '偏光太阳镜'
  WHEN 47 THEN '头层牛皮腰带'
  WHEN 48 THEN '针织羊绒围巾'
  WHEN 49 THEN '曜石黑三摄手机'
  WHEN 50 THEN '皓月白全面屏手机'
  WHEN 51 THEN '海蓝渐变手机'
  WHEN 52 THEN '星黛紫三摄手机'
  WHEN 53 THEN '超轻薄笔记本电脑'
  WHEN 54 THEN '电竞台式主机'
  WHEN 55 THEN '平板电脑'
  WHEN 56 THEN '27英寸一体机'
  WHEN 57 THEN '快充Type-C数据线'
  WHEN 58 THEN '20W电源适配器'
  WHEN 59 THEN '透明防摔手机壳'
  WHEN 60 THEN '真无线蓝牙耳机'
  WHEN 61 THEN '智能语音音箱'
  WHEN 62 THEN '云台监控摄像头'
  WHEN 63 THEN '智能指纹门锁'
  WHEN 64 THEN '智能扫地机器人'
  WHEN 65 THEN '青轴机械键盘'
  WHEN 66 THEN '静音有线鼠标'
  WHEN 67 THEN '铝合金手机支架'
  WHEN 68 THEN '八合一扩展坞'
  WHEN 69 THEN '无线蓝牙手柄'
  WHEN 70 THEN '掌上游戏机'
  WHEN 71 THEN '家用游戏主机'
  WHEN 72 THEN '怀旧游戏卡带'
  WHEN 73 THEN '北欧布艺双人沙发'
  WHEN 74 THEN '实木床架'
  WHEN 75 THEN '实木餐桌椅组合'
  WHEN 76 THEN '白色收纳置物柜'
  WHEN 77 THEN '加厚法兰绒毛毯'
  WHEN 78 THEN '全棉保暖冬被'
  WHEN 79 THEN '北欧抱枕'
  WHEN 80 THEN '乳胶床垫'
  WHEN 81 THEN '麦饭石不粘锅'
  WHEN 82 THEN '不锈钢汤锅'
  WHEN 83 THEN '家用斩切菜刀'
  WHEN 84 THEN '整竹砧板'
  WHEN 85 THEN '透明带盖收纳盒'
  WHEN 86 THEN '多层抽屉收纳柜'
  WHEN 87 THEN '实木晾衣架'
  WHEN 88 THEN '加厚密封保鲜袋'
  WHEN 89 THEN '北欧陶瓷花瓶'
  WHEN 90 THEN '简约木质相框'
  WHEN 91 THEN '创意陶瓷摆件'
  WHEN 92 THEN '北欧几何地毯'
  WHEN 93 THEN '极简落地灯'
  WHEN 94 THEN '北欧双层吊灯'
  WHEN 95 THEN '护眼阅读台灯'
  WHEN 96 THEN 'LED吸顶灯'
  WHEN 97 THEN '婴幼儿配方奶粉'
  WHEN 98 THEN '金装幼儿奶粉'
  WHEN 99 THEN '蓝罐儿童奶粉'
  WHEN 100 THEN '有机生牛乳奶粉'
  WHEN 101 THEN '超薄透气拉拉裤'
  WHEN 102 THEN '云柔亲肤拉拉裤'
  WHEN 103 THEN '婴儿手口湿巾'
  WHEN 104 THEN '纯棉纱布方巾'
  WHEN 105 THEN '新生儿纯棉连体衣'
  WHEN 106 THEN '婴儿短袖连体衣'
  WHEN 107 THEN '婴儿针织帽'
  WHEN 108 THEN '软底学步鞋'
  WHEN 109 THEN '益智拼搭积木'
  WHEN 110 THEN '毛绒泰迪熊'
  WHEN 111 THEN '木质早教拼图'
  WHEN 112 THEN '婴儿摇铃玩具'
  WHEN 113 THEN '宽口径玻璃奶瓶'
  WHEN 114 THEN '硅胶安抚奶嘴'
  WHEN 115 THEN '恒温温奶器'
  WHEN 116 THEN '实木婴儿床'
  WHEN 117 THEN '高铁钙米粉'
  WHEN 118 THEN '水果果泥吸吸袋'
  WHEN 119 THEN '宝宝辅食碗勺'
  WHEN 120 THEN '磨牙小饼干'
  WHEN 121 THEN '焕活修护精华油'
  WHEN 122 THEN '玻尿酸保湿面霜'
  WHEN 123 THEN '清爽平衡爽肤水'
  WHEN 124 THEN '氨基酸温和洁面乳'
  WHEN 125 THEN '丝绒雾面口红'
  WHEN 126 THEN '九色大地眼影盘'
  WHEN 127 THEN '持妆奶油粉底液'
  WHEN 128 THEN '蜜桃腮红'
  WHEN 129 THEN '蝴蝶结淡香水'
  WHEN 130 THEN '经典圆形香水'
  WHEN 131 THEN '菱格邂逅香氛'
  WHEN 132 THEN '清新方形香水'
  WHEN 133 THEN '按压式滋润洗手液'
  WHEN 134 THEN '摩洛哥护发精油'
  WHEN 135 THEN '保湿滋润身体乳'
  WHEN 136 THEN '香氛沐浴露'
  WHEN 137 THEN '玻尿酸补水面膜'
  WHEN 138 THEN '免洗睡眠面膜'
  WHEN 139 THEN '清洁控油泥膜'
  WHEN 140 THEN '舒缓紧致眼膜'
  WHEN 141 THEN '专业化妆刷套装'
  WHEN 142 THEN '干湿两用美妆蛋'
  WHEN 143 THEN '不锈钢美容镊'
  WHEN 144 THEN '带灯化妆镜'
END;

-- 商品相册：第 1 张用商品专属图（轮播首图差异化），第 2/3 张用分类细分图
INSERT INTO goods_album (goods_id, pic_url, sort)
SELECT g.id, CONCAT('/images/mock/goods_', c.id, '_', t.k, '.jpg'), 1
FROM goods g
JOIN category c ON g.category_id = c.id
JOIN (SELECT id, ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY id) AS k FROM goods) t ON t.id = g.id;
INSERT INTO goods_album (goods_id, pic_url, sort)
SELECT g.id, c.pic_url, 2 FROM goods g JOIN category c ON g.category_id = c.id;
INSERT INTO goods_album (goods_id, pic_url, sort)
SELECT g.id, c.pic_url, 3 FROM goods g JOIN category c ON g.category_id = c.id;
