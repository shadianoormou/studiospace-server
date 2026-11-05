import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { toNodeHandler } from 'better-auth/node';
import { createAuthentication } from './auth.js';
import { studioRoutes } from './studios.js';
import { bookingRoutes } from './bookings.js';
import { extraRoutes } from './extras.js';
import { errorHandler } from './errors.js';
export function createApp({db,client,config}) {
 const app=express();app.disable('x-powered-by');app.set('trust proxy',1);
 app.use(helmet());app.use(cors({origin:config.origin,credentials:true}));
 if(process.env.NODE_ENV!=='test') app.use('/api',rateLimit({windowMs:60000,limit:200,standardHeaders:'draft-8',legacyHeaders:false}));
 const security=createAuthentication(db,client,config);
 app.all('/api/auth/{*splat}',toNodeHandler(security.auth));
 app.use(express.json({limit:'64kb'}));app.use(cookieParser());app.use('/api',security.checkOrigin);
 app.get('/api/health',async(req,res)=>{await db.command({ping:1});res.json({status:'ok',service:'StudioSpace API'});});
 app.get('/api/config',(req,res)=>res.json({googleEnabled:security.googleEnabled,uploadEnabled:Boolean(process.env.IMGBB_API_KEY)}));
 app.post('/api/token',security.session,security.issueToken);
 app.use('/api/studios',studioRoutes(db,client,security));
 app.use('/api/bookings',bookingRoutes(db,client,security));
 app.use('/api',extraRoutes(db,security));
 app.use((req,res)=>res.status(404).json({message:'API route not found.'}));app.use(errorHandler);
 return {app,auth:security.auth};
}
