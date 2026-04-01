#!/bin/bash
# 一键部署分销系统到服务器
# 使用方法: 在服务器上执行
#   bash deploy.sh
# 前提: 服务器需要安装 git, go (1.21+), node (18+)

set -e

APP_NAME="fenxiao"
APP_DIR="/opt/$APP_NAME"
PORT=9000

echo "=============================="
echo "  分销系统部署脚本"
echo "=============================="

# 1. 检查/安装依赖
echo ""
echo "[1/6] 检查依赖..."

# 安装 Go (如果没有)
if ! command -v go &>/dev/null; then
    echo "安装 Go..."
    wget -q https://go.dev/dl/go1.22.2.linux-amd64.tar.gz -O /tmp/go.tar.gz
    rm -rf /usr/local/go
    tar -C /usr/local -xzf /tmp/go.tar.gz
    rm /tmp/go.tar.gz
    export PATH=$PATH:/usr/local/go/bin
    echo 'export PATH=$PATH:/usr/local/go/bin' >> /etc/profile
    echo "Go 已安装: $(go version)"
else
    echo "Go 已存在: $(go version)"
fi

# 安装 Node.js (如果没有)
if ! command -v node &>/dev/null; then
    echo "安装 Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
    echo "Node.js 已安装: $(node --version)"
else
    echo "Node.js 已存在: $(node --version)"
fi

# 安装 git (如果没有)
if ! command -v git &>/dev/null; then
    apt-get update && apt-get install -y git
fi

# 2. 克隆/更新代码
echo ""
echo "[2/6] 获取代码..."
if [ -d "$APP_DIR" ]; then
    cd "$APP_DIR"
    git fetch origin
    git checkout claude/general-session-pYsQs
    git pull origin claude/general-session-pYsQs
else
    git clone -b claude/general-session-pYsQs https://github.com/dr-eason/fenxiao.git "$APP_DIR"
    cd "$APP_DIR"
fi

# 3. 构建前端
echo ""
echo "[3/6] 构建前端..."
cd "$APP_DIR/frontend"
npm install
npm run build

# 4. 构建后端
echo ""
echo "[4/6] 构建后端..."
cd "$APP_DIR"
export GOPROXY=https://goproxy.io,direct
go build -o "$APP_NAME" .
echo "后端编译完成"

# 5. 创建 systemd 服务
echo ""
echo "[5/6] 配置系统服务..."
cat > /etc/systemd/system/$APP_NAME.service <<SVCEOF
[Unit]
Description=Fenxiao Distribution System
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$APP_DIR
Environment=PORT=$PORT
Environment=GIN_MODE=release
ExecStart=$APP_DIR/$APP_NAME
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SVCEOF

systemctl daemon-reload

# 6. 启动服务
echo ""
echo "[6/6] 启动服务..."
systemctl stop $APP_NAME 2>/dev/null || true
systemctl start $APP_NAME
systemctl enable $APP_NAME

echo ""
echo "=============================="
echo "  部署完成!"
echo "=============================="
echo "  访问地址: http://$(hostname -I | awk '{print $1}'):$PORT"
echo "  管理后台: http://$(hostname -I | awk '{print $1}'):$PORT/admin/login"
echo "  管理账号: admin / admin123"
echo ""
echo "  常用命令:"
echo "    查看状态: systemctl status $APP_NAME"
echo "    查看日志: journalctl -u $APP_NAME -f"
echo "    重启服务: systemctl restart $APP_NAME"
echo "=============================="
