class StoneMind {
    constructor() {
        this.boardSize = 19;
        this.cellSize = 40;
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
        
        this.updateCanvasSize();
        this.drawBoard();
        this.updateDisplay();
        this.setupAvatars();
    }

    updateCanvasSize() {
        const padding = 30;
        const totalSize = this.boardSize * this.cellSize + padding * 2;
        this.canvas.width = totalSize;
        this.canvas.height = totalSize;
        this.canvas.style.width = totalSize + 'px';
        this.canvas.style.height = totalSize + 'px';
    }

    bindEvents() {
        // 棋盘点击事件 - 使用 pointerdown 支持触控
        this.canvas.addEventListener('pointerdown', (e) => this.handleBoardClick(e));
        
        // 控制按钮事件
        document.getElementById('new-game').addEventListener('click', () => this.newGame());
        document.getElementById('test-api').addEventListener('click', () => this.testApiKey());
        
        // 设置变更事件
        document.getElementById('board-size').addEventListener('change', (e) => {
            this.boardSize = parseInt(e.target.value);
            this.newGame();
        });
        
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
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const col = Math.round((x - 30) / this.cellSize);
        const row = Math.round((y - 30) / this.cellSize);
        
        if (!this.isValidPosition(row, col)) {
            return;
        }
        
        // 如果点击的是已经预览的位置，确认落子
        if (this.previewMove && this.previewMove.row === row && this.previewMove.col === col) {
            if (this.isValidMove(row, col)) {
                this.previewMove = null; // 清除预览
                this.makeMove(row, col, this.currentPlayer);
            }
        } else {
            // 否则设置新的预览位置
            if (this.isValidMove(row, col)) {
                this.previewMove = { row, col };
                this.drawBoard(); // 重绘棋盘以显示预览
            }
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
        
        let prompt = `你是一位围棋高手。请分析当前局面并选择最佳落子位置。

=== 棋局信息 ===
棋盘大小: ${this.boardSize}x${this.boardSize}
当前手数: 第${currentMove}手
轮到: ${this.aiColor === 'black' ? '黑子' : '白子'}`;

        if (lastMove) {
            prompt += `\n上一手: ${lastMove.color === 'black' ? '黑子' : '白子'} 落在 (${lastMove.row},${lastMove.col})`;
        }

        prompt += `\n被提取棋子: 黑子 ${this.blackCaptured}, 白子 ${this.whiteCaptured}

=== 当前棋盘 ===
(B=黑子, W=白子, .=空位, 坐标从0开始)

${boardState}

=== 请求 ===
请分析局面并选择最佳落子位置。考虑因素包括：
1. 攻击对方弱棋
2. 保护自己的棋子
3. 抢占要点
4. 围地或破坏对方领域

请直接返回坐标格式: row,col (例如: 3,4)`;

        return prompt;
    }

    getMoveNotation(row, col) {
        const letters = 'ABCDEFGHJKLMNOPQRS'; // 注意：围棋记谱法中没有I
        const letter = letters[col];
        const number = this.boardSize - row;
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
        
        // 绘制星位（天元等特殊点）
        if (this.boardSize === 19) {
            this.drawStarPoints(ctx, padding, [3, 9, 15]);
        } else if (this.boardSize === 13) {
            this.drawStarPoints(ctx, padding, [3, 6, 9]);
        } else if (this.boardSize === 9) {
            this.drawStarPoints(ctx, padding, [2, 4, 6]);
        }
        
        // 绘制棋子
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                const stone = this.board[row][col];
                if (stone) {
                    this.drawStone(ctx, padding + col * this.cellSize, padding + row * this.cellSize, stone);
                }
            }
        }
        
        // 绘制预览位置
        if (this.previewMove && this.currentPlayer === this.playerColor) {
            this.drawPreviewStone(ctx, padding + this.previewMove.col * this.cellSize, padding + this.previewMove.row * this.cellSize, this.currentPlayer);
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
