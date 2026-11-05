import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { id } from './validation.js';
import { HttpError } from './errors.js';
export function extraRoutes(db,security) {
 const router=Router(),protect=[security.session,security.verifyToken];
 router.get('/wishlist',security.session,async(req,res)=>{
   const saved=await db.collection('wishlist').find({userId:req.user.id}).toArray();
   res.json(await db.collection('studios').find({_id:{$in:saved.map(x=>id(x.studioId))}}).toArray());
 });
 router.post('/wishlist/:id',...protect,async(req,res)=>{
   if(!await db.collection('studios').findOne({_id:id(req.params.id)})) throw new HttpError(404,'Studio not found.');
   await db.collection('wishlist').updateOne({userId:req.user.id,studioId:req.params.id},{$setOnInsert:{createdAt:new Date()}},{upsert:true});res.json({success:true});
 });
 router.delete('/wishlist/:id',...protect,async(req,res)=>{id(req.params.id);await db.collection('wishlist').deleteOne({userId:req.user.id,studioId:req.params.id});res.json({success:true});});
 const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:5*1024*1024,files:1}});
 router.post('/upload',...protect,upload.single('image'),async(req,res)=>{
   if(!process.env.IMGBB_API_KEY) throw new HttpError(503,'Image uploads are being configured. You can use an image URL for now.');
   const file=req.file;
   if(!file) throw new HttpError(400,'Choose an image to upload.');
   const bytes=file.buffer;
   const valid=(bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff)||(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))||(bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP');
   if(!valid) throw new HttpError(400,'Upload a JPG, PNG, or WebP image.');
   const form=new FormData();form.set('key',process.env.IMGBB_API_KEY);form.set('image',bytes.toString('base64'));
   const response=await fetch('https://api.imgbb.com/1/upload',{method:'POST',body:form,signal:AbortSignal.timeout(30000)});
   const data=await response.json();
   if(!response.ok||!data.success) throw new HttpError(502,'Image upload failed. Please try again.');
   res.json({url:data.data.url});
 });
 router.post('/newsletter',async(req,res)=>{
   const email=z.email().max(254).parse(req.body.email).toLowerCase();
   await db.collection('newsletter').updateOne({email},{$setOnInsert:{createdAt:new Date()}},{upsert:true});res.json({success:true});
 });
 router.post('/reviews/:id',...protect,async(req,res)=>{
   const studioId=req.params.id;id(studioId);
   const data=z.object({rating:z.number().int().min(1).max(5),comment:z.string().trim().min(10).max(1000)}).parse(req.body);
   if(!await db.collection('bookings').findOne({studioId,userId:req.user.id,status:'Completed'})) throw new HttpError(403,'You can review a studio after completing a booking.');
   await db.collection('reviews').updateOne({studioId,userId:req.user.id},{$set:{...data,name:req.user.name,image:req.user.image||'',createdAt:new Date()}},{upsert:true});
   const [summary]=await db.collection('reviews').aggregate([{$match:{studioId}},{$group:{_id:null,rating:{$avg:'$rating'},count:{$sum:1}}}]).toArray();
   await db.collection('studios').updateOne({_id:id(studioId)},{$set:{rating:Math.round(summary.rating*10)/10,reviewCount:summary.count}});
   res.json({success:true});
 });
 return router;
}
