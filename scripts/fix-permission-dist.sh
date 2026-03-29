#!/bin/bash
# fix-permission-dist.sh

echo "=== Fixing Permission Error for dist folder ==="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# 1. Kiểm tra user hiện tại
echo -e "${BLUE}1. Current user:${NC}"
CURRENT_USER=$(whoami)
echo "User: $CURRENT_USER"

# 2. Dừng các process Node.js đang chạy
echo -e "\n${BLUE}2. Stopping Node.js processes...${NC}"
pkill -f "node.*nest" 2>/dev/null || true
sleep 2

# 3. Xóa thư mục dist
echo -e "\n${BLUE}3. Removing dist folder...${NC}"

if [ -d "dist" ]; then
    # Kiểm tra quyền
    if [ -w "dist" ]; then
        rm -rf dist
        echo -e "${GREEN}✓ dist removed${NC}"
    else
        echo -e "${YELLOW}⚠ Cannot remove dist, using sudo...${NC}"
        sudo rm -rf dist
        echo -e "${GREEN}✓ dist removed with sudo${NC}"
    fi
else
    echo -e "${GREEN}✓ dist folder not exists${NC}"
fi

# 4. Xóa cache
echo -e "\n${BLUE}4. Removing cache...${NC}"
rm -rf .nest-cache node_modules/.cache 2>/dev/null || true
echo -e "${GREEN}✓ Cache removed${NC}"

# 5. Fix ownership toàn bộ dự án
echo -e "\n${BLUE}5. Fixing ownership...${NC}"
sudo chown -R $CURRENT_USER:$CURRENT_USER /home/liuliu/luu/BE/gold-track-vn 2>/dev/null || true
echo -e "${GREEN}✓ Ownership fixed${NC}"

# 6. Fix permissions
echo -e "\n${BLUE}6. Fixing permissions...${NC}"
chmod -R u+rw /home/liuliu/luu/BE/gold-track-vn 2>/dev/null || true
echo -e "${GREEN}✓ Permissions fixed${NC}"

# 7. Generate Prisma Client
echo -e "\n${BLUE}7. Generating Prisma Client...${NC}"
npx prisma generate
echo -e "${GREEN}✓ Prisma Client generated${NC}"

# 8. Chạy lại
echo -e "\n${BLUE}8. Starting NestJS...${NC}"
npm run start:dev

echo -e "\n${GREEN}=== Fix completed ===${NC}"
#chmod +x fix-permission-dist.sh
#/fix-permission-dist.sh