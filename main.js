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
        this.captureWinThreshold = 8; // 吃子获胜阈值
        
        this.canvas = document.getElementById('board');
        this.ctx = this.canvas.getContext('2d');
        
        this.initializeBoard();
        this.bindEvents();
        this.updateDisplay();
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
        const isTouch = e.touches || e.changedTouches || e.pointerType === 'touch';
        
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
        if (e.pointerType === 'touch') {
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
        if (this.board[row][col] !== null) {
            return false;
        }
        
        // 检查是否为自杀手（临时放置棋子来检测）
        return !this.isSuicideMove(row, col, this.currentPlayer);
    }

    // 检查是否为自杀手
    isSuicideMove(row, col, color) {
        // 临时放置棋子
        this.board[row][col] = color;
        
        const opponentColor = color === 'black' ? 'white' : 'black';
        let canCapture = false;
        
        // 检查是否能吃掉对方棋子
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (const [dr, dc] of directions) {
            const newRow = row + dr;
            const newCol = col + dc;
            
            if (this.isInBounds(newRow, newCol) && this.board[newRow][newCol] === opponentColor) {
                const opponentGroup = this.getGroup(newRow, newCol);
                if (!this.hasLiberties(opponentGroup)) {
                    canCapture = true;
                    break;
                }
            }
        }
        
        // 检查自己的棋子群是否有气
        const myGroup = this.getGroup(row, col);
        const hasMyLiberties = this.hasLiberties(myGroup);
        
        // 移除临时棋子
        this.board[row][col] = null;
        
        // 如果能吃掉对方棋子，或者自己有气，则不是自杀
        return !canCapture && !hasMyLiberties;
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
        
        // 检查游戏是否结束
        if (this.checkGameEnd()) {
            return true;
        }
        
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
        
        // 更新提子计数 - 修正逻辑：谁下棋谁吃掉对方棋子
        if (color === 'black') {
            this.blackCaptured += totalCaptured;  // 黑子吃掉的白子数量
            console.log(`黑子吃掉了 ${totalCaptured} 个白子，总计: ${this.blackCaptured}`);
        } else {
            this.whiteCaptured += totalCaptured;  // 白子吃掉的黑子数量
            console.log(`白子吃掉了 ${totalCaptured} 个黑子，总计: ${this.whiteCaptured}`);
        }
        
        return totalCaptured;
    }

    // 检查游戏是否结束（吃子获胜或无子可下）
    checkGameEnd() {
        // 检查吃子获胜
        if (this.blackCaptured >= this.captureWinThreshold) {
            this.gameActive = false;
            alert(`🎉 黑子获胜！吃掉了 ${this.blackCaptured} 个白子`);
            return true;
        }
        
        if (this.whiteCaptured >= this.captureWinThreshold) {
            this.gameActive = false;
            alert(`🎉 白子获胜！吃掉了 ${this.whiteCaptured} 个黑子`);
            return true;
        }
        
        // 检查是否还有有效落子位置
        const hasValidMoves = this.hasValidMoves();
        if (!hasValidMoves) {
            this.gameActive = false;
            // 比较吃子数量决定胜负
            if (this.blackCaptured > this.whiteCaptured) {
                alert(`🎉 棋盘已满！黑子获胜！\n黑子吃掉: ${this.blackCaptured}, 白子吃掉: ${this.whiteCaptured}`);
            } else if (this.whiteCaptured > this.blackCaptured) {
                alert(`🎉 棋盘已满！白子获胜！\n白子吃掉: ${this.whiteCaptured}, 黑子吃掉: ${this.blackCaptured}`);
            } else {
                alert(`🤝 棋盘已满！平局！\n双方各吃掉: ${this.blackCaptured} 个子`);
            }
            return true;
        }
        
        return false;
    }

    // 检查是否还有有效落子位置
    hasValidMoves() {
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (this.isValidMove(row, col)) {
                    return true;
                }
            }
        }
        return false;
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
            this.aiThinking = false;
            this.updateDisplay();
            return;
        }

        this.aiThinking = true;
        this.updateDisplay();
        this.showAIStrategy('🧠 大模型分析中...');

        try {
            const move = await this.getAIMove();
            if (move && this.isValidMove(move.row, move.col)) {
                this.makeMove(move.row, move.col, this.aiColor);
            } else {
                // AI无有效落子，检查游戏结束
                if (!this.hasValidMoves()) {
                    this.checkGameEnd(); // 这会处理棋盘满的情况
                } else {
                    alert('AI无有效落子，但棋盘未满！');
                }
            }
        } catch (error) {
            console.error('AI 下棋失败:', error);
            alert('AI 下棋失败，请检查 API Key 或网络连接');
        } finally {
            this.aiThinking = false;
            this.updateDisplay();
            this.hideAIStrategy();
        }
    }

    // 显示AI策略状态
    showAIStrategy(message) {
        const strategyElement = document.getElementById('ai-strategy');
        strategyElement.textContent = message;
        strategyElement.classList.remove('hidden');
    }

    // 隐藏AI策略状态
    hideAIStrategy() {
        const strategyElement = document.getElementById('ai-strategy');
        strategyElement.classList.add('hidden');
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
                            content: '你是世界顶级围棋AI。你必须深度分析每个可能位置的价值：攻击、防守、连接、切断、做眼、破眼等。禁止下无意义的棋。只返回最佳坐标"row,col"，坐标0-8。'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.3,  // 降低随机性，提高一致性
                    max_tokens: 50,    // 减少token，专注坐标
                    top_p: 0.8        // 增加参数控制
                })
            });

            if (!response.ok) {
                throw new Error(`API 请求失败: ${response.status}`);
            }

            const data = await response.json();
            const moveText = data.choices[0].message.content.trim();
            console.log('AI原始回复:', moveText);

            // 多种格式解析AI返回
            let match = moveText.match(/(\d+),(\d+)/);
            if (!match) {
                // 尝试其他格式: (row, col) 或 row col
                match = moveText.match(/\((\d+),\s*(\d+)\)/) || moveText.match(/(\d+)\s+(\d+)/);
            }
            
            if (match) {
                const row = parseInt(match[1]);
                const col = parseInt(match[2]);
                if (this.isValidMove(row, col)) {
                    console.log(`AI选择: (${row},${col})`);
                    this.showAIStrategy('🎯 大模型决策');
                    return { row, col };
                } else {
                    console.log(`AI返回无效位置: (${row},${col})`);
                }
            }

            // 如果AI返回无效，使用智能降级策略
            console.log('AI回复无效，使用智能降级');
            this.showAIStrategy('⚡ 智能降级策略');
            return this.getSmartMove();

        } catch (error) {
            console.error('DeepSeek API 调用失败:', error);
            // 降级到智能策略
            this.showAIStrategy('🔧 API失败，智能降级');
            return this.getSmartMove();
        }
    }

    // 智能降级策略（比随机好）
    getSmartMove() {
        const originalPlayer = this.currentPlayer;
        this.currentPlayer = this.aiColor;
        
        // 1. 优先尝试攻击：能吃掉对方棋子
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (this.isValidMove(row, col)) {
                    // 模拟下棋看是否能吃子
                    this.board[row][col] = this.aiColor;
                    const captured = this.simulateCaptures(row, col, this.aiColor);
                    this.board[row][col] = null;
                    
                    if (captured > 0) {
                        this.currentPlayer = originalPlayer;
                        console.log(`智能降级：选择攻击位置 (${row},${col})`);
                        return { row, col };
                    }
                }
            }
        }
        
        // 2. 其次考虑重要位置：角、边、中心
        const strategicMoves = [
            [4, 4], // 中心天元
            [2, 2], [2, 6], [6, 2], [6, 6], // 星位
            [0, 0], [0, 8], [8, 0], [8, 8], // 角
            [0, 4], [4, 0], [4, 8], [8, 4]  // 边中心
        ];
        
        for (const [row, col] of strategicMoves) {
            if (this.isValidMove(row, col)) {
                this.currentPlayer = originalPlayer;
                console.log(`智能降级：选择战略位置 (${row},${col})`);
                return { row, col };
            }
        }
        
        // 3. 最后随机选择
        const randomMove = this.getRandomValidMove();
        this.currentPlayer = originalPlayer;
        console.log('智能降级：随机选择');
        return randomMove;
    }

    // 模拟吃子数量（不实际执行）
    simulateCaptures(row, col, color) {
        const opponentColor = color === 'black' ? 'white' : 'black';
        let totalCaptured = 0;
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        
        for (const [dr, dc] of directions) {
            const newRow = row + dr;
            const newCol = col + dc;
            
            if (this.isInBounds(newRow, newCol) && this.board[newRow][newCol] === opponentColor) {
                const group = this.getGroup(newRow, newCol);
                if (!this.hasLiberties(group)) {
                    totalCaptured += group.length;
                }
            }
        }
        
        return totalCaptured;
    }

    getRandomValidMove() {
        const validMoves = [];
        
        // 临时保存当前玩家，因为isValidMove使用this.currentPlayer
        const originalPlayer = this.currentPlayer;
        this.currentPlayer = this.aiColor;
        
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (this.isValidMove(row, col)) {
                    validMoves.push({ row, col });
                }
            }
        }
        
        // 恢复原来的当前玩家
        this.currentPlayer = originalPlayer;
        
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
        const lastMove = this.gameHistory.length > 0 ? this.gameHistory[this.gameHistory.length - 1] : null;
        const moveCount = this.gameHistory.length;
        
        let prompt = `你是专业围棋AI。分析局面选择最佳落子。只返回坐标: row,col\n\n`;
        
        // 根据局面阶段给出不同策略
        if (moveCount < 15) {
            prompt += `开局阶段策略：优先占角(0,0)(0,8)(8,0)(8,8)、抢边、控制中心(4,4)。\n`;
        } else if (moveCount < 40) {
            prompt += `中盘阶段策略：攻击对方孤子、连接己方棋子、争夺要点。\n`;
        } else {
            prompt += `收官阶段策略：围地、官子价值计算、精确计算。\n`;
        }
        
        prompt += `棋盘(9x9，B=黑子，W=白子，.=空位)：\n${boardState}`;
        
        if (lastMove) {
            prompt += `\n对方刚下: ${lastMove.color === 'black' ? '黑子' : '白子'} (${lastMove.row},${lastMove.col})`;
        }
        
        // 添加战术提示
        prompt += `\n你是${this.aiColor === 'black' ? '黑子' : '白子'}。重点考虑：`;
        prompt += `\n1.能否吃掉对方棋子 2.避免己方被吃 3.连接己方棋子 4.占据要点`;
        
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
        
        // 更新提子数 - 注意：显示的是各自吃掉对方的数量
        document.getElementById('black-captured').textContent = this.blackCaptured;  // 黑子吃掉的白子数
        document.getElementById('white-captured').textContent = this.whiteCaptured;  // 白子吃掉的黑子数
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
