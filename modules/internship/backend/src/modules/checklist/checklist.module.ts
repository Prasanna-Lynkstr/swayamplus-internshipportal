import { Global, Module } from '@nestjs/common';
import type { Provider } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CHECKLIST_GENERATOR_SERVICE } from './checklist.constants.js';
import { HeuristicChecklistGeneratorService } from './heuristic-checklist-generator.service.js';
import { AnthropicChecklistGeneratorService } from './anthropic-checklist-generator.service.js';
import { APP_LOGGER } from '../../common/logging/app-logger.constants.js';
import type { AppLogger } from '../../common/logging/app-logger.types.js';

const checklistProvider: Provider = {
  provide: CHECKLIST_GENERATOR_SERVICE,
  inject: [ConfigService, APP_LOGGER],
  useFactory: (config: ConfigService, logger: AppLogger) => {
    const maxItems = config.get<number>('CHECKLIST_MAX_ITEMS', 6);
    const provider = config.get<string>('CHECKLIST_PROVIDER', 'heuristic');
    const apiKey = config.get<string>('ANTHROPIC_API_KEY', '');
    if (provider === 'anthropic' && apiKey) {
      return new AnthropicChecklistGeneratorService(
        apiKey,
        config.get<string>('CHECKLIST_LLM_MODEL', 'claude-haiku-4-5-20251001'),
        maxItems,
        logger,
      );
    }
    return new HeuristicChecklistGeneratorService(maxItems);
  },
};

@Global()
@Module({
  imports: [ConfigModule],
  providers: [checklistProvider],
  exports: [CHECKLIST_GENERATOR_SERVICE],
})
export class ChecklistModule {}
