
-- Expand the app_role enum with new roles
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'scrum_master';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'product_owner';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'developer';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'analyst';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'architect';
