-- Catalogo delle esperienze Socialbooth (dal sito socialbooth.it), divise per linea.
alter table public.tipi_booth add column if not exists linea text not null default 'Photobooth Experience';
alter table public.tipi_booth add column if not exists ordine integer not null default 100;

update public.tipi_booth set nome = 'Videobooth 360', linea = 'Videobooth Experience' where nome = '360°';
update public.tipi_booth set nome = 'Social Mirror' where nome = 'Mirror booth';

insert into public.tipi_booth (nome, linea, ordine)
select v.nome, v.linea, v.ordine from (values
  ('Photobooth',            'Photobooth Experience',   10),
  ('Boutique Square',       'Photobooth Experience',   11),
  ('Social Mirror',         'Photobooth Experience',   12),
  ('Mosaic Wall',           'Photobooth Experience',   13),
  ('Social Badge AI',       'Photobooth Experience',   14),
  ('SocialBite',            'Photobooth Experience',   15),
  ('Photo Express',         'Photobooth Experience',   16),
  ('Videobooth 360',        'Videobooth Experience',   20),
  ('Videobooth 360 AI',     'Videobooth Experience',   21),
  ('Signature Cam',         'Interactive Experience',  30),
  ('Social Wall',           'Interactive Experience',  31),
  ('SocialGrab',            'Interactive Experience',  32),
  ('Social Bike',           'Interactive Experience',  33),
  ('Advergaming',           'Advergaming & Edutainment', 40),
  ('Social Room',           'Room Experience',         50),
  ('CoverMe',               'Room Experience',         51),
  ('Cabina esperienziale',  'Room Experience',         52),
  ('Cabina standard',       'Room Experience',         53)
) v(nome, linea, ordine)
where not exists (select 1 from public.tipi_booth t where t.nome = v.nome);

update public.tipi_booth t set linea = v.linea, ordine = v.ordine from (values
  ('Photobooth', 'Photobooth Experience', 10), ('Social Mirror', 'Photobooth Experience', 12),
  ('Videobooth 360', 'Videobooth Experience', 20)
) v(nome, linea, ordine) where t.nome = v.nome;
