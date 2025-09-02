// 负责与 DeepSeek 通信
export async function callDeepSeekAPI(apiKey, prompt, requestId) {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'X-Request-ID': requestId,
            'Cache-Control': 'no-cache, no-store, max-age=0',
            'Pragma': 'no-cache'
        },
        body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
                { role: 'system', content: `你是围棋AI。请求ID: ${requestId}。严格按照以下规则：\n1. 只能从用户提供的白名单中选择位置\n2. 坐标格式必须是"行号,列号"，例如"3,4"\n3. 必须回显用户的请求标识(Nonce)以验证非缓存回复\n4. 输出格式: "row,col | Nonce:<用户提供的nonce>"\n5. 禁止任何解释、分析或额外文字\n6. 每次分析都要重新检查棋盘状态，不要依赖任何之前的记忆` },
                { role: 'user', content: prompt }
            ],
            temperature: 0.1,
            max_tokens: 30,
            top_p: 1.0,
            presence_penalty: 0.0,
            frequency_penalty: 0.0
        })
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API 请求失败: ${response.status} - ${errorText}`);
    }
    const data = await response.json();
    return data.choices[0].message.content.trim();
}

// 兼容全局
if (typeof window !== 'undefined') {
    window.AI = window.AI || {};
    window.AI.callDeepSeekAPI = callDeepSeekAPI;
}


