ALTER TABLE myshop.goods ADD COLUMN pic_url VARCHAR(255) DEFAULT NULL COMMENT '商品图片' AFTER `desc`;
UPDATE myshop.goods g JOIN (SELECT id, ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY id) AS rn FROM myshop.goods) t ON t.id = g.id SET g.pic_url = CONCAT('/images/mock/goods_', g.category_id, '_', t.rn, '.jpg');
SELECT COUNT(*) AS total_with_pic FROM myshop.goods WHERE pic_url IS NOT NULL;