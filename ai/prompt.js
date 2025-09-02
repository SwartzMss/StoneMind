// 负责拼装围棋提示与 Nonce
export function generatePrompt({
    boardState,
    allowedMovesText,
    topMovesText,
    aiColor,
    lastMove
}) {
    const nonce = Math.random().toString(36).substring(2, 15);
    let prompt = `【围棋对局】9x9棋盘，请选择最佳落子位置。\n\n`;
    prompt += `【棋盘状态】(行列坐标从0开始，B=黑子，W=白子，.=空位)：\n${boardState}`;
    prompt += `\n【允许位置白名单】：${allowedMovesText}\n`;
    prompt += `【请求标识】：${nonce}\n`;
    if (topMovesText) {
        prompt += `\n【🧠 启发式Top5】：${topMovesText}\n`;
    }
    if (lastMove) {
        prompt += `\n【上一手】：${lastMove.color === 'black' ? '黑子' : '白子'}下在(${lastMove.row},${lastMove.col})`;
    }
    prompt += `\n【你的颜色】：${aiColor === 'black' ? '黑子(B)' : '白子(W)'}`;
    prompt += `\n\n【输出格式】：只返回 "row,col | Nonce:${nonce}"`;
    prompt += `\n【禁止】：任何解释、分析或额外文字`;
    prompt += `\n\n请从白名单中选择最佳位置：`;
    return { prompt, nonce };
}

// 同时暴露到全局，方便非模块脚本访问
if (typeof window !== 'undefined') {
    window.AI = window.AI || {};
    window.AI.generatePrompt = generatePrompt;
}


