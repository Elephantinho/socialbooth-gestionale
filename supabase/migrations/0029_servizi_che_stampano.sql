-- Non tutti i servizi stampano (il Videobooth 360 fa video): la carta si prevede solo per quelli che stampano.
alter table public.tipi_booth add column if not exists stampa boolean not null default true;
update public.tipi_booth set stampa = false
 where linea in ('Videobooth Experience', 'Interactive Experience', 'Advergaming & Edutainment');

create or replace function public.carta_prevista()
returns trigger language plpgsql security definer set search_path = public
as $$
declare media numeric := public.media_stampe_per_evento();
begin
  if media is not null and media > 0
     and coalesce((select stampa from public.tipi_booth where id = new.tipo_booth_id), true) then
    insert into public.costi_evento (evento_id, fase, categoria, quantita, costo_unitario, descrizione, pagato_con, stato)
    values (new.id, 'previsto', 'carta_stampe', media, 0, 'Carta stimata (media)', 'azienda', 'approvato');
  end if;
  return null;
end $$;
