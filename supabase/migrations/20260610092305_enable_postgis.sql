-- Migration: enable PostGIS extension
-- Required for geography types and spatial functions used by geo-matching.

create extension if not exists postgis;
