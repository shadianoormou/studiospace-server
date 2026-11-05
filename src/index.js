import {config,validateConfig} from './config.js';
import {connectDatabase} from './db.js';
import {createApp} from './app.js';
validateConfig();
const {client,db}=await connectDatabase(config.mongoUri,config.database);
const {app}=createApp({client,db,config});
const server=app.listen(config.port,'0.0.0.0',()=>console.log(`StudioSpace API listening on http://localhost:${config.port}`));
for(const signal of ['SIGTERM','SIGINT']) process.on(signal,()=>server.close(async()=>{await client.close();process.exit(0);}));
