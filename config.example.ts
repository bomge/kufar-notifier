import type { IConfig } from "./src/core/interfaces/IConfig";

export const config: IConfig = {
  "database": {
    "connection": "db.json",
    "type": "file"
  },
  "defaultCheckInterval": "10",
  "defaultImgCount": 3,
  "logger": {
    "level": "debug",
    "remoteUrl": "TOKEN"
  },
  "telegram": {
    "defaultChatId": "XXXXXXX",
    "errorChatId": "XXXXXXX",
    "botToken": "1111111:XXXXXXXXXXX"
  },
  "sites": {
    "kufar": {
      "enabled": true,
      "urls": [
        {
          "prefix": "kufar",
          "enabled": 1,
          "type": "re",
          "url": "https://cre-api-v2.kufar.by/items-search/v1/engine/v1/search/rendered-paginated?XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
          "checkInterval": "1-3",
          "onlyWithPhoto": true,
          "imgСount": 5
        }
      ]
    }
  },
  "server": {
    "enabled": 1,
    "port": 3000
  },
  "queues": {
    "default": {
      "concurrency": 2,
      "interval": 10,
      "maxPerInterval": 5
    },
    "kufar": {
      "concurrency": 2,
      "interval": 5,
      "maxPerInterval": 5
    },
    "telegram": {
      "concurrency": 2,
      "interval": 10,
      "maxPerInterval": 5
    }
  }
};