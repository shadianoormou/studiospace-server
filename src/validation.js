import { z } from 'zod';
import { ObjectId } from 'mongodb';
import { HttpError } from './errors.js';
export const categories = ['Photo Studio', 'Film Stage', 'Podcast Lounge', 'Music Suite', 'Workshop'];
export const imageUrl = z.url().max(2000).refine(s => /^https?:\/\//i.test(s), 'Use an HTTP or HTTPS image URL.');
export const studioSchema = z.object({
  title: z.string().trim().min(5).max(100), category: z.enum(categories),
  hourlyRate: z.number().min(1).max(10000), securityDeposit: z.number().min(0).max(100000),
  maxCapacity: z.number().int().min(1).max(1000), location: z.string().trim().min(3).max(200),
  image: imageUrl, gallery: z.array(imageUrl).max(8).default([]),
  amenities: z.array(z.string().trim().min(1).max(60)).min(1).max(25),
  overview: z.string().trim().min(40).max(5000),
});
export function id(value) { if (!ObjectId.isValid(value) || String(value).length !== 24) throw new HttpError(400, 'Invalid item ID.'); return new ObjectId(value); }
export const escapeRegex = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export function bookingTimes(body) {
  const data = z.object({ studioId: z.string(), start: z.iso.datetime(), end: z.iso.datetime(), guests: z.number().int().min(1).max(1000), note: z.string().max(500).default('') }).parse(body);
  const start = new Date(data.start), end = new Date(data.end);
  const hours = (end - start) / 3600000;
  if (start <= new Date()) throw new HttpError(400, 'Choose a future booking time.');
  if (hours < 1 || hours > 24) throw new HttpError(400, 'Book between 1 and 24 hours.');
  return { ...data, start, end, hours };
}
