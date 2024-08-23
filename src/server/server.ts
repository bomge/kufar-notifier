import express from 'express';
import http from 'node:http';
import cors from 'cors';
import type { IConfig } from '../core/interfaces/IConfig';
import type { Scheduler } from '../common/Scheduler';
import type { ILogger } from '../core/interfaces/ILogger';
import { compareObjects, saveConfig } from '../utils/util';
import { validateConfig } from './validation/config.joi.schema';
require('express-async-errors');

export function createServer(config: IConfig, scheduler: Scheduler<any, any, any>, logger: ILogger) {
  const app = express();
  const server = http.createServer(app);
  const serverLogger = logger.child({ name: 'Server' });
  app.use(cors());
  app.use(express.json());

  app.get('/api/config', (req, res) => {
    // serverLogger.info('GET /api/config');
    res.json(config);
  });

  app.post('/api/config', async (req, res) => {
    serverLogger.info('POST /api/config',{req});

    const { error, value } = await validateConfig(req.body);//todo validation as middleware
    
    if (error) {
      serverLogger.warn('Invalid config received', { error: error.details, body:req.body });
      return res.status(400).json({ 
        message: 'Invalid configuration', 
        errors: error.details.map(detail => detail.message) 
      });
    }

    const newConfig = req.body as IConfig;
	const oldConfig = { ...config };
	const diff = compareObjects(oldConfig, newConfig);

    Object.assign(config, newConfig);
    saveConfig(config);
    scheduler.updateConfig(config);

    serverLogger.info('Config updated successfully', {
		oldConfig,
		newConfig,
		diff
	  });
    res.json({ message: 'Config updated successfully' });
  });

 //not found
 app.use((req, res, next) => {
    res.status(404).json({ message: 'Not Found' });
  });

  //errror handler
  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.log(err)
	serverLogger.error('Unexpected error', { error: err },err);
    res.status(500).json({ message: 'Internal Server Error' });
  });

  return {
    start: () => {
      server.listen(config.server.port, () => {
        serverLogger.info(`Server is running on port http://localhost:${config.server.port}/`);
      });
    },
    stop: () => {
      return new Promise<void>((resolve) => {
        server.close(() => {
          serverLogger.info('Server stopped');
          resolve();
        });
      });
    },
  };
}

