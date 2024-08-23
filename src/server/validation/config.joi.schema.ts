import Joi from 'joi';

const urlConfigSchema = Joi.object({
  url: Joi.string().uri().required(),
  enabled: Joi.alternatives().try(Joi.boolean(), Joi.number().valid(0, 1)).required(),
  checkInterval: Joi.string().pattern(/^\d+-\d+$/),
  prefix: Joi.string().required(),
  imgСount: Joi.number().integer().positive(),
  onlyWithPhoto: Joi.boolean(),
  type: Joi.string().valid('re', 'car', 'other', 'phone').required(),
  tgId: Joi.string().optional().allow('')
});

const adSiteSchema = Joi.object({
  enabled: Joi.boolean().required(),
  urls: Joi.array().items(urlConfigSchema).required()
});

const telegramServiceConfigSchema = Joi.object({
  botToken: Joi.string().required(),
  defaultChatId: Joi.string().required(),
  errorChatId: Joi.string().required(),
  maxRetries: Joi.number().integer().positive(),
  retryDelay: Joi.number().positive()
});

const databaseSchema = Joi.object({
  type: Joi.string().valid('file', 'mongo', 'sql').required(),
  connection: Joi.string().required()
});

const loggerSchema = Joi.object({
  filePath: Joi.string(),
  remoteUrl: Joi.string().optional(),
  level: Joi.string().valid('info', 'error', 'warn', 'debug').required()
});

const serverSchema = Joi.object({
  enabled: Joi.alternatives().try(Joi.boolean(), Joi.number().valid(0, 1)).required(),
  port: Joi.number().port().required()
});

const queueConfigSchema = Joi.object({
  concurrency: Joi.number().integer().positive(),
  autostart: Joi.boolean(),
  maxRetries: Joi.number().integer().min(0),
  retryDelay: Joi.number().positive()
}).unknown(true);

const configSchema = Joi.object({
  telegram: telegramServiceConfigSchema.required(),
  database: databaseSchema.required(),
  logger: loggerSchema.required(),
  defaultCheckInterval: Joi.number().positive(),
  defaultImgCount: Joi.number().integer().positive().required(),
  sites: Joi.object().pattern(Joi.string(), adSiteSchema).required(),
  server: serverSchema.required(),
  queues: Joi.object().pattern(Joi.string(), queueConfigSchema).required()
});

export default configSchema;

export async function validateConfig(config: any): Promise<{ error?: Joi.ValidationError, value: any }> {
  try {
    const value = await configSchema.validateAsync(config, { abortEarly: false });
    return { value };
  } catch (error) {
    if (error instanceof Joi.ValidationError) {
      return { error, value: config };
    }
    throw error;
  }
}