class StoneMind {
    constructor() {
        this.boardSize = 9; // 固定为9x9棋盘
        this.cellSize = 50; // 9x9棋盘可以用更大的格子
        this.board = [];
        this.gameHistory = [];
        this.currentPlayer = 'black'; // 'black' or 'white'
        this.playerColor = 'black';
        this.aiColor = 'white';
        this.difficulty = 1; // 1/2/3 星（默认一星）
        this.blackCaptured = 0;
        this.whiteCaptured = 0;
        this.apiKey = '';
        this.gameActive = false;
        this.aiThinking = false;
        this.previewMove = null; // 预览位置 {row, col}
        this.hoverMove = null; // 鼠标悬停预览位置
        this.captureWinThreshold = 8; // 吃子获胜阈值
        this.debugMode = false; // 调试模式开关
        this._debugInfoTimer = null; // 调试信息隐藏定时器
        this._autoHideDebug = true; // 是否自动隐藏调试信息（默认开启，避免面板长时间占位）
        this.captureEffects = []; // 提子动画效果 [{row,col,start,duration}]
        this._lastBoardHash = null; // 简易劫规则所需：记录上一步之前的局面哈希（上上步）
        this._aiMoveToken = 0; // 用于防抖/并发保护的AI回合令牌
        
        // 统一的战略位置定义，避免重复代码
        this.strategicPositions = [
            { pos: [4, 4], name: '4,4(天元)', priority: 1 },      // 天元(最高优先级)
            { pos: [2, 2], name: '2,2(星位)', priority: 2 },      // 左上角星位
            { pos: [2, 6], name: '2,6(星位)', priority: 2 },      // 右上角星位
            { pos: [6, 2], name: '6,2(星位)', priority: 2 },      // 左下角星位
            { pos: [6, 6], name: '6,6(星位)', priority: 2 },      // 右下角星位
            { pos: [2, 4], name: '2,4(边星)', priority: 3 },      // 上边星位
            { pos: [4, 2], name: '4,2(边星)', priority: 3 },      // 左边星位
            { pos: [4, 6], name: '4,6(边星)', priority: 3 },      // 右边星位
            { pos: [6, 4], name: '6,4(边星)', priority: 3 },      // 下边星位
            { pos: [3, 3], name: '3,3(小目)', priority: 4 },      // 小目位置
            { pos: [3, 5], name: '3,5(小目)', priority: 4 },
            { pos: [5, 3], name: '5,3(小目)', priority: 4 },
            { pos: [5, 5], name: '5,5(小目)', priority: 4 },
            { pos: [1, 4], name: '1,4(边)', priority: 5 },        // 边上重要点
            { pos: [4, 1], name: '4,1(边)', priority: 5 },
            { pos: [4, 7], name: '4,7(边)', priority: 5 },
            { pos: [7, 4], name: '7,4(边)', priority: 5 }
        ];
        
        this.canvas = document.getElementById('board');
        this.ctx = this.canvas.getContext('2d');
        
        this.initializeBoard();
        this.bindEvents();
        this.updateDisplay();
        this.initLogWindow();
    }

    initializeBoard() {
        this.board = Array(this.boardSize).fill(null).map(() => Array(this.boardSize).fill(null));
        this.gameHistory = [];
        this.blackCaptured = 0;
        this.whiteCaptured = 0;
        this.captureEffects = [];
        this._lastBoardHash = null;
        this._aiMoveToken = 0;
        this.currentPlayer = 'black';
        this.gameActive = true;
        this.aiThinking = false;
        this.previewMove = null;
        this.hoverMove = null;
        
        // 清除之前累积的错误信息
        this.clearLogs();
        
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
        
        // 缩放绘图上下文以匹配设备像素比（先重置变换避免累计缩放）
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale(dpr, dpr);
        
        // 只在调试模式下显示Canvas信息
        this.addLog(`📐 Canvas尺寸: ${totalSize}x${totalSize}, 设备像素比: ${dpr}`, 'info');
    }

    bindEvents() {
        // 棋盘点击事件 - 统一使用 Pointer 事件，避免触摸与鼠标双触发
        this.canvas.addEventListener('pointerdown', (e) => this.handleBoardClick(e));
        
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
            this.positionAIStrategyDisplay(); // 移动AI策略显示到AI一侧
            this.newGame();
        });
        
        document.getElementById('api-key').addEventListener('input', (e) => {
            this.apiKey = e.target.value.trim();
            // 清除之前的状态显示
            this.clearApiStatus();
        });

        const difficultySelect = document.getElementById('difficulty');
        if (difficultySelect) {
            this.difficulty = parseInt(difficultySelect.value, 10) || 1;
            difficultySelect.addEventListener('change', (e) => {
                this.difficulty = parseInt(e.target.value, 10) || 1;
            });
        }
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
            testButton.textContent = '测试连接';
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

        // 将AI策略显示面板移动到当前AI一侧
        this.positionAIStrategyDisplay();
    }

    // 把 ai-strategy-display 动态放置到 AI 一侧的 player-details 容器
    positionAIStrategyDisplay() {
        const strategyElement = document.getElementById('ai-strategy-display');
        if (!strategyElement) return;
        const aiPlayerId = this.aiColor === 'black' ? 'black-player' : 'white-player';
        const container = document.getElementById(aiPlayerId)?.querySelector('.player-details');
        if (container && strategyElement.parentElement !== container) {
            container.appendChild(strategyElement);
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
        
        // 只在调试模式下显示点击信息
        this.addLog(`👆 点击位置: (${row},${col})`, 'info');
        
        if (!this.isValidPosition(row, col)) {
            this.addLog(`🚫 无效位置点击: (${row},${col}) 超出棋盘范围`, 'warning');
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

        // KO: 落子前的局面Hash与棋盘快照（用于违规回滚）
        const prevHash = this.boardHash();
        const boardSnapshot = this.board.map(r => r.slice());
        const prevBlackCaptured = this.blackCaptured;
        const prevWhiteCaptured = this.whiteCaptured;
        const prevEffects = this.captureEffects.slice();

        // 放置棋子
        this.board[row][col] = color;
        
        // 检查提子
        const captured = this.checkCaptures(row, col, color);
        const nextHash = this.boardHash();

        // 简易KO：若正好提1子且 nextHash 与 _lastBoardHash 相同，则禁止
        if (captured === 1 && this._lastBoardHash !== null && nextHash === this._lastBoardHash) {
            // 回滚：恢复棋盘与计数、动画
            this.board = boardSnapshot.map(r => r.slice());
            this.blackCaptured = prevBlackCaptured;
            this.whiteCaptured = prevWhiteCaptured;
            this.captureEffects = prevEffects.slice();
            this.addLog('❌ 违反劫规则，落子无效', 'error');
            this.drawBoard();
            this.updateDisplay();
            return false;
        }
        
        // 记录步数
        const moveNotation = this.getMoveNotation(row, col);
        this.gameHistory.push({
            row, col, color, captured, notation: moveNotation
        });
        
        // 走完一步后，记录“上上步”的Hash用于下一手KO检测
        this._lastBoardHash = prevHash;

        this.drawBoard();
        this.updateDisplay();
        
        // 检查游戏是否结束
        if (this.checkGameEnd()) {
            return true;
        }
        
        // 切换玩家
        this.currentPlayer = this.currentPlayer === 'black' ? 'white' : 'black';
        
        // 如果下一步是AI，则让AI下棋
        if (this.currentPlayer === this.aiColor && this.apiKey && !this.aiThinking) {
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
                        this.addCaptureEffect(r, c);
                    }
                }
            }
        }
        
        // 更新提子计数 - 修正逻辑：谁下棋谁吃掉对方棋子
        if (color === 'black') {
            this.blackCaptured += totalCaptured;  // 黑子吃掉的白子数量
            this.addLog(`♠️ 黑子吃掉了 ${totalCaptured} 个白子，总计: ${this.blackCaptured}`, 'success');
        } else {
            this.whiteCaptured += totalCaptured;  // 白子吃掉的黑子数量
            this.addLog(`♡ 白子吃掉了 ${totalCaptured} 个黑子，总计: ${this.whiteCaptured}`, 'success');
        }
        
        return totalCaptured;
    }

    // 添加提子动画效果
    addCaptureEffect(row, col) {
        this.captureEffects.push({ row, col, start: performance.now(), duration: 400 });
    }

    // 检查游戏是否结束（吃子获胜或无子可下）
    checkGameEnd() {
        // 吃子阈值胜利：延迟到动画播放后再提示
        if (this.blackCaptured >= this.captureWinThreshold) {
            this.gameActive = false;
            this.scheduleGameEnd(`🎉 黑子获胜！吃掉了 ${this.blackCaptured} 个白子`);
            return true;
        }
        
        if (this.whiteCaptured >= this.captureWinThreshold) {
            this.gameActive = false;
            this.scheduleGameEnd(`🎉 白子获胜！吃掉了 ${this.whiteCaptured} 个黑子`);
            return true;
        }
        
        // 检查是否还有有效落子位置
        const hasValidMoves = this.hasValidMoves();
        if (!hasValidMoves) {
            this.gameActive = false;
            // 比较吃子数量决定胜负（也延迟少许，给最后一步高亮时间）
            if (this.blackCaptured > this.whiteCaptured) {
                this.scheduleGameEnd(`🎉 棋盘已满！黑子获胜！\n黑子吃掉: ${this.blackCaptured}, 白子吃掉: ${this.whiteCaptured}`, 350);
            } else if (this.whiteCaptured > this.blackCaptured) {
                this.scheduleGameEnd(`🎉 棋盘已满！白子获胜！\n白子吃掉: ${this.whiteCaptured}, 黑子吃掉: ${this.blackCaptured}`, 350);
            } else {
                this.scheduleGameEnd(`🤝 棋盘已满！平局！\n双方各吃掉: ${this.blackCaptured} 个子`, 350);
            }
            return true;
        }
        
        return false;
    }

    // 在提子动画播放完（或最短时长）后再显示结算提示
    scheduleGameEnd(message, minDelayMs = 450) {
        const start = performance.now();
        const waitLoop = () => {
            const elapsed = performance.now() - start;
            const effectsDone = this.captureEffects.length === 0;
            if (elapsed >= minDelayMs && effectsDone) {
                alert(message);
                return;
            }
            requestAnimationFrame(waitLoop);
        };
        requestAnimationFrame(waitLoop);
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

        // 并发保护：开启新一轮AI令牌
        const myToken = ++this._aiMoveToken;
        this.aiThinking = true;
        this.updateDisplay();
        this.resetAIStrategy();

        // 尝试AI下棋，最多重试一次
        const maxRetries = 1;
        let moveResult = null;
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                // 若在等待过程中令牌已变化，提前终止
                if (myToken !== this._aiMoveToken) return;
                moveResult = await this.attemptAIMove(attempt);
                if (myToken !== this._aiMoveToken) return;
                if (moveResult.success) {
                    break; // 成功下棋，跳出重试循环
                }
                
                // 第一次失败时，如果还有重试机会，不显示失败状态
                if (attempt < maxRetries) {
                    this.addLog(`🔄 AI第${attempt + 1}次尝试失败，准备重试...`, 'warning');
                    await this.delay(1000);
                }
            } catch (error) {
                console.error(`AI 下棋尝试 ${attempt + 1} 失败:`, error);
                
                // 只有在最后一次尝试失败时才显示错误状态
                if (attempt === maxRetries) {
                    this.showAIStrategy('❌ 连接失败', 'error');
                    alert('AI 下棋失败，请检查 API Key 或网络连接');
                    break;
                } else {
                    // 第一次API错误时，显示重试信息但保持思考状态
                    this.addLog(`🔄 API调用失败，准备重试...`, 'warning');
                    await this.delay(1000);
                }
            }
        }

        // 处理最终结果
        if (myToken !== this._aiMoveToken) return;
        if (!moveResult || !moveResult.success) {
            this.handleAIMoveFailed();
        }

        if (myToken !== this._aiMoveToken) return;
        this.aiThinking = false;
        this.updateDisplay();
    }

    // 延迟函数
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 单次AI下棋尝试
    async attemptAIMove(attemptNumber) {
        this.showDebugInfo(`AI下棋尝试 ${attemptNumber + 1}`);
        
        const move = await this.getAIMove();
        
        if (move && this.isValidMove(move.row, move.col)) {
            this.makeMove(move.row, move.col, this.aiColor);
            this.addLog(`✅ AI成功下棋: (${move.row},${move.col})`, 'success');
            return { success: true, move };
        } else {
            this.addLog(`❌ AI第${attemptNumber + 1}次尝试失败: 无有效落子`, 'error');
            return { success: false, move };
        }
    }

    // 处理AI下棋失败的情况
    handleAIMoveFailed() {
        this.addLog(`⚠️ AI两次尝试均失败，启动应急处理`, 'warning');
        
        if (!this.hasValidMoves()) {
            this.showAIStrategy('🏁 游戏结束', 'info');
            this.checkGameEnd(); // 棋盘满了，正常结束游戏
        } else {
            // 棋盘未满但AI无法下棋，使用智能降级
            const smartMove = this.getSmartMove();
            if (smartMove && this.isValidMove(smartMove.row, smartMove.col)) {
                this.makeMove(smartMove.row, smartMove.col, this.aiColor);
                this.showAIStrategy('🎯 智能降级', 'fallback');
                this.addLog(`🎯 AI降级下棋: (${smartMove.row},${smartMove.col})`, 'info');
            } else {
                this.showAIStrategy('❌ 完全失败', 'error');
                alert('AI无有效落子，且智能降级也失败！');
            }
        }
    }

    // 在界面上显示调试信息（手机浏览器友好）
    showDebugInfo(message) {
        this.addLog(message, 'info');
    }
    
    // 初始化日志窗口
    initLogWindow() {
        const clearBtn = document.getElementById('clear-log');
        const debugToggle = document.getElementById('debug-toggle');
        const debugPanel = document.getElementById('debug-panel');
        
        // 调试模式开关
        debugToggle.addEventListener('change', (e) => {
            this.debugMode = e.target.checked;
            if (this.debugMode) {
                debugPanel.style.display = 'block';
                this.addLog('🔧 调试模式已开启', 'success');
                const debugInfo = document.getElementById('debug-info');
                if (debugInfo) debugInfo.style.display = 'block';
            } else {
                debugPanel.style.display = 'none';
                const debugInfo = document.getElementById('debug-info');
                if (debugInfo) debugInfo.style.display = 'none';
            }
        });
        
        // 清空日志
        clearBtn.addEventListener('click', () => {
            this.clearLogs();
        });
        
        // 初始状态
        this.debugMode = false;
        debugPanel.style.display = 'none';
    }
    
    // 添加日志条目
    addLog(message, type = 'info') {
        // 只有在调试模式开启时才添加日志
        if (!this.debugMode) return;
        
        const logContent = document.getElementById('log-content');
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}`;
        logEntry.innerHTML = `<span style="color: #999;">[${timestamp}]</span> ${message}`;
        
        logContent.appendChild(logEntry);
        
        // 自动滚动到底部
        logContent.scrollTop = logContent.scrollHeight;
        
        // 限制日志条目数量，避免占用太多内存
        const entries = logContent.querySelectorAll('.log-entry');
        if (entries.length > 100) {
            entries[0].remove();
        }
    }
    
    // 清空所有日志
    clearLogs() {
        const logContent = document.getElementById('log-content');
        logContent.innerHTML = '<div class="log-entry">日志已清空</div>';
        if (this.debugMode) {
            this.addLog('🧹 日志已清空', 'info');
        }
    }
    
    // 清除调试信息（统一至页面上的 debug-info 区域，并在调试模式下记录分隔线）
    clearDebugInfo() {
        const debugElement = document.getElementById('debug-info');
        if (debugElement) {
            debugElement.innerHTML = '';
            debugElement.style.display = 'none';
        }
        if (this.debugMode) {
            this.addLog('=== 🎮 新游戏开始 ===', 'success');
        }
    }
    
    // 显示棋盘状态给用户看（调试用）
    showBoardStateDebug() {
        if (!this.debugMode) return;
        const boardState = this.getBoardStateString();
        this.showTemporaryDebug(`<strong>AI看到的棋盘:</strong><br><pre style="font-size:8px; line-height:1;">${boardState}</pre>`, 8000);
    }
    
    // 显示完整的AI提示内容（调试用）
    showPromptDebug(prompt) {
        if (!this.debugMode) return;
        this.showTemporaryDebug(`<strong>发送给AI的完整提示:</strong><br><pre style="font-size:7px; line-height:1.1; max-height:50px; overflow-y:auto;">${prompt}</pre>`, 12000);
    }

    // 统一的调试信息显示（避免多次setTimeout导致闪烁）
    showTemporaryDebug(html, durationMs) {
        const debugElement = document.getElementById('debug-info');
        if (!debugElement) return;
        debugElement.style.display = 'block';
        debugElement.innerHTML = html;
        // 默认不自动隐藏，避免元素反复消失造成布局跳变
        if (this._debugInfoTimer) {
            clearTimeout(this._debugInfoTimer);
            this._debugInfoTimer = null;
        }
        if (this._autoHideDebug && durationMs && durationMs > 0) {
            this._debugInfoTimer = setTimeout(() => {
                debugElement.style.display = 'none';
            }, durationMs);
        }
    }

    // 显示AI策略状态在机器人区域
    showAIStrategy(message, type = 'thinking') {
        const strategyElement = document.getElementById('ai-strategy-display');
        
        if (strategyElement) {
            strategyElement.innerHTML = `<span>策略: ${message}</span>`;
            
            // 清除之前的样式类
            strategyElement.className = 'ai-strategy-display';
            // 添加新的策略类型样式
            strategyElement.classList.add(type);
            this.addLog(`🎯 AI策略更新: ${message}`, 'info');
        } else {
            this.addLog('❌ 找不到ai-strategy-display元素！', 'error');
        }
    }

    // 重置AI策略显示
    resetAIStrategy() {
        const strategyElement = document.getElementById('ai-strategy-display');
        
        if (strategyElement) {
            strategyElement.innerHTML = '<span>策略: 🤖 AI模式</span>';
            strategyElement.className = 'ai-strategy-display';
            this.addLog('🔄 AI策略显示已重置', 'info');
        } else {
            this.addLog('❌ 找不到ai-strategy-display元素！', 'error');
        }
    }

    async getAIMove() {
        const boardState = this.getBoardStateString();
        const prompt = this.generateGoPrompt(boardState);
        
        this.addLog('📤 发送AI提示完成', 'info');
        this.showBoardStateDebug();
        this.showPromptDebug(prompt);
        this.showDebugInfo(`棋盘状态已获取，准备发送给AI`);

        try {
            const apiResponse = await window.AI.callDeepSeekAPI(this.apiKey, prompt, Math.random().toString(36).substring(2, 15));
            return this.parseAIMoveResponse(apiResponse, boardState);
        } catch (error) {
            console.error('DeepSeek API 调用失败:', error);
            const debugMsg = `API错误:${error.message.substring(0,20)}`;
            this.addLog(`❌ API错误: ${debugMsg} | 完整错误: ${error.message}`, 'error');
            throw error; // 重新抛出错误，让上层处理重试
        }
    }

    // 调用DeepSeek API
    async callDeepSeekAPI(prompt) {
        this.addLog('🚀 开始API调用...', 'info');
        
        // 添加随机ID确保每次请求都是独立的
        const requestId = Math.random().toString(36).substring(2, 15);
        
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
                'X-Request-ID': requestId,  // 添加唯一请求ID
                'Cache-Control': 'no-cache, no-store, max-age=0',  // 强制不缓存
                'Pragma': 'no-cache'  // 兼容HTTP/1.0
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    {
                        role: 'system',
                        content: `你是围棋AI。请求ID: ${requestId}。严格按照以下规则：\n1. 只能从用户提供的白名单中选择位置\n2. 坐标格式必须是"行号,列号"，例如"3,4"\n3. 必须回显用户的请求标识(Nonce)以验证非缓存回复\n4. 输出格式: "row,col | Nonce:<用户提供的nonce>"\n5. 禁止任何解释、分析或额外文字\n6. 每次分析都要重新检查棋盘状态，不要依赖任何之前的记忆`
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.1,  // 降低随机性，提高一致性
                max_tokens: 30,    // 限制输出长度
                top_p: 1.0,        // 确保选择最可能的输出
                presence_penalty: 0.0,  // 不惩罚重复，确保一致性
                frequency_penalty: 0.0  // 不惩罚频率，确保一致性
            })
        });

        this.addLog(`📡 API响应状态: ${response.status} (请求ID: ${requestId})`, response.ok ? 'success' : 'error');
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API错误详情:', errorText);
            throw new Error(`API 请求失败: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const responseContent = data.choices[0].message.content.trim();
        this.addLog(`📨 API原始回复: "${responseContent}"`, 'info');
        return responseContent;
    }

    // 解析AI回复并验证移动
    parseAIMoveResponse(moveText, boardState) {
        this.addLog(`🤖 AI原始回复: "${moveText}"`, 'info');
        this.addLog(`🔍 AI回复长度: ${moveText.length} 字符`, 'info');
        this.addLog(`🔍 AI回复字符码: [${moveText.split('').map(c => c.charCodeAt(0)).join(', ')}]`, 'info');
        this.showDebugInfo(`AI回复: "${moveText}"`);

        // 第一步：验证 Nonce，防止AI使用缓存或历史记忆
        const nonceMatch = moveText.match(/Nonce\s*:\s*([a-z0-9]+)/i);
        if (!nonceMatch || nonceMatch[1] !== this._lastNonce) {
            this.addLog(`❌ Nonce 验证失败！期望: ${this._lastNonce}, 实际: ${nonceMatch ? nonceMatch[1] : '无'}`, 'error');
            this.addLog(`💡 疑似AI使用了缓存或历史记忆，丢弃此回复`, 'warning');
            return null;
        }
        this.addLog(`✅ Nonce 验证通过: ${nonceMatch[1]}`, 'success');

        // 第二步：解析坐标
        let match = moveText.match(/(\d+),(\d+)/);
        this.addLog(`🎯 第一次正则匹配 /(\d+),(\d+)/ 结果: ${match ? `成功 [${match[1]},${match[2]}]` : '失败'}`, match ? 'success' : 'warning');
        
        if (!match) {
            // 尝试其他格式: (row, col) 或 row col
            match = moveText.match(/\((\d+),\s*(\d+)\)/) || moveText.match(/(\d+)\s+(\d+)/);
            this.addLog(`🎯 备用正则匹配结果: ${match ? `成功 [${match[1]},${match[2]}]` : '失败'}`, match ? 'success' : 'warning');
        }
        
        if (!match) {
            // 更多格式尝试
            const patterns = [
                { regex: /行\s*(\d+)\s*列\s*(\d+)/, name: '中文格式' },
                { regex: /(\d+)\s*,\s*(\d+)/, name: '带空格逗号' },
                { regex: /\[(\d+),(\d+)\]/, name: '方括号格式' },
                { regex: /position\s*:?\s*(\d+),(\d+)/i, name: 'position格式' },
                { regex: /move\s*:?\s*(\d+),(\d+)/i, name: 'move格式' },
                { regex: /(\d+)[-–](\d+)/, name: '短横线格式' }
            ];
            
            for (const {regex, name} of patterns) {
                match = moveText.match(regex);
                this.addLog(`🎯 尝试${name} ${regex}: ${match ? `成功 [${match[1]},${match[2]}]` : '失败'}`, match ? 'success' : 'info');
                if (match) break;
            }
        }
        
        if (!match) {
            const debugMsg = `解析失败:"${moveText}"`;
            this.addLog(`❌ AI解析失败: ${debugMsg} | 无法从"${moveText}"中解析出坐标`, 'error');
            this.addLog(`🔍 尝试的正则表达式:`, 'info');
            this.addLog(`   1. /(\d+),(\d+)/ - 匹配 "数字,数字"`, 'info');
            this.addLog(`   2. /\((\d+),\s*(\d+)\)/ - 匹配 "(数字,数字)"`, 'info');
            this.addLog(`   3. /(\d+)\s+(\d+)/ - 匹配 "数字 数字"`, 'info');
            this.addLog(`💡 可能的原因: AI回复包含额外文字、特殊字符或格式不标准`, 'warning');
            this.showDebugInfo(`AI解析失败: ${debugMsg} | 无法从"${moveText}"中解析出坐标`);
            return null;
        }

        const row = parseInt(match[1]);
        const col = parseInt(match[2]);
        this.addLog(`🎯 解析坐标: (${row},${col})`, 'info');

        // 第三步：白名单验证
        // 使用更安全的白名单（至少2气或能立即提子）；若为空则回退到所有合法点
        const safeMoves = this.getAllSafeMoves(2);
        const whitelist = safeMoves.length > 0 ? safeMoves : this.getAllAllowedMoves();
        const isInWhitelist = whitelist.some(([r, c]) => r === row && c === col);
        if (!isInWhitelist) {
            this.addLog(`❌ 坐标不在白名单中: (${row},${col})`, 'error');
            this.addLog(`📝 当前白名单: ${whitelist.map(([r,c]) => `${r},${c}`).join(' | ')}`, 'info');
            this.showDebugInfo(`坐标(${row},${col})不在白名单中`);
            return null;
        }
        this.addLog(`✅ 白名单验证通过: (${row},${col})`, 'success');
        
        // 第四步：最终验证坐标有效性
        const validationResult = this.validateAIMove(row, col, moveText, boardState);
        if (validationResult.isValid) {
            this.addLog(`✅ AI成功选择: (${row},${col})`, 'success');
            this.showDebugInfo(`✅ AI成功选择: (${row},${col})`);
            return { row, col };
        } else {
            this.addLog(`❌ AI移动无效: ${validationResult.reason}`, 'error');
            this.showDebugInfo(`AI移动无效: ${validationResult.reason}`);
            return null;
        }
    }

    // 验证AI移动的有效性
    validateAIMove(row, col, originalResponse, boardState) {
        // 检查坐标范围
        if (row < 0 || row >= this.boardSize || col < 0 || col >= this.boardSize) {
            const reason = `坐标超出范围(${row},${col})，范围应为0-${this.boardSize-1}`;
            this.addLog(`❌ ${reason}`, 'error');
            return { isValid: false, reason };
        }
        
        // 检查位置是否已被占用
        if (this.board[row][col] !== null) {
            const occupiedBy = this.board[row][col];
            const reason = `位置已占用(${row},${col})被${occupiedBy}占用`;
            this.addLog(`❌ ${reason} | AI回复:"${originalResponse}"`, 'error');
            return { isValid: false, reason };
        }
        
        // 检查是否为自杀手
        if (this.isSuicideMove(row, col, this.aiColor)) {
            const reason = `自杀手(${row},${col})`;
            this.addLog(`❌ 自杀手: ${reason}`, 'error');
            return { isValid: false, reason };
        }
        
        return { isValid: true };
    }

    // 智能降级策略（加入启发式优先级）
    getSmartMove() {
        const originalPlayer = this.currentPlayer;
        this.currentPlayer = this.aiColor;
        
        // 0. 启发式Top候选优先
        const topMoves = this.getTopHeuristicMoves(5);
        let picked = null;
        if (this.difficulty >= 3) {
            // 三星：选择评分最高后，做一层安全搜索微调
            const pickedGreedy = topMoves[0];
            const refined = this.chooseWithOnePly(topMoves);
            picked = refined || pickedGreedy;
        } else if (this.difficulty === 2) {
            // 二星：在Top2随机
            const pool = topMoves.slice(0, Math.min(2, topMoves.length));
            picked = pool[Math.floor(Math.random() * pool.length)];
        } else {
            // 一星：在Top5随机，且10%全局随机
            if (Math.random() < 0.10) {
                picked = this.getRandomValidMove();
            } else {
                const pool = topMoves;
                picked = pool[Math.floor(Math.random() * pool.length)];
            }
        }
        if (picked && this.isValidMove(picked.row, picked.col)) {
            this.currentPlayer = originalPlayer;
            this.addLog(`🧠 难度${this.difficulty} 选择 (${picked.row},${picked.col})`, 'success');
            return { row: picked.row, col: picked.col };
        }

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
                        this.addLog(`🎯 智能降级：选择攻击位置 (${row},${col})`, 'info');
                        return { row, col };
                    }
                }
            }
        }
        
        // 2. 其次考虑重要位置：按围棋价值排序（使用统一的战略位置定义）
        const strategicMovesByPriority = this.strategicPositions
            .sort((a, b) => a.priority - b.priority) // 按优先级排序
            .map(item => item.pos); // 只取坐标
        
        for (const [row, col] of strategicMovesByPriority) {
            if (this.isValidMove(row, col)) {
                this.currentPlayer = originalPlayer;
                this.addLog(`🎯 智能降级：选择战略位置 (${row},${col})`, 'info');
                return { row, col };
            }
        }
        
        // 3. 最后随机选择
        const randomMove = this.getRandomValidMove();
        this.currentPlayer = originalPlayer;
        this.addLog('🎯 智能降级：随机选择', 'info');
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

    // 计算一个落子的启发式评分（不考虑长变，只做快速评估）
    evaluateMove(row, col, color) {
        // 前置：临时落子
        this.board[row][col] = color;

        // 1) 直接提子收益
        const captureStones = this.simulateCaptures(row, col, color);

        // 2) 自身落子后的气数（安全性）
        const myGroup = this.getGroup(row, col);
        const myLiberties = this.countGroupLiberties(myGroup);

        // 3) 与己方连接（相邻己方子数量）
        const friendlyAdjacents = this.countAdjacentColor(row, col, color);

        // 4) 中央偏好（距离天元越近越好）
        const center = Math.floor(this.boardSize / 2);
        const centerDistance = Math.abs(row - center) + Math.abs(col - center);

        // 5) 战略点加成（按预设优先级）
        let strategicBonus = 0;
        for (const item of this.strategicPositions) {
            const [r, c] = item.pos;
            if (r === row && c === col) {
                // 优先级 1 分值最高
                strategicBonus = (6 - item.priority) * 6; // 30/24/18/12/6
                break;
            }
        }

        // 6) 危险惩罚：自打气过少且未提子
        let dangerPenalty = 0;
        if (captureStones === 0 && myLiberties <= 1) {
            dangerPenalty = 25;
        }

        // 权重组合（可调）
        const score =
            captureStones * 100 +        // 直接提子优先
            myLiberties * 6 +            // 气越多越安全
            friendlyAdjacents * 5 +      // 连接收益
            strategicBonus +             // 战略位
            (10 - centerDistance) * 2 -  // 越靠中心越好
            dangerPenalty;               // 危险惩罚

        // 回滚临时落子
        this.board[row][col] = null;
        return score;
    }

    // 统计一个棋子群的气数
    countGroupLiberties(group) {
        const liberties = new Set();
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (const [row, col] of group) {
            for (const [dr, dc] of directions) {
                const r = row + dr;
                const c = col + dc;
                if (this.isInBounds(r, c) && this.board[r][c] === null) {
                    liberties.add(`${r},${c}`);
                }
            }
        }
        return liberties.size;
    }

    // 统计落子点相邻的己方子数量
    countAdjacentColor(row, col, color) {
        let count = 0;
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (const [dr, dc] of directions) {
            const r = row + dr;
            const c = col + dc;
            if (this.isInBounds(r, c) && this.board[r][c] === color) {
                count++;
            }
        }
        return count;
    }

    // 基于启发式评分选出 Top-N 候选
    getTopHeuristicMoves(limit = 5) {
        const originalPlayer = this.currentPlayer;
        this.currentPlayer = this.aiColor;
        const allowedMoves = this.getAllAllowedMoves();

        const scored = allowedMoves.map(([row, col]) => {
            const score = this.evaluateMove(row, col, this.aiColor);
            return { row, col, score };
        });

        scored.sort((a, b) => b.score - a.score);
        this.currentPlayer = originalPlayer;

        const top = scored.slice(0, limit);
        if (this.debugMode) {
            this.addLog(`🧠 启发式Top${limit}: ${top.map(m => `${m.row},${m.col}(${m.score})`).join(' | ')}`, 'info');
        }
        return top;
    }

    // 按指定颜色检查合法落点（不改变外部状态）
    isValidFor(color, row, col) {
        const original = this.currentPlayer;
        this.currentPlayer = color;
        const ok = this.isValidMove(row, col);
        this.currentPlayer = original;
        return ok;
    }

    // 获取某颜色的所有合法落点
    getAllAllowedMovesFor(color) {
        const original = this.currentPlayer;
        this.currentPlayer = color;
        const moves = [];
        for (let r = 0; r < this.boardSize; r++) {
            for (let c = 0; c < this.boardSize; c++) {
                if (this.isValidMove(r, c)) moves.push([r, c]);
            }
        }
        this.currentPlayer = original;
        return moves;
    }

    // 三星用：对候选做一层安全搜索，规避对手立即最强反击
    chooseWithOnePly(candidates) {
        if (!candidates || candidates.length === 0) return null;
        let best = null;
        let bestScore = -Infinity;

        for (const m of candidates) {
            const row = m.row ?? m[0];
            const col = m.col ?? m[1];
            if (!this.isValidFor(this.aiColor, row, col)) continue;

            // 自身启发分
            const selfScore = this.evaluateMove(row, col, this.aiColor);

            // 快照
            const boardSnapshot = this.board.map(r => r.slice());
            const prevBlackCaptured = this.blackCaptured;
            const prevWhiteCaptured = this.whiteCaptured;
            const prevEffects = this.captureEffects.slice();
            const originalPlayer = this.currentPlayer;

            // 模拟我方落子
            this.currentPlayer = this.aiColor;
            this.board[row][col] = this.aiColor;
            this.checkCaptures(row, col, this.aiColor);

            // 对手最坏回应
            let worstOpp = +Infinity;
            const oppColor = this.aiColor === 'black' ? 'white' : 'black';
            const oppMoves = this.getAllAllowedMovesFor(oppColor);
            for (const [rr, cc] of oppMoves) {
                // 简单评估对手收益（越大越坏）
                const v = this.evaluateMove(rr, cc, oppColor);
                if (v < worstOpp) worstOpp = v; // 取最小即对我最坏
            }

            // 回滚
            this.board = boardSnapshot.map(r => r.slice());
            this.blackCaptured = prevBlackCaptured;
            this.whiteCaptured = prevWhiteCaptured;
            this.captureEffects = prevEffects.slice();
            this.currentPlayer = originalPlayer;

            // 综合分：自身收益 - 0.8 * 对手最强反击收益
            const finalScore = selfScore - 0.8 * (worstOpp === +Infinity ? 0 : -worstOpp);
            // 注意：evaluateMove 越大对对应颜色越好，worstOpp 是对手的“最小v”，对我越坏意味着值越大
            // 上面写成 self - 0.8 * oppBest
            const oppBest = (worstOpp === +Infinity) ? 0 : -worstOpp; // 将最小v转为对手最佳正收益
            const combined = selfScore - 0.8 * oppBest;

            if (combined > bestScore) {
                bestScore = combined;
                best = { row, col };
            }
        }

        return best;
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

    // 简易FNV-1a哈希用于KO判断
    boardHash() {
        const s = this.getBoardStateString();
        let h = 2166136261 >>> 0;
        for (let i = 0; i < s.length; i++) {
            h ^= s.charCodeAt(i);
            h = Math.imul(h, 16777619) >>> 0;
        }
        return h >>> 0;
    }

    generateGoPrompt(boardState) {
        const lastMove = this.gameHistory.length > 0 ? this.gameHistory[this.gameHistory.length - 1] : null;
        // 获取更安全的白名单（优先安全落点）
        const safeMoves = this.getAllSafeMoves(2);
        const allowedMoves = safeMoves.length > 0 ? safeMoves : this.getAllAllowedMoves();
        const allowedText = allowedMoves.map(([r, c]) => `${r},${c}`).join(' | ');
        // 启发式Top5
        const topMovesHeuristic = this.getTopHeuristicMoves(5);
        const topMovesText = topMovesHeuristic.map(m => `${m.row},${m.col}`).join(' | ');
        this.addLog(`📝 白名单位置: ${allowedText}`, 'info');
        const { prompt, nonce } = window.AI.generatePrompt({
            boardState,
            allowedMovesText: allowedText,
            topMovesText,
            aiColor: this.aiColor,
            lastMove
        });
        this._lastNonce = nonce;
        this.addLog(`🔐 本次请求 Nonce: ${nonce}`, 'info');
        return prompt;
    }

    // 获取所有允许的落子位置（白名单）
    getAllAllowedMoves() {
        const allowedMoves = [];
        const originalPlayer = this.currentPlayer;
        this.currentPlayer = this.aiColor;
        
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (this.isValidMove(row, col)) {
                    allowedMoves.push([row, col]);
                }
            }
        }
        
        this.currentPlayer = originalPlayer;
        this.addLog(`🎯 当前允许的所有位置共 ${allowedMoves.length} 个: ${allowedMoves.map(([r,c]) => `${r},${c}`).join(' | ')}`, 'info');
        return allowedMoves;
    }

    // 获取更安全的落子集合：至少liberties>=minLib或能立即提子
    getAllSafeMoves(minLib = 2) {
        const safe = [];
        const original = this.currentPlayer;
        this.currentPlayer = this.aiColor;
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (!this.isValidMove(row, col)) continue;
                // 模拟落子
                this.board[row][col] = this.aiColor;
                const myGroup = this.getGroup(row, col);
                const myLiberties = this.countGroupLiberties(myGroup);
                const captured = this.simulateCaptures(row, col, this.aiColor);
                this.board[row][col] = null;
                if (captured > 0 || myLiberties >= minLib) {
                    safe.push([row, col]);
                }
            }
        }
        this.currentPlayer = original;
        return safe;
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
        this.resetAIStrategy(); // 重置AI策略显示
        this.positionAIStrategyDisplay(); // 确保新局面板位置正确
        
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
        const dpr = window.devicePixelRatio || 1;
        const width = this.canvas.width / dpr;
        const height = this.canvas.height / dpr;
        
        // 清空画布
        ctx.clearRect(0, 0, width, height);
        
        // 绘制背景
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, '#deb887');
        gradient.addColorStop(1, '#cd853f');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        
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

        // 绘制提子动画效果
        if (this.captureEffects.length > 0) {
            const now = performance.now();
            const nextEffects = [];
            for (const eff of this.captureEffects) {
                const elapsed = now - eff.start;
                const t = Math.min(elapsed / eff.duration, 1);
                const alpha = 1 - t; // 由亮到淡
                const radius = this.cellSize * (0.45 + 0.25 * t);
                const x = padding + eff.col * this.cellSize;
                const y = padding + eff.row * this.cellSize;
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, 2 * Math.PI);
                ctx.strokeStyle = '#ffd166';
                ctx.lineWidth = 4;
                ctx.stroke();
                ctx.restore();
                if (t < 1) nextEffects.push(eff);
            }
            this.captureEffects = nextEffects;
            if (this.captureEffects.length > 0) {
                requestAnimationFrame(() => this.drawBoard());
            }
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
