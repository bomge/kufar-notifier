import type { IConfig } from "./src/core/interfaces/IConfig";

export const config: IConfig = {
	database:{
		connection:"db.json",
		type:"file"
	},
	defaultCheckInterval: '10',
	defaultImgCount:3,
	logger:{
		level:"info",
		remoteUrl:''
	},
	telegram:{
		defaultChatId:'',
		errorChatId:'',
		botToken:''
	},
	sites:{
		"kufar":{
			enabled: true,
			urls:[
				{
				prefix:'kufar',
				enabled: true,
				type:'re',
				url:'https://cre-api-v2.kufar.by/items-search/v1/engine/v1/search/rendered-paginated?cat=1010&cur=USD&gbx=b%3A30.8846027576159%2C52.36693948847798%2C31.048711033983103%2C52.5100353009864&gtsy=country-belarus~province-gomelskaja_oblast~locality-gomel&lang=ru&rnt=1&size=30&typ=let',
				checkInterval:'1-3',
				onlyWithPhoto:true,
				imgСount:5
			},
			{
				prefix:'kufar комната',
				enabled: 1,
				type:"re",
				url:'https://cre-api-v2.kufar.by/items-search/v1/engine/v1/search/rendered-paginated?cat=1040&cur=BYR&gtsy=country-belarus~province-gomelskaja_oblast~locality-gomel&lang=ru&rnl=3&size=30&typ=let',
				checkInterval:'5-10',
				onlyWithPhoto:true,
				imgСount:5
			}
		]
		}
	}
}