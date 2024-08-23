import { v4 as uuidv4 } from 'uuid'; 
const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error('API_URL is not defined in environment variables');
}

export interface IConfig {
	telegram: {
	  botToken: string;
	  defaultChatId: string;
	  errorChatId: string;
	};
	database: {
	  type: 'file' | 'mongo' | 'sql';
	  connection: string;
	};
	logger: {
	  filePath?: string;
	  remoteUrl?: string;
	  level: 'info' | 'error' | 'warn' | 'debug';
	};
	server: {
	  enabled: boolean;
	  port: number;
	};
	defaultCheckInterval: string;
	defaultImgCount: number;
	sites: {
	  [siteName: string]: {
		enabled: boolean;
		urls: Array<{
			id:string
		  url: string;
		  enabled: boolean;
		  checkInterval?: string;
		  prefix: string;
		  imgCount?: number;
		  onlyWithPhoto?: boolean;
		  type: 're' | 'car' | 'other' | 'phone';
		  tgId?: string;
		}>;
	  };
	};
	queues: {
	  [key: string]: {
		concurrency: number;
		interval: number;
		maxPerInterval: number;
	  };
	};
  }

export const fetchConfig = async (): Promise<IConfig> => {
  const response = await fetch(`${API_URL}/config`);
  if (!response.ok) {
    throw new Error('Failed to fetch config');
  }
  const config: IConfig = await response.json();

  // Add random ID to each URL
  // biome-ignore lint/complexity/noForEach: <explanation>
    Object.keys(config.sites).forEach(siteName => {
    config.sites[siteName].urls = config.sites[siteName].urls.map(url => ({
      ...url,
      id: uuidv4() // Generate a random UUID
    }));
  });

  return config;
};

export const updateConfig = async (newConfig: IConfig): Promise<{ message: string; changes: any }> => {
	// Create a deep copy of the newConfig object
	const configToSend = JSON.parse(JSON.stringify(newConfig));
  
	// Remove id fields from URLs
	// biome-ignore lint/complexity/noForEach: <explanation>
  		Object.keys(configToSend.sites).forEach(siteName => {
			//@ts-ignore
	  configToSend.sites[siteName].urls = configToSend.sites[siteName].urls.map(({ id, ...rest }) => rest);
	});
  
	const response = await fetch(`${API_URL}/config`, {
	  method: 'POST',
	  headers: {
		'Content-Type': 'application/json',
	  },
	  body: JSON.stringify(configToSend),
	});
	
	if (!response.ok) {
	  throw (await response.json());
	}
  
	return response.json();
  };