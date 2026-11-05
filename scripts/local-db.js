import {MongoMemoryReplSet} from 'mongodb-memory-server';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
await mkdir('.data/mongo',{recursive:true});
const repl=await MongoMemoryReplSet.create({binary:{version:'7.0.24'},replSet:{name:'rs0',count:1,storageEngine:'wiredTiger'},instanceOpts:[{port:27017,dbPath:resolve('.data/mongo')}]});
await writeFile('.data/mongo-uri',repl.getUri());
console.log('Local MongoDB replica set ready on port 27017. Data persists under .data/mongo.');
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await repl.stop({doCleanup:false});process.exit(0);});
