import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    // Primary check: if this looks like a Telegram webhook payload, allow
    // when the chat id matches the configured TELEGRAM_CHAT_ID.
    const tgChatId = process.env.TELEGRAM_CHAT_ID;
    try {
      const body: any = (req as any).body;
      const incomingChatId = body?.message?.chat?.id ?? body?.chat?.id ?? null;
      if (incomingChatId != null && tgChatId) {
        // Telegram chat ids can be numbers; compare as strings for robustness
        if (String(incomingChatId) === String(tgChatId)) {
          return true;
        }
        this.logger.warn('Telegram webhook chat id does not match TELEGRAM_CHAT_ID');
        return false;
      }
    } catch (e) {
      // ignore and fallthrough to other checks
    }

    // We only allow requests that are valid Telegram webhook payloads matching
    // the configured TELEGRAM_CHAT_ID. No API key fallback is used.
    if (!tgChatId) {
      this.logger.warn('TELEGRAM_CHAT_ID is not configured; admin endpoints are inaccessible');
      return false;
    }

    this.logger.warn('Request did not originate from Telegram webhook with matching TELEGRAM_CHAT_ID; denying access');
    return false;
  }
}
