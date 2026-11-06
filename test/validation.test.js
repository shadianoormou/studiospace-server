import test from 'node:test';
import assert from 'node:assert/strict';
import {bookingTimes,id,studioSchema} from '../src/validation.js';
test('studio validation accepts a complete listing',()=>{const studio=studioSchema.parse({title:'A bright creative studio',category:'Photo Studio',hourlyRate:50,securityDeposit:100,maxCapacity:8,location:'Dhaka, Bangladesh',image:'https://example.com/studio.jpg',gallery:[],amenities:['Wi-Fi'],overview:'A comfortable space with natural light, room to work, and a host who makes planning easy.'});assert.equal(studio.hourlyRate,50);});
test('studio validation rejects short descriptions',()=>{assert.throws(()=>studioSchema.parse({title:'Studio',category:'Photo Studio',hourlyRate:50,securityDeposit:0,maxCapacity:2,location:'Dhaka',image:'https://example.com/studio.jpg',amenities:['Wi-Fi'],overview:'Too short'}));});
test('booking validation calculates session hours',()=>{const result=bookingTimes({studioId:'507f1f77bcf86cd799439011',start:'2099-01-01T10:00:00.000Z',end:'2099-01-01T13:30:00.000Z',guests:2,note:''});assert.equal(result.hours,3.5);});
test('invalid object ids are rejected before database access',()=>{assert.throws(()=>id('not-an-object-id'));});
