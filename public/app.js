// DOM元素
const loginContainer = document.getElementById('login-container');
const chatContainer = document.getElementById('chat-container');
const usernameInput = document.getElementById('username-input');
const joinBtn = document.getElementById('join-btn');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const messagesContainer = document.getElementById('messages-container');
const onlineUsersList = document.getElementById('online-users-list');
const userCount = document.getElementById('user-count');
const currentUsername = document.getElementById('current-username');
const typingIndicator = document.getElementById('typing-indicator');
const typingText = typingIndicator.querySelector('.typing-text');

// Socket.io连接
let socket;
let username = '';
let typingTimer;
let isTyping = false;

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    // 回车键加入聊天室
    usernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            joinChatRoom();
        }
    });

    // 点击按钮加入聊天室
    joinBtn.addEventListener('click', joinChatRoom);

    // 回车键发送消息
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    // 输入时触发正在输入事件
    messageInput.addEventListener('input', () => {
        if (!isTyping) {
            isTyping = true;
            socket.emit('typing');
        }

        clearTimeout(typingTimer);
        typingTimer = setTimeout(() => {
            isTyping = false;
            socket.emit('stop typing');
        }, 1000);
    });

    // 点击按钮发送消息
    sendBtn.addEventListener('click', sendMessage);
});

// 加入聊天室
function joinChatRoom() {
    const name = usernameInput.value.trim();

    if (name === '') {
        alert('请输入昵称');
        return;
    }

    username = name;

    // 初始化Socket.io连接
    socket = io();

    // 设置Socket事件监听
    setupSocketListeners();

    // 发送加入事件
    socket.emit('join', username);

    // 切换界面
    loginContainer.classList.add('hidden');
    chatContainer.classList.remove('hidden');

    // 启用输入框和发送按钮
    messageInput.disabled = false;
    sendBtn.disabled = false;

    // 聚焦到消息输入框
    messageInput.focus();

    // 显示当前用户名
    currentUsername.textContent = `当前用户: ${username}`;
}

// 设置Socket事件监听
function setupSocketListeners() {
    // 接收历史消息
    socket.on('message history', (messages) => {
        messages.forEach(message => {
            displayMessage(message);
        });
    });

    // 接收新消息
    socket.on('chat message', (message) => {
        displayMessage(message);
    });

    // 更新在线用户列表
    socket.on('online users', (users) => {
        updateOnlineUsers(users);
    });

    // 显示正在输入
    socket.on('user typing', (username) => {
        typingText.textContent = `${username} 正在输入...`;
        typingIndicator.classList.remove('hidden');
    });

    // 隐藏正在输入
    socket.on('user stop typing', () => {
        typingIndicator.classList.add('hidden');
    });

    // 连接错误处理
    socket.on('connect_error', () => {
        alert('连接服务器失败，请刷新页面重试');
    });

    // 断开连接处理
    socket.on('disconnect', () => {
        console.log('与服务器断开连接');
    });
}

// 发送消息
function sendMessage() {
    const message = messageInput.value.trim();

    if (message === '') {
        return;
    }

    // 发送消息到服务器
    socket.emit('chat message', { message });

    // 清空输入框
    messageInput.value = '';

    // 停止输入状态
    if (isTyping) {
        isTyping = false;
        socket.emit('stop typing');
    }

    // 重新聚焦输入框
    messageInput.focus();
}

// 显示消息
function displayMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';

    if (message.type === 'system') {
        // 系统消息
        messageDiv.classList.add('system');
        messageDiv.textContent = message.content;
    } else {
        // 用户消息
        messageDiv.classList.add('user');

        // 如果是自己的消息，添加特殊样式
        if (message.username === username) {
            messageDiv.classList.add('own');
        }

        const messageHeader = document.createElement('div');
        messageHeader.className = 'message-header';

        const usernameSpan = document.createElement('span');
        usernameSpan.className = 'message-username';
        usernameSpan.textContent = message.username;

        const timeSpan = document.createElement('span');
        timeSpan.className = 'message-time';
        timeSpan.textContent = formatTime(message.timestamp);

        messageHeader.appendChild(usernameSpan);
        messageHeader.appendChild(timeSpan);

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.textContent = message.content;

        messageDiv.appendChild(messageHeader);
        messageDiv.appendChild(contentDiv);
    }

    messagesContainer.appendChild(messageDiv);

    // 滚动到底部
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// 更新在线用户列表
function updateOnlineUsers(users) {
    onlineUsersList.innerHTML = '';
    userCount.textContent = users.length;

    users.forEach(user => {
        const li = document.createElement('li');
        li.textContent = user.username;

        // 如果是当前用户，添加标记
        if (user.username === username) {
            li.textContent += ' (我)';
            li.style.fontWeight = 'bold';
        }

        onlineUsersList.appendChild(li);
    });
}

// 格式化时间
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}
