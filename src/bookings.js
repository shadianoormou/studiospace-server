import { Router } from 'express';
import { bookingTimes,id } from './validation.js';
import { HttpError } from './errors.js';
import PDFDocument from 'pdfkit';
export function bookingRoutes(db, client, security) {
  const router=Router(), bookings=db.collection('bookings'), studios=db.collection('studios');
  const protect=[security.session,security.verifyToken];
  router.get('/',security.session,async(req,res)=>res.json(await bookings.find({userId:req.user.id}).sort({createdAt:-1}).toArray()));
  router.get('/host',security.session,async(req,res)=>res.json(await bookings.find({hostId:req.user.id}).sort({createdAt:-1}).toArray()));
  router.post('/',...protect,async(req,res)=> {
    const data=bookingTimes(req.body); id(data.studioId);
    const session=client.startSession(); let created;
    try { await session.withTransaction(async()=> {
      // Every booking transition writes the same studio document, serializing overlapping transactions.
      const studio=await studios.findOneAndUpdate({_id:id(data.studioId)},{$inc:{bookingVersion:1}},{session,returnDocument:'after'});
      if(!studio) throw new HttpError(404,'Studio not found.');
      if(studio.ownerId===req.user.id) throw new HttpError(400,'Choose another host’s studio to make a booking.');
      if(data.guests>studio.maxCapacity) throw new HttpError(400,`This studio accommodates up to ${studio.maxCapacity} guests.`);
      const collision=await bookings.findOne({studioId:data.studioId,status:'Confirmed',start:{$lt:data.end},end:{$gt:data.start}},{session});
      if(collision) throw new HttpError(409,'These hours are already booked. Please choose another time.');
      const subtotal=Math.round(studio.hourlyRate*data.hours*100)/100;
      created={...data,userId:req.user.id,userEmail:req.user.email,userName:req.user.name,hostId:studio.ownerId,hostEmail:studio.ownerEmail,studioTitle:studio.title,studioImage:studio.image,location:studio.location,hourlyRate:studio.hourlyRate,subtotal,securityDeposit:studio.securityDeposit,total:Math.round((subtotal+studio.securityDeposit)*100)/100,status:'Pending',createdAt:new Date()};
      const result=await bookings.insertOne(created,{session}); created._id=result.insertedId;
    }); } finally { await session.endSession(); }
    res.status(201).json(created);
  });
  router.patch('/:id/status',...protect,async(req,res)=> {
    const bookingId=id(req.params.id), status=req.body.status;
    if(!['Confirmed','Completed','Cancelled'].includes(status)) throw new HttpError(400,'Invalid booking status.');
    const session=client.startSession();
    try { await session.withTransaction(async()=> {
      const booking=await bookings.findOne({_id:bookingId},{session});
      if(!booking) throw new HttpError(404,'Booking not found.');
      const isHost=booking.hostId===req.user.id, isGuest=booking.userId===req.user.id;
      if(!isHost&&!isGuest) throw new HttpError(403,'This booking belongs to another user.');
      const canCancel=status==='Cancelled'&&booking.status==='Pending';
      const canConfirm=isHost&&status==='Confirmed'&&booking.status==='Pending';
      const canComplete=isHost&&status==='Completed'&&booking.status==='Confirmed'&&booking.end<=new Date();
      if(!canCancel&&!canConfirm&&!canComplete) throw new HttpError(409,'This status change is not available. Completed bookings must have ended.');
      await studios.updateOne({_id:id(booking.studioId)},{$inc:{bookingVersion:1}},{session});
      if(canConfirm) {
        if(booking.start<=new Date()) throw new HttpError(409,'This booking time has already passed.');
        const collision=await bookings.findOne({_id:{$ne:bookingId},studioId:booking.studioId,status:'Confirmed',start:{$lt:booking.end},end:{$gt:booking.start}},{session});
        if(collision) throw new HttpError(409,'Another confirmed booking overlaps these hours.');
      }
      await bookings.updateOne({_id:bookingId},{$set:{status,updatedAt:new Date()}},{session});
    }); } finally { await session.endSession(); }
    res.json({success:true});
  });
  router.get('/:id/invoice',security.session,async(req,res)=> {
    const booking=await bookings.findOne({_id:id(req.params.id),userId:req.user.id});
    if(!booking) throw new HttpError(404,'Booking not found.');
    if(!['Confirmed','Completed'].includes(booking.status)) throw new HttpError(409,'Invoices are available after confirmation.');
    res.type('application/pdf').setHeader('Content-Disposition',`attachment; filename="studiospace-${booking._id}.pdf"`);
    const pdf=new PDFDocument({margin:54,size:'A4'});pdf.pipe(res);
    pdf.fontSize(28).fillColor('#164b44').text('StudioSpace');pdf.fontSize(12).fillColor('#333333').text('BOOKING CONFIRMATION', {paragraphGap:18});
    for(const line of [`Reference: ${booking._id}`,`Status: ${booking.status}`,`Creator: ${booking.userName}`,`Email: ${booking.userEmail}`,`Studio: ${booking.studioTitle}`,`Location: ${booking.location}`,`From: ${booking.start.toISOString()} (UTC)`,`Until: ${booking.end.toISOString()} (UTC)`,`Hours: ${booking.hours}`,`Hourly rate: USD ${booking.hourlyRate.toFixed(2)}`,`Studio subtotal: USD ${booking.subtotal.toFixed(2)}`,`Refundable deposit: USD ${booking.securityDeposit.toFixed(2)}`,`Reservation total: USD ${booking.total.toFixed(2)}`]) pdf.moveDown(.6).fontSize(11).text(line);
    pdf.moveDown(2).fontSize(10).text('This is a reservation summary, not proof of payment. Payment and deposit return are arranged directly with the host.');pdf.end();
  });
  return router;
}
