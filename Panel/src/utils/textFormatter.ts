export function formatAiResponse(content: string): string {
    let fullAiResponse = content;

    // QWEN THINKING MODE HANDLE
    const thinkMatch = fullAiResponse.match(/<think>[\s\S]*?<\/think>\s*([\s\S]*)/);
    if (thinkMatch && thinkMatch[1]) {
        fullAiResponse = thinkMatch[1].trim();
    } else {
        fullAiResponse = fullAiResponse.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    }

    // SAHTE URL TEMİZLEYİCİ
    fullAiResponse = fullAiResponse.replace(/https?:\/\/[^\s\)\"\]]{150,}/g, '[Link dogrulanamadi — web_ara ile arama yap]');
    fullAiResponse = fullAiResponse.replace(/https?:\/\/[^\s]*?(\d{1,3}-){10,}[^\s]*/g, '[Sahte link tespit edildi]');

    // FİLTRELER
    let filteredText = fullAiResponse;
    filteredText = filteredText.replace(/[\u{1F600}-\u{1F64F}]/gu, '');
    filteredText = filteredText.replace(/[\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
    filteredText = filteredText.replace(/\s+([\.?!,])/g, '$1');
    filteredText = filteredText.replace(/\s*\((?:neural networks?|machine learning|deep learning|artificial intelligence|data science|natural language processing)\)/gi, '');
    filteredText = filteredText.replace(/\bneural networks?\b/gi, 'sinir ağları');
    filteredText = filteredText.replace(/\bmachine learning\b/gi, 'makine öğrenmesi');
    filteredText = filteredText.replace(/\bdeep learning\b/gi, 'derin öğrenme');
    filteredText = filteredText.replace(/\bartificial intelligence\b/gi, 'yapay zeka');
    filteredText = filteredText.replace(/\bdata science\b/gi, 'veri bilimi');
    filteredText = filteredText.replace(/\s*Ne yapmak istersin\??\s*/gi, '').trim();
    filteredText = filteredText.replace(/\s*Hangisini tercih edersiniz\??\s*/gi, '').trim();
    filteredText = filteredText.replace(/\s*[İi]stersen daha fazla bilgi alabiliriz\.?\s*/gi, '').trim();
    filteredText = filteredText.replace(/\s*Ne düşünüyorsun,?\s*\w*\??\s*$/gi, '').trim();

    // TEKRAR KESİCİ
    const sentences = filteredText.split(/(?<=[\.!?])\s+/);
    const seen = new Set<string>();
    const cleaned: string[] = [];
    let repeatHit = 0;

    for (const s of sentences) {
        const norm = s.trim().toLowerCase().replace(/\s+/g, ' ');
        if (norm.length > 20 && seen.has(norm)) { 
            repeatHit++; 
            if (repeatHit >= 2) break; 
            continue; 
        }
        seen.add(norm); 
        cleaned.push(s);
    }

    if (repeatHit > 0) { 
        filteredText = cleaned.join(' ').trim(); 
    }

    return filteredText;
}

export function convertToHtml(markdownText: string): string {
    let htmlResponse = markdownText;
    htmlResponse = htmlResponse.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
    htmlResponse = htmlResponse.replace(/(?<!href=")(https?:\/\/[^\s<)"]+)/g, '<a href="$1" target="_blank">$1</a>');
    htmlResponse = htmlResponse.replace(/^#{1,4}\s+(.+)$/gm, '<strong>$1</strong>');
    htmlResponse = htmlResponse.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    htmlResponse = htmlResponse.replace(/\n/g, '<br>');
    return htmlResponse;
}
