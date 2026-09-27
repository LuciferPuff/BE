-- Byt badrum → vatrum (katalognamn Våtrum).
update public.property_parts
set part_key = 'vatrum'
where part_key = 'badrum';

comment on column public.property_parts.part_key is
  'Katalognyckel: tak, fasad, fonster, dranering, grund, vatrum, uppvarmning, varmvattenberedare, ventilation, el, va, skorsten, kok, altan, solceller, enskilt_avlopp, egen_brunn, avfuktare.';
