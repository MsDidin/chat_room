const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);
const path = require('path');

// 存储聊天历史消息（最多保留100条）
const messageHistory = [];
const MAX_HISTORY = 100;

// 存储在线用户
const onlineUsers = new Map();

// 提供静态文件
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Socket.io连接处理
io.on('connection', (socket) => {
  console.log('新用户连接:', socket.id);

  // 用户加入聊天室
  socket.on('join', (username) => {
    // 存储用户信息
    onlineUsers.set(socket.id, {
      id: socket.id,
      username: username,
      joinTime: new Date()
    });

    // 发送历史消息给新用户
    socket.emit('message history', messageHistory);

    // 通知所有人有新用户加入
    const joinMessage = {
      id: Date.now(),
      type: 'system',
      content: `${username} 加入了聊天室`,
      timestamp: new Date().toISOString()
    };

    addToHistory(joinMessage);
    io.emit('chat message', joinMessage);

    // 更新在线用户列表
    broadcastOnlineUsers();

    console.log(`${username} 加入聊天室`);
  });

  // 接收聊天消息
  socket.on('chat message', (data) => {
    const user = onlineUsers.get(socket.id);

    if (user) {
      const message = {
        id: Date.now(),
        type: 'user',
        username: user.username,
        content: data.message,
        timestamp: new Date().toISOString()
      };

      addToHistory(message);

      // 广播消息给所有用户
      io.emit('chat message', message);

      console.log(`${user.username}: ${data.message}`);
    }
  });

  // 用户正在输入
  socket.on('typing', () => {
    const user = onlineUsers.get(socket.id);
    if (user) {
      socket.broadcast.emit('user typing', user.username);
    }
  });

  // 用户停止输入
  socket.on('stop typing', () => {
    socket.broadcast.emit('user stop typing');
  });

  // 用户断开连接
  socket.on('disconnect', () => {
    const user = onlineUsers.get(socket.id);

    if (user) {
      const leaveMessage = {
        id: Date.now(),
        type: 'system',
        content: `${user.username} 离开了聊天室`,
        timestamp: new Date().toISOString()
      };

      addToHistory(leaveMessage);
      io.emit('chat message', leaveMessage);

      onlineUsers.delete(socket.id);
      broadcastOnlineUsers();

      console.log(`${user.username} 离开聊天室`);
    }
  });
});

// 添加消息到历史记录
function addToHistory(message) {
  messageHistory.push(message);

  // 保持历史消息数量在限制内
  if (messageHistory.length > MAX_HISTORY) {
    messageHistory.shift();
  }
}

// 广播在线用户列表
function broadcastOnlineUsers() {
  const users = Array.from(onlineUsers.values()).map(user => ({
    username: user.username,
    id: user.id
  }));

  io.emit('online users', users);
}

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`聊天室服务器运行在 http://localhost:${PORT}`);
});
