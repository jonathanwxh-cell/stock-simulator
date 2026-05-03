drop policy if exists game_saves_delete_own on public.game_saves;
create policy game_saves_delete_own on public.game_saves
for delete
to authenticated
using ((select auth.uid()) = user_id);
