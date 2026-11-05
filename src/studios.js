import { Router } from 'express';
import { studioSchema, id, escapeRegex } from './validation.js';
import { HttpError } from './errors.js';
export function studioRoutes(db, client, security) {
  const router = Router(), studios = db.collection('studios');
  const protect = [security.session, security.verifyToken];
  router.get('/', async (req, res) => {
    const filter = {};
    if (req.query.category) filter.category = String(req.query.category);
    if (req.query.q) { const query = escapeRegex(String(req.query.q).slice(0,100)); filter.$or = [{ title: { $regex: query, $options:'i' } }, { location: { $regex:query, $options:'i' } }]; }
    if (req.query.maxPrice && Number(req.query.maxPrice) > 0) filter.hourlyRate = { $lte: Number(req.query.maxPrice) };
    const sort = { newest:{createdAt:-1}, priceAsc:{hourlyRate:1}, priceDesc:{hourlyRate:-1}, rating:{rating:-1,createdAt:-1} }[req.query.sort] || {createdAt:-1};
    const page = Math.max(1, Math.min(1000, Number(req.query.page) || 1));
    const limit = req.query.featured === 'true' ? 6 : 12;
    const [items,total] = await Promise.all([studios.find(filter).sort(sort).skip((page-1)*limit).limit(limit).toArray(), studios.countDocuments(filter)]);
    res.json({items,total,page,pages:Math.ceil(total/limit)});
  });
  router.get('/mine', security.session, async (req,res) => res.json(await studios.find({ownerEmail:req.user.email}).sort({createdAt:-1}).toArray()));
  router.get('/:id', async (req,res) => {
    const studio = await studios.findOne({_id:id(req.params.id)});
    if (!studio) throw new HttpError(404,'This studio could not be found.');
    const [reviews,availability] = await Promise.all([
      db.collection('reviews').find({studioId:req.params.id}).sort({createdAt:-1}).limit(30).toArray(),
      db.collection('bookings').find({studioId:req.params.id,status:'Confirmed',end:{$gt:new Date()}},{projection:{start:1,end:1,_id:0}}).sort({start:1}).toArray()
    ]);
    res.json({...studio,reviews,availability});
  });
  router.post('/', ...protect, async(req,res)=> {
    const data=studioSchema.parse(req.body);
    const result=await studios.insertOne({...data,ownerEmail:req.user.email,ownerId:req.user.id,ownerName:req.user.name,ownerImage:req.user.image || '',rating:0,reviewCount:0,bookingVersion:0,createdAt:new Date(),updatedAt:new Date()});
    res.status(201).json({_id:result.insertedId});
  });
  router.patch('/:id', ...protect, async(req,res)=> {
    const data=studioSchema.parse(req.body);
    const result=await studios.updateOne({_id:id(req.params.id),ownerEmail:req.user.email},{$set:{...data,updatedAt:new Date()}});
    if(!result.matchedCount) throw new HttpError(403,'You can only update your own studio.');
    res.json({success:true});
  });
  router.delete('/:id', ...protect, async(req,res)=> {
    const studioId=id(req.params.id), session=client.startSession();
    try { await session.withTransaction(async()=> {
      const owned=await studios.findOne({_id:studioId,ownerEmail:req.user.email},{session});
      if(!owned) throw new HttpError(403,'You can only delete your own studio.');
      await studios.updateOne({_id:studioId},{$inc:{bookingVersion:1}},{session});
      const active=await db.collection('bookings').findOne({studioId:req.params.id,status:'Confirmed',end:{$gt:new Date()}},{session});
      if(active) throw new HttpError(409,'This studio has confirmed upcoming bookings. Complete them before deleting.');
      await db.collection('bookings').updateMany({studioId:req.params.id,status:'Pending'},{$set:{status:'Cancelled',updatedAt:new Date()}},{session});
      await studios.deleteOne({_id:studioId},{session});
      await db.collection('wishlist').deleteMany({studioId:req.params.id},{session});
    }); } finally { await session.endSession(); }
    res.json({success:true});
  });
  return router;
}
