import { spawn } from "node:child_process";
import { writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export class ArgosTranslationService {
  private cache = new Map<string, string>();

  async translate(text: string, fromLang: string, toLang: string): Promise<string> {
    if (!text?.trim()) return text;
    
    console.log(`[Translation] Input (${fromLang}→${toLang}):`, text.substring(0, 50));
    
    const key = `${fromLang}:${toLang}:${text}`;
    if (this.cache.has(key)) {
      console.log('[Translation] Cache hit');
      return this.cache.get(key)!;
    }

    try {
      const result = await this.executeTranslation(text, fromLang, toLang);
      console.log('[Translation] Success:', result.substring(0, 50));
      this.cache.set(key, result);
      return result;
    } catch (err) {
      console.error('[Translation] Failed:', err);
      return text; // Fallback to original text on error
    }
  }

  private async executeTranslation(text: string, fromLang: string, toLang: string): Promise<string> {
    const tmpFile = join(tmpdir(), `argos-${Date.now()}.txt`);
    await writeFile(tmpFile, text, "utf-8");

    return new Promise((resolve, reject) => {
      // Escape backslashes for Windows paths
      const escapedPath = tmpFile.replace(/\\/g, '\\\\');
      const proc = spawn("python", [
        "-c",
        `import sys; import argostranslate.translate; text = open(r'${escapedPath}', encoding='utf-8').read(); print(argostranslate.translate.translate(text, '${fromLang}', '${toLang}'))`,
      ], { timeout: 30000 });

      let output = "";
      proc.stdout.on("data", (data) => (output += data));
      proc.on("close", async (code) => {
        await unlink(tmpFile).catch(() => {});
        if (code !== 0) reject(new Error("Translation failed"));
        else resolve(output.trim());
      });
    });
  }
}

export const translationService = new ArgosTranslationService();
