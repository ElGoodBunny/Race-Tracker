import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

// One JSON file per race in src/content/races. Static facts live here (course, date, bib),
// everything that changes on race day lives in Supabase (see supabase/migrations).

const latLng = z.tuple([z.number(), z.number()]);

const landmark = z.object({
  name: z.string(),
  idx: z.number().int().nonnegative(), // index into course.route / course.km
  label: z.string().optional(),
  mobile: z.boolean().optional(),
  anchor: z.enum(["start", "middle", "end"]).optional(),
  dx: z.number().optional(),
  dy: z.number().optional(),
});

const races = defineCollection({
  loader: glob({ pattern: "*.json", base: "./src/content/races" }),
  schema: z
    .object({
      slug: z.string(),
      title: z.string(),
      city: z.string(),
      date: z.string(), // YYYY-MM-DD, local race day
      timezone: z.string().default("Europe/Berlin"),
      status: z.enum(["upcoming", "live", "finished"]),
      distanceKm: z.number().positive(),
      turnKm: z.number().optional(),
      plannedStart: z.string(), // ISO 8601 UTC, default when Supabase has no value yet
      targetSec: z.number().int().positive(),
      bib: z.string().optional(),
      block: z.string().optional(),
      result: z.object({ netSec: z.number().int().positive() }).optional(),
      course: z.object({
        source: z.string(),
        route: z.array(latLng).min(2),
        km: z.array(z.number()).min(2), // cumulative km per route point, same length as route
        landmarks: z.array(landmark),
        waterKm: z.array(z.number()).default([]),
        bounds: z.object({ w: z.number(), e: z.number(), n: z.number(), s: z.number() }),
        features: z
          .object({
            water: z.array(z.array(latLng)).default([]),
            lakeOuter: z.array(latLng).optional(),
            canals: z.array(z.array(latLng)).default([]),
            parks: z.array(z.array(latLng)).default([]),
            landmark3d: z.record(z.string(), latLng).default({}),
          })
          .default({ water: [], canals: [], parks: [], landmark3d: {} }),
      }),
    })
    .refine((r) => r.course.route.length === r.course.km.length, {
      message: "course.route and course.km must have the same length",
    }),
});

export const collections = { races };
