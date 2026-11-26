-- S16 (D-46): the player takes 360p, 480p, 720p and 1080p.
-- 360p and 480p stay required. 720p and 1080p are optional per version; the
-- phone steps down to the best lower quality when one is missing.

alter table public.video_versions
  add column url_720 text check (url_720 is null or url_720 ~ '^https://\S+$'),
  add column url_1080 text check (url_1080 is null or url_1080 ~ '^https://\S+$');
