class StoneMind {
    constructor() {
        this.boardSize = 9; // 固定为9x9棋盘
        this.cellSize = 50; // 9x9棋盘可以用更大的格子
        this.board = [];
        this.gameHistory = [];
        this.currentPlayer = 'black'; // 'black' or 'white'
        this.playerColor = 'black';
        this.aiColor = 'white';
        this.blackCaptured = 0;
        this.whiteCaptured = 0;
        this.apiKey = '';
        this.gameActive = false;
        this.aiThinking = false;
        this.previewMove = null; // 预览位置 {row, col}
        this.hoverMove = null; // 鼠标悬停预览位置
        this.isLandscape = false; // 是否横屏
        
        this.canvas = document.getElementById('board');
        this.ctx = this.canvas.getContext('2d');
        
        this.initializeBoard();
        this.bindEvents();
        this.updateDisplay();
        this.handleOrientationChange();
        this.requestLandscapeMode();
    }

    async requestLandscapeMode() {
        // 尝试使用 Screen Orientation API 锁定横屏
        if (screen.orientation && screen.orientation.lock) {
            try {
                await screen.orientation.lock('landscape');
                console.log('成功锁定为横屏模式');
            } catch (error) {
                console.log('无法锁定屏幕方向:', error.message);
                // 如果无法锁定，显示强制横屏提示
                this.showLandscapeRequest();
            }
        } else {
            console.log('浏览器不支持屏幕方向锁定API');
            this.showLandscapeRequest();
        }
    }

    showLandscapeRequest() {
        // 如果是移动设备且为竖屏，显示横屏请求
        if (this.isMobileDevice() && !this.isLandscape) {
            const requestElement = document.getElementById('landscape-request') || this.createLandscapeRequest();
            requestElement.style.display = 'flex';
        }
    }

    isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               (window.innerWidth <= 768 && 'ontouchstart' in window);
    }

    createLandscapeRequest() {
        const request = document.createElement('div');
        request.id = 'landscape-request';
        request.innerHTML = `
            <div class="landscape-message">
                <div class="phone-icon">📱➡️📱</div>
                <h3>请旋转设备</h3>
                <p>为了获得最佳围棋体验，请将设备旋转为横屏模式</p>
                <button id="force-landscape-btn" class="force-btn">强制横屏显示</button>
                <button id="continue-portrait-btn" class="continue-btn">继续竖屏模式</button>
            </div>
        `;
        
        request.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            color: white;
            text-align: center;
            font-family: inherit;
        `;
        
        document.body.appendChild(request);
        
        // 绑定按钮事件
        document.getElementById('force-landscape-btn').addEventListener('click', () => {
            this.enableForceLandscape();
            request.style.display = 'none';
        });
        
        document.getElementById('continue-portrait-btn').addEventListener('click', () => {
            request.style.display = 'none';
        });
        
        return request;
    }

    enableForceLandscape() {
        document.body.classList.add('force-landscape');
        document.querySelector('.container')?.classList.add('rotated');
        this.showRotationTip();
    }

    initializeBoard() {
        this.board = Array(this.boardSize).fill(null).map(() => Array(this.boardSize).fill(null));
        this.gameHistory = [];
        this.blackCaptured = 0;
        this.whiteCaptured = 0;
        this.currentPlayer = 'black';
        this.gameActive = true;
        this.aiThinking = false;
        this.previewMove = null;
        this.hoverMove = null;
        
        this.updateCanvasSize();
        this.drawBoard();
        this.updateDisplay();
        this.setupAvatars();
    }

    updateCanvasSize() {
        const padding = 30;
        const totalSize = this.boardSize * this.cellSize + padding * 2;
        
        // 获取设备像素比
        const dpr = window.devicePixelRatio || 1;
        
        // 设置Canvas的实际像素尺寸（考虑设备像素比）
        this.canvas.width = totalSize * dpr;
        this.canvas.height = totalSize * dpr;
        
        // 设置Canvas的显示尺寸
        this.canvas.style.width = totalSize + 'px';
        this.canvas.style.height = totalSize + 'px';
        
        // 缩放绘图上下文以匹配设备像素比
        this.ctx.scale(dpr, dpr);
        
        console.log('Canvas尺寸设置:', {
            总尺寸: totalSize,
            设备像素比: dpr,
            实际像素: `${this.canvas.width}x${this.canvas.height}`,
            显示尺寸: `${totalSize}x${totalSize}`,
            格子大小: this.cellSize
        });
    }

    bindEvents() {
        // 棋盘点击事件 - 同时支持触摸和鼠标事件
        this.canvas.addEventListener('pointerdown', (e) => this.handleBoardClick(e));
        this.canvas.addEventListener('touchstart', (e) => this.handleBoardClick(e), { passive: false });
        
        // 鼠标悬停预览
        this.canvas.addEventListener('mousemove', (e) => this.handleBoardHover(e));
        this.canvas.addEventListener('mouseleave', () => this.clearHoverPreview());
        
        // 控制按钮事件
        document.getElementById('new-game').addEventListener('click', () => this.newGame());
        document.getElementById('test-api').addEventListener('click', () => this.testApiKey());
        
        // 设置变更事件
        document.getElementById('player-color').addEventListener('change', (e) => {
            this.playerColor = e.target.value;
            this.aiColor = e.target.value === 'black' ? 'white' : 'black';
            this.setupAvatars(); // 重新设置头像
            this.newGame();
        });
        
        document.getElementById('api-key').addEventListener('input', (e) => {
            this.apiKey = e.target.value.trim();
            // 清除之前的状态显示
            this.clearApiStatus();
        });

        // 屏幕方向变化事件
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.handleOrientationChange(), 100);
        });
        
        // 窗口大小变化事件
        window.addEventListener('resize', () => {
            this.handleOrientationChange();
        });
    }

    async testApiKey() {
        const apiKey = document.getElementById('api-key').value.trim();
        const testButton = document.getElementById('test-api');
        const statusDiv = document.getElementById('api-status');
        
        if (!apiKey) {
            this.showApiStatus('请先输入 API Key', 'error');
            return;
        }
        
        // 显示测试中状态
        testButton.disabled = true;
        testButton.textContent = '测试中...';
        this.showApiStatus('正在验证 API Key...', 'testing');
        
        try {
            const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'deepseek-chat',
                    messages: [
                        {
                            role: 'user',
                            content: '测试连接'
                        }
                    ],
                    max_tokens: 10
                })
            });
            
            if (response.ok) {
                this.apiKey = apiKey;
                this.showApiStatus('✅ API Key 有效！可以开始对弈', 'success');
            } else {
                const errorData = await response.json();
                let errorMessage = 'API Key 无效';
                if (response.status === 401) {
                    errorMessage = '❌ API Key 无效或已过期';
                } else if (response.status === 429) {
                    errorMessage = '❌ API 请求频率过高，请稍后再试';
                } else if (errorData.error?.message) {
                    errorMessage = `❌ ${errorData.error.message}`;
                }
                this.showApiStatus(errorMessage, 'error');
            }
        } catch (error) {
            console.error('API Key 测试失败:', error);
            this.showApiStatus('❌ 网络错误，请检查网络连接', 'error');
        } finally {
            testButton.disabled = false;
            testButton.textContent = '测试';
        }
    }

    showApiStatus(message, type) {
        const statusDiv = document.getElementById('api-status');
        statusDiv.textContent = message;
        statusDiv.className = `api-status ${type}`;
        statusDiv.classList.remove('hidden');
    }

    clearApiStatus() {
        const statusDiv = document.getElementById('api-status');
        statusDiv.classList.add('hidden');
    }

    handleOrientationChange() {
        // 获取屏幕信息
        const screenWidth = window.screen.width;
        const screenHeight = window.screen.height;
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        // 检测是否为横屏
        const wasLandscape = this.isLandscape;
        this.isLandscape = windowWidth > windowHeight;
        
        console.log('屏幕信息:', {
            screenSize: `${screenWidth}x${screenHeight}`,
            windowSize: `${windowWidth}x${windowHeight}`,
            orientation: this.isLandscape ? '横屏' : '竖屏',
            devicePixelRatio: window.devicePixelRatio
        });
        
        // 强制横屏逻辑
        this.enforceOrientation();
        
        // 如果方向发生变化，显示提示并调整布局
        if (wasLandscape !== this.isLandscape) {
            this.showOrientationTip();
        }
        
        // 调整棋盘大小以适应屏幕
        this.adjustBoardSize();
        
        // 重新绘制棋盘
        this.updateCanvasSize();
        this.drawBoard();
    }

    enforceOrientation() {
        const body = document.body;
        const container = document.querySelector('.container');
        const landscapeRequest = document.getElementById('landscape-request');
        
        if (!this.isLandscape && this.isMobileDevice()) {
            // 移动设备竖屏时显示横屏请求（除非用户已经选择强制横屏）
            if (!body.classList.contains('force-landscape') && landscapeRequest) {
                landscapeRequest.style.display = 'flex';
            }
        } else {
            // 横屏时隐藏请求界面并移除强制旋转
            if (landscapeRequest) {
                landscapeRequest.style.display = 'none';
            }
            body.classList.remove('force-landscape');
            if (container) {
                container.classList.remove('rotated');
            }
        }
    }

    showRotationTip() {
        const tipElement = document.getElementById('rotation-tip') || this.createRotationTip();
        tipElement.style.display = 'block';
        
        // 5秒后自动隐藏提示
        setTimeout(() => {
            tipElement.style.display = 'none';
        }, 5000);
    }

    createRotationTip() {
        const tip = document.createElement('div');
        tip.id = 'rotation-tip';
        tip.innerHTML = '🔄 自动旋转为横屏模式以获得最佳游戏体验';
        tip.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(52, 152, 219, 0.95);
            color: white;
            padding: 15px 25px;
            border-radius: 25px;
            font-size: 16px;
            font-weight: bold;
            z-index: 10000;
            display: none;
            text-align: center;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
            animation: bounceIn 0.5s ease-out;
        `;
        
        // 添加动画样式
        const style = document.createElement('style');
        style.textContent = `
            @keyframes bounceIn {
                0% { transform: translate(-50%, -50%) scale(0.3); opacity: 0; }
                50% { transform: translate(-50%, -50%) scale(1.1); }
                100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(tip);
        return tip;
    }

    showOrientationTip() {
        const tipElement = document.getElementById('orientation-tip') || this.createOrientationTip();
        
        if (this.isLandscape) {
            tipElement.textContent = '🎯 横屏模式，最佳围棋体验！';
            tipElement.className = 'orientation-tip landscape';
        } else {
            tipElement.textContent = '📱 建议旋转为横屏以获得更好的下棋体验';
            tipElement.className = 'orientation-tip portrait';
        }
        
        tipElement.style.display = 'block';
        
        // 3秒后自动隐藏提示
        setTimeout(() => {
            tipElement.style.display = 'none';
        }, 3000);
    }

    createOrientationTip() {
        const tip = document.createElement('div');
        tip.id = 'orientation-tip';
        tip.style.cssText = `
            position: fixed;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px 20px;
            border-radius: 20px;
            font-size: 14px;
            z-index: 1000;
            display: none;
            text-align: center;
            max-width: 90%;
        `;
        document.body.appendChild(tip);
        return tip;
    }

    adjustBoardSize() {
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        // 为界面控件预留空间
        const reservedWidth = this.isLandscape ? 300 : 50; // 横屏时为左右控件预留更多空间
        const reservedHeight = this.isLandscape ? 50 : 200; // 竖屏时为上下控件预留更多空间
        
        const availableWidth = windowWidth - reservedWidth;
        const availableHeight = windowHeight - reservedHeight;
        
        // 计算最佳格子大小
        const maxCellSize = Math.min(
            availableWidth / (this.boardSize + 1),
            availableHeight / (this.boardSize + 1)
        );
        
        // 设置合适的格子大小范围（9x9棋盘可以更大）
        if (this.isLandscape) {
            this.cellSize = Math.max(35, Math.min(60, maxCellSize));
        } else {
            this.cellSize = Math.max(30, Math.min(50, maxCellSize));
        }
        
        console.log('棋盘调整:', {
            cellSize: this.cellSize,
            availableSpace: `${availableWidth}x${availableHeight}`,
            boardSize: this.boardSize
        });
    }

    setupAvatars() {
        // 艾莎头像 (Base64 编码的简化卡通头像)
        const elsaAvatar = "data:image/svg+xml;base64," + btoa(`
            <svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
                <circle cx="30" cy="30" r="28" fill="#fdbcb4"/>
                <circle cx="22" cy="25" r="2" fill="#333"/>
                <circle cx="38" cy="25" r="2" fill="#333"/>
                <path d="M20 35 Q30 40 40 35" stroke="#333" stroke-width="2" fill="none"/>
                <path d="M15 15 Q30 5 45 15 Q40 8 35 10 Q30 3 25 10 Q20 8 15 15" fill="#e6e6fa"/>
                <circle cx="25" cy="30" r="1" fill="#ff69b4"/>
                <circle cx="35" cy="30" r="1" fill="#ff69b4"/>
            </svg>
        `);

        // 机器人头像 (Base64 编码的简化机器人头像)
        const robotAvatar = "data:image/svg+xml;base64," + btoa(`
            <svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
                <rect x="10" y="15" width="40" height="35" rx="8" fill="#4a90e2"/>
                <rect x="15" y="20" width="30" height="25" rx="4" fill="#357abd"/>
                <circle cx="22" cy="28" r="3" fill="#00ff00"/>
                <circle cx="38" cy="28" r="3" fill="#00ff00"/>
                <rect x="25" y="35" width="10" height="3" rx="1" fill="#666"/>
                <rect x="5" y="25" width="8" height="4" rx="2" fill="#666"/>
                <rect x="47" y="25" width="8" height="4" rx="2" fill="#666"/>
                <circle cx="30" cy="10" r="2" fill="#666"/>
            </svg>
        `);

        // 根据玩家颜色设置头像
        if (this.playerColor === 'black') {
            document.getElementById('black-avatar').src = elsaAvatar;
            document.getElementById('white-avatar').src = robotAvatar;
            document.getElementById('black-name').textContent = '艾莎';
            document.getElementById('white-name').textContent = '机器人';
        } else {
            document.getElementById('black-avatar').src = robotAvatar;
            document.getElementById('white-avatar').src = elsaAvatar;
            document.getElementById('black-name').textContent = '机器人';
            document.getElementById('white-name').textContent = '艾莎';
        }
    }

    handleBoardClick(e) {
        if (!this.gameActive || this.aiThinking || this.currentPlayer !== this.playerColor) {
            return;
        }
        
        // 阻止默认触摸行为
        e.preventDefault();
        
        const rect = this.canvas.getBoundingClientRect();
        
        // 获取触摸点坐标，支持触摸和鼠标事件
        let clientX, clientY;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else if (e.changedTouches && e.changedTouches.length > 0) {
            clientX = e.changedTouches[0].clientX;
            clientY = e.changedTouches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        
        // 计算相对于Canvas的坐标
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        
        // 计算棋盘坐标，考虑边距
        const padding = 30;
        const col = Math.round((x - padding) / this.cellSize);
        const row = Math.round((y - padding) / this.cellSize);
        
        console.log('点击调试信息:', {
            原始坐标: { clientX, clientY },
            Canvas区域: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
            Canvas坐标: { x, y },
            格子大小: this.cellSize,
            棋盘坐标: { row, col },
            设备像素比: window.devicePixelRatio || 1
        });
        
        if (!this.isValidPosition(row, col)) {
            console.log('无效位置:', { row, col, boardSize: this.boardSize });
            return;
        }
        
        // 检测输入类型
        const isTouch = e.touches || e.changedTouches || e.pointerType === 'touch' || this.isMobileDevice();
        
        if (isTouch) {
            // 触摸模式：使用两步确认
            if (this.previewMove && this.previewMove.row === row && this.previewMove.col === col) {
                // 确认落子
                if (this.isValidMove(row, col)) {
                    this.previewMove = null;
                    this.makeMove(row, col, this.currentPlayer);
                }
            } else {
                // 设置预览
                if (this.isValidMove(row, col)) {
                    this.previewMove = { row, col };
                    this.drawBoard();
                }
            }
        } else {
            // 鼠标模式：直接落子
            if (this.isValidMove(row, col)) {
                this.hoverMove = null; // 清除悬停预览
                this.makeMove(row, col, this.currentPlayer);
            }
        }
    }

    handleBoardHover(e) {
        // 只在鼠标模式下显示悬停预览（非触摸设备）
        if (!this.gameActive || this.aiThinking || this.currentPlayer !== this.playerColor) {
            return;
        }
        
        // 检测是否为鼠标事件（不是触摸）
        if (e.pointerType === 'touch' || this.isMobileDevice()) {
            return;
        }
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const padding = 30;
        const col = Math.round((x - padding) / this.cellSize);
        const row = Math.round((y - padding) / this.cellSize);
        
        if (this.isValidPosition(row, col) && this.isValidMove(row, col)) {
            // 设置悬停预览（与点击预览不同）
            this.hoverMove = { row, col };
            this.drawBoard();
        } else {
            this.clearHoverPreview();
        }
    }

    clearHoverPreview() {
        if (this.hoverMove) {
            this.hoverMove = null;
            this.drawBoard();
        }
    }

    isValidPosition(row, col) {
        return row >= 0 && row < this.boardSize && col >= 0 && col < this.boardSize;
    }

    isValidMove(row, col) {
        if (row < 0 || row >= this.boardSize || col < 0 || col >= this.boardSize) {
            return false;
        }
        return this.board[row][col] === null;
    }

    makeMove(row, col, color) {
        if (!this.isValidMove(row, col)) {
            return false;
        }

        // 清除预览状态
        this.previewMove = null;

        // 放置棋子
        this.board[row][col] = color;
        
        // 检查提子
        const captured = this.checkCaptures(row, col, color);
        
        // 记录步数
        const moveNotation = this.getMoveNotation(row, col);
        this.gameHistory.push({
            row, col, color, captured, notation: moveNotation
        });
        
        this.drawBoard();
        this.updateDisplay();
        
        // 切换玩家
        this.currentPlayer = this.currentPlayer === 'black' ? 'white' : 'black';
        
        // 如果下一步是AI，则让AI下棋
        if (this.currentPlayer === this.aiColor && this.apiKey) {
            this.makeAIMove();
        }
        
        return true;
    }

    checkCaptures(row, col, color) {
        const opponentColor = color === 'black' ? 'white' : 'black';
        let totalCaptured = 0;
        
        // 检查四个方向的邻接群
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        
        for (const [dr, dc] of directions) {
            const newRow = row + dr;
            const newCol = col + dc;
            
            if (this.isInBounds(newRow, newCol) && this.board[newRow][newCol] === opponentColor) {
                const group = this.getGroup(newRow, newCol);
                if (!this.hasLiberties(group)) {
                    // 提子
                    for (const [r, c] of group) {
                        this.board[r][c] = null;
                        totalCaptured++;
                    }
                }
            }
        }
        
        // 更新提子计数
        if (color === 'black') {
            this.whiteCaptured += totalCaptured;
        } else {
            this.blackCaptured += totalCaptured;
        }
        
        return totalCaptured;
    }

    getGroup(row, col) {
        const color = this.board[row][col];
        const group = [];
        const visited = new Set();
        const stack = [[row, col]];
        
        while (stack.length > 0) {
            const [r, c] = stack.pop();
            const key = `${r},${c}`;
            
            if (visited.has(key)) continue;
            visited.add(key);
            
            if (this.isInBounds(r, c) && this.board[r][c] === color) {
                group.push([r, c]);
                
                // 添加邻接点
                const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
                for (const [dr, dc] of directions) {
                    stack.push([r + dr, c + dc]);
                }
            }
        }
        
        return group;
    }

    hasLiberties(group) {
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        
        for (const [row, col] of group) {
            for (const [dr, dc] of directions) {
                const newRow = row + dr;
                const newCol = col + dc;
                
                if (this.isInBounds(newRow, newCol) && this.board[newRow][newCol] === null) {
                    return true;
                }
            }
        }
        
        return false;
    }

    isInBounds(row, col) {
        return row >= 0 && row < this.boardSize && col >= 0 && col < this.boardSize;
    }

    async makeAIMove() {
        if (!this.apiKey) {
            alert('请先输入 DeepSeek API Key');
            return;
        }
        
        this.aiThinking = true;
        this.updateDisplay();
        
        try {
            const move = await this.getAIMove();
            if (move && this.isValidMove(move.row, move.col)) {
                this.makeMove(move.row, move.col, this.aiColor);
            }
        } catch (error) {
            console.error('AI 下棋失败:', error);
            alert('AI 下棋失败，请检查 API Key 或网络连接');
        } finally {
            this.aiThinking = false;
            this.updateDisplay();
        }
    }

    async getAIMove() {
        const boardState = this.getBoardStateString();
        const prompt = this.generateGoPrompt(boardState);
        
        try {
            const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: 'deepseek-chat',
                    messages: [
                        {
                            role: 'system',
                            content: '你是一位专业的围棋AI助手。你需要分析围棋局面并选择最佳落子位置。你的回答必须简洁明确，只返回坐标格式"row,col"，不要包含任何解释或其他文字。坐标从0开始计数。'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 100
                })
            });
            
            if (!response.ok) {
                throw new Error(`API 请求失败: ${response.status}`);
            }
            
            const data = await response.json();
            const moveText = data.choices[0].message.content.trim();
            
            // 解析AI返回的坐标
            const match = moveText.match(/(\d+),(\d+)/);
            if (match) {
                return {
                    row: parseInt(match[1]),
                    col: parseInt(match[2])
                };
            }
            
            // 如果解析失败，随机选择一个有效位置
            return this.getRandomValidMove();
            
        } catch (error) {
            console.error('DeepSeek API 调用失败:', error);
            // 降级到随机移动
            return this.getRandomValidMove();
        }
    }

    getRandomValidMove() {
        const validMoves = [];
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (this.isValidMove(row, col)) {
                    validMoves.push({ row, col });
                }
            }
        }
        
        if (validMoves.length > 0) {
            return validMoves[Math.floor(Math.random() * validMoves.length)];
        }
        
        return null;
    }

    getBoardStateString() {
        let state = '';
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                const cell = this.board[row][col];
                if (cell === 'black') {
                    state += 'B';
                } else if (cell === 'white') {
                    state += 'W';
                } else {
                    state += '.';
                }
            }
            state += '\n';
        }
        return state;
    }

    generateGoPrompt(boardState) {
        const currentMove = this.gameHistory.length + 1;
        const lastMove = this.gameHistory.length > 0 ? this.gameHistory[this.gameHistory.length - 1] : null;
        
        let prompt = `你是一位9路围棋专家。9路围棋节奏快、战斗激烈，需要精确计算。请分析当前局面并选择最佳落子位置。

=== 棋局信息 ===
棋盘大小: 9x9（小棋盘）
当前手数: 第${currentMove}手
轮到: ${this.aiColor === 'black' ? '黑子' : '白子'}`;

        if (lastMove) {
            prompt += `\n上一手: ${lastMove.color === 'black' ? '黑子' : '白子'} 落在 (${lastMove.row},${lastMove.col})`;
        }

        prompt += `\n被提取棋子: 黑子 ${this.blackCaptured}, 白子 ${this.whiteCaptured}

=== 当前棋盘 ===
(B=黑子, W=白子, .=空位, 坐标从0开始)

${boardState}

=== 9路围棋策略要点 ===
1. **开局阶段（1-15手）**: 抢占角隅要点，如星位(2,2)、(2,6)、(6,2)、(6,6)和天元(4,4)
2. **中盘阶段（15-40手）**: 主动寻求战斗，攻击对方薄弱棋组，建立实地
3. **收官阶段（40手+）**: 精确计算官子价值，争夺边角地盘

=== 当前局面分析重点 ===
- 棋盘较小，每一手都很重要
- 优先考虑攻击和防守
- 关注对方棋子的气数和连接
- 9路棋盘容错率低，避免过度冒险

请直接返回坐标格式: row,col (例如: 2,4)`;

        return prompt;
    }

    getMoveNotation(row, col) {
        // 9路棋盘的记谱法
        const letters = 'ABCDEFGHJ'; // 9路棋盘只需要9个字母，去掉I
        const letter = letters[col];
        const number = this.boardSize - row; // 9-row
        return `${letter}${number}`;
    }

    newGame() {
        this.initializeBoard();
        
        // 如果玩家选择白子，AI先手
        if (this.playerColor === 'white' && this.apiKey) {
            setTimeout(() => {
                this.makeAIMove();
            }, 500);
        }
    }

    drawBoard() {
        const ctx = this.ctx;
        const padding = 30;
        
        // 清空画布
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制背景
        const gradient = ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
        gradient.addColorStop(0, '#deb887');
        gradient.addColorStop(1, '#cd853f');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制网格线
        ctx.strokeStyle = '#8b4513';
        ctx.lineWidth = 1;
        
        for (let i = 0; i < this.boardSize; i++) {
            // 垂直线
            ctx.beginPath();
            ctx.moveTo(padding + i * this.cellSize, padding);
            ctx.lineTo(padding + i * this.cellSize, padding + (this.boardSize - 1) * this.cellSize);
            ctx.stroke();
            
            // 水平线
            ctx.beginPath();
            ctx.moveTo(padding, padding + i * this.cellSize);
            ctx.lineTo(padding + (this.boardSize - 1) * this.cellSize, padding + i * this.cellSize);
            ctx.stroke();
        }
        
        // 绘制星位（9x9棋盘的星位）
        this.drawStarPoints(ctx, padding, [2, 4, 6]);
        
        // 绘制棋子
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                const stone = this.board[row][col];
                if (stone) {
                    this.drawStone(ctx, padding + col * this.cellSize, padding + row * this.cellSize, stone);
                }
            }
        }
        
        // 绘制预览位置（触摸确认模式）
        if (this.previewMove && this.currentPlayer === this.playerColor) {
            this.drawPreviewStone(ctx, padding + this.previewMove.col * this.cellSize, padding + this.previewMove.row * this.cellSize, this.currentPlayer);
        }
        
        // 绘制鼠标悬停预览（桌面模式）
        if (this.hoverMove && this.currentPlayer === this.playerColor && !this.previewMove) {
            this.drawHoverStone(ctx, padding + this.hoverMove.col * this.cellSize, padding + this.hoverMove.row * this.cellSize, this.currentPlayer);
        }
        
        // 高亮最后一步
        if (this.gameHistory.length > 0) {
            const lastMove = this.gameHistory[this.gameHistory.length - 1];
            this.highlightLastMove(ctx, padding + lastMove.col * this.cellSize, padding + lastMove.row * this.cellSize);
        }
    }

    drawStarPoints(ctx, padding, positions) {
        ctx.fillStyle = '#8b4513';
        for (const pos of positions) {
            for (const pos2 of positions) {
                ctx.beginPath();
                ctx.arc(padding + pos * this.cellSize, padding + pos2 * this.cellSize, 3, 0, 2 * Math.PI);
                ctx.fill();
            }
        }
    }

    drawStone(ctx, x, y, color) {
        const radius = this.cellSize * 0.4;
        
        // 绘制阴影
        ctx.beginPath();
        ctx.arc(x + 2, y + 2, radius, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fill();
        
        // 绘制棋子
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        
        if (color === 'black') {
            const gradient = ctx.createRadialGradient(x - 5, y - 5, 0, x, y, radius);
            gradient.addColorStop(0, '#555');
            gradient.addColorStop(1, '#222');
            ctx.fillStyle = gradient;
        } else {
            const gradient = ctx.createRadialGradient(x - 5, y - 5, 0, x, y, radius);
            gradient.addColorStop(0, '#fff');
            gradient.addColorStop(1, '#ddd');
            ctx.fillStyle = gradient;
        }
        
        ctx.fill();
        ctx.strokeStyle = color === 'black' ? '#000' : '#999';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    highlightLastMove(ctx, x, y) {
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, 2 * Math.PI);
        ctx.strokeStyle = '#ff4757';
        ctx.lineWidth = 3;
        ctx.stroke();
    }

    drawPreviewStone(ctx, x, y, color) {
        const radius = this.cellSize * 0.4;
        
        // 绘制半透明的预览棋子
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        
        if (color === 'black') {
            const gradient = ctx.createRadialGradient(x - 5, y - 5, 0, x, y, radius);
            gradient.addColorStop(0, '#555');
            gradient.addColorStop(1, '#222');
            ctx.fillStyle = gradient;
        } else {
            const gradient = ctx.createRadialGradient(x - 5, y - 5, 0, x, y, radius);
            gradient.addColorStop(0, '#fff');
            gradient.addColorStop(1, '#ddd');
            ctx.fillStyle = gradient;
        }
        
        ctx.fill();
        ctx.strokeStyle = color === 'black' ? '#000' : '#999';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // 添加确认提示圆圈
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, radius + 8, 0, 2 * Math.PI);
        ctx.stroke();
        
        // 恢复透明度
        ctx.globalAlpha = 1.0;
    }

    drawHoverStone(ctx, x, y, color) {
        const radius = this.cellSize * 0.4;
        
        // 绘制更淡的悬停预览棋子
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        
        if (color === 'black') {
            ctx.fillStyle = '#333';
        } else {
            ctx.fillStyle = '#ddd';
        }
        
        ctx.fill();
        ctx.strokeStyle = color === 'black' ? '#000' : '#999';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // 恢复透明度
        ctx.globalAlpha = 1.0;
    }

    updateDisplay() {
        // 更新头像激活状态
        this.updateAvatarStates();
        
        // 更新AI思考状态
        const aiThinkingElement = document.getElementById('ai-thinking');
        if (this.aiThinking) {
            aiThinkingElement.classList.remove('hidden');
        } else {
            aiThinkingElement.classList.add('hidden');
        }
        
        // 更新提子数
        document.getElementById('black-captured').textContent = this.blackCaptured;
        document.getElementById('white-captured').textContent = this.whiteCaptured;
    }

    updateAvatarStates() {
        const blackAvatar = document.getElementById('black-player').querySelector('.player-avatar');
        const whiteAvatar = document.getElementById('white-player').querySelector('.player-avatar');
        
        // 清除所有激活状态
        blackAvatar.classList.remove('active');
        whiteAvatar.classList.remove('active');
        
        // 根据当前玩家添加激活状态
        if (this.currentPlayer === 'black') {
            blackAvatar.classList.add('active');
        } else {
            whiteAvatar.classList.add('active');
        }
    }
}

// 初始化游戏
document.addEventListener('DOMContentLoaded', () => {
    window.game = new StoneMind();
});
