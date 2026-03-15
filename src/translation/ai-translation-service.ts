import { agentCommand } from "../commands/agent.js";

export class AITranslationService {
  private cache = new Map<string, string>();

  async translate(text: string, fromLang: string, toLang: string): Promise<string> {
    if (!text?.trim()) return text;
    
    // Skip translation if not needed
    const hasChinese = /[\u4e00-\u9fa5]/.test(text);
    if (fromLang === 'zh' && !hasChinese) return text; // No Chinese to translate
    if (fromLang === 'en' && hasChinese) return text; // Already Chinese
    
    const key = `${fromLang}:${toLang}:${text}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    try {
      const result = await this.executeTranslation(text, fromLang, toLang);
      this.cache.set(key, result);
      return result;
    } catch (err) {
      console.error('[AI Translation] Failed:', err);
      return text;
    }
  }

  private async executeTranslation(text: string, fromLang: string, toLang: string): Promise<string> {
    const direction = fromLang === 'zh' ? 'Chinese to English' : 'English to Chinese';
    const prompt = `Translate the following text from ${direction}. Preserve code blocks, technical terms, and formatting. Output ONLY the translated text without explanations:\n\n${text}`;

    const result = await agentCommand({
      message: prompt,
      sessionKey: 'internal-translation',
      agentId: 'main',
      deliver: false,
      to: undefined,
    });

    // Extract text from payloads
    const payloads = result.payloads || [];
    const textParts = payloads.map((p: any) => p.text || '').filter(Boolean);
    return textParts.join('\n').trim() || text;
  }
}

export const aiTranslationService = new AITranslationService();
