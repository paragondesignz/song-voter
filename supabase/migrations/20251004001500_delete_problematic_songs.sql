-- Delete the specific songs that are causing 400 errors
-- These songs have data that PostgREST can't serialize

DELETE FROM song_suggestions
WHERE id IN (
  '1d12bc58-5690-486b-acb4-e0d9c8e97f51',
  '9a81800e-b545-45db-a8c8-e3777f87023b'
);
