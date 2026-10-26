import { ConfigService } from '@nestjs/config';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * RN-04: validates the x-api-key header against the keys configured in the
 * API_KEYS environment variable (several keys are allowed, one per hotel branch).
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey: string | undefined = request.headers['x-api-key'];

    if (!apiKey) {
      throw new UnauthorizedException('The x-api-key header is missing');
    }

    const validKeys = this.configService.get<string[]>('apiKeys') ?? [];

    if (validKeys.length === 0) {
      // Server-side misconfiguration, never a client error.
      this.logger.error('No API keys configured in the API_KEYS variable');
      throw new InternalServerErrorException('The API is not configured with access keys');
    }

    const isValid = validKeys.some((key) => this.matches(key, apiKey));

    if (!isValid) {
      throw new UnauthorizedException('Invalid API key');
    }

    return true;
  }

  /** Constant-time comparison so the key is never leaked by length or prefix. */
  private matches(configuredKey: string, receivedKey: string): boolean {
    const left = createHash('sha256').update(configuredKey).digest();
    const right = createHash('sha256').update(receivedKey).digest();
    return timingSafeEqual(left, right);
  }
}
