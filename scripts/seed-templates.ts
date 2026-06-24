/**
 * Seed the default agreement templates (verbatim legal bodies + placeholders).
 *   npm run seed:templates
 * Upserts by slug — safe to re-run. Editing a template in the admin panel later
 * overrides these; this only (re)creates any that are missing/changed.
 */
import './ws-polyfill';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }
const sb = createClient(url, key, { auth: { persistSession: false } });

const splitMasterBody = `## {{empresa}}

# ACUERDO DE COMPOSICIÓN (SPLITSHEET) Y CESIÓN DE DERECHOS SOBRE LA GRABACIÓN

**Titulo de la canción:** {{titulo}}
**Artista:** {{artista}}
**Productor:** {{productor}}
**Fecha:** {{fecha}}
**ISRC:** {{isrc}}

## ACUERDO DE DERECHOS

El presente Acuerdo de Composición ("Acuerdo") entra en vigor el {{fecha}} entre las partes firmantes. Mediante la presente, todas las partes reconocen y aceptan sus respectivas contribuciones creativas a la composición musical titulada "{{titulo}}" y acuerdan la siguiente división de derechos de autor y participación editorial relacionados exclusivamente a esta versión de la obra.

## División de Derechos de Coautores

{{TABLA}}

## Reconocimiento de Participaciones

Las partes reconocen que los porcentajes establecidos en este Acuerdo representan la totalidad de las participaciones autorales de la composición y no podrán ser modificados sin el consentimiento escrito de todos los compositores afectados.

## TITULARIDAD DE LA GRABACIÓN MAESTRA

Las partes acuerdan que cualquier grabación sonora realizada basada en la composición objeto del presente acuerdo (la "Grabación Maestra") será propiedad exclusiva y perpetua de {{empresa}}. En virtud de este acuerdo, {{empresa}} será el único titular de todos los derechos, títulos e intereses sobre la Grabación Maestra, incluyendo, pero no limitado a, los derechos de reproducción, distribución, comunicación pública, sincronización, ejecución pública y cualquier forma de explotación presente o futura.

Ninguna de las otras partes del presente acuerdo tendrá derecho a explotar, licenciar o utilizar la Grabación Maestra sin la autorización expresa y por escrito de {{empresa}}.

## Cesión de Derechos

Cada productor o colaborador que participe en la creación de la Grabación Maestra reconoce que sus servicios han sido prestados como "work made for hire" en la máxima medida permitida por la ley. En la medida en que cualquier derecho pudiera surgir a su favor, dichos derechos son cedidos irrevocablemente a {{empresa}} de forma perpetua, exclusiva, mundial y libre de reclamaciones futuras.

Esta disposición no afecta los derechos correspondientes sobre la composición musical (publishing), los cuales se regirán por las cláusulas anteriores del presente contrato.

## Registro y Administración

Las partes autorizan a {{empresa}} y/o sus representantes designados a registrar la composición y la Grabación Maestra ante cualquier entidad de derechos de autor, organización de gestión colectiva, oficina de copyright, plataforma digital o entidad de administración de regalías, utilizando los porcentajes establecidos en el presente acuerdo.

## Representaciones y Garantías

Los compositores declaran y garantizan que la composición es original, que no infringe derechos de terceros bajo las leyes de derechos de autor de los Estados Unidos de América y que poseen los derechos y la autoridad necesarios para otorgar los derechos establecidos en este acuerdo.

## Ley Aplicable

Este Acuerdo se regirá e interpretará de conformidad con las leyes del Estado Libre Asociado de Puerto Rico y las leyes federales de los Estados Unidos de América.

## Resolución de Disputas

Cualquier controversia relacionada con la autoría, porcentajes de participación o interpretación de este Acuerdo será resuelta mediante negociación de buena fe entre las partes y, de no lograrse un acuerdo, será sometida a la jurisdicción de los tribunales competentes de Puerto Rico.

Al firmar este Acuerdo, los compositores declaran que han leído, comprendido y aceptado todos los términos y condiciones establecidos en el mismo.

## Información y firma de los compositores:

{{FIRMAS}}`;

const splitCompositionBody = `# SPLIT SHEET DE COMPOSICIÓN

**Fecha:** {{fecha}}
**Titulo:** {{titulo}}
**Artista:** {{artista}}
**Productor:** {{productor}}
**Sello:** {{sello}}
**ISRC:** {{isrc}}

## COAUTORES

Cada persona identificada en el Anexo A será referida individualmente como "Autor" y, en conjunto, como los "Autores".

Este Acuerdo de División de Participaciones de Composición ("Acuerdo") confirma que los Autores colaboraron en la creación de la música y/o letra de la composición musical identificada en este Acuerdo ("Composición"), con la intención de que sea considerada una obra conjunta bajo la Ley de Derechos de Autor de los Estados Unidos.

Los Autores acuerdan irrevocablemente que la Composición será propiedad de los Autores y/o de sus respectivos editores musicales o representantes designados, conforme a los porcentajes establecidos en el Anexo A ("Porcentajes de Titularidad"), el cual forma parte integral de este Acuerdo.

En consideración de lo anterior, los Autores acuerdan lo siguiente:

## 1. Administración

Cada Autor tendrá derecho a administrar únicamente su propio Porcentaje de Titularidad en la Composición.

Ningún Autor podrá otorgar licencias exclusivas sobre la Composición completa, ni autorizar cambios sustanciales en la letra, melodía o armonía, sin el consentimiento de los demás Autores.

Cada Autor podrá licenciar, transferir, vender o ceder únicamente su propia participación en la Composición. Cualquier licencia o acuerdo con terceros deberá respetar los Porcentajes de Titularidad de todos los Autores y, cuando sea posible, instruir el pago directo a cada Autor o a su editor musical designado.

## 2. Derechos e ingresos

Cada Autor tendrá derecho a explotar, administrar, recibir y cobrar únicamente los ingresos correspondientes a su Porcentaje de Titularidad en la Composición.

Estos derechos incluyen, sin limitación, derechos de autor, regalías, ingresos editoriales, renovaciones, extensiones y cualquier otra suma generada por la Composición que corresponda a la participación de dicho Autor.

## 3. Originalidad

Cada Autor declara y garantiza que su contribución a la Composición es original y que no infringe derechos de terceros, incluyendo derechos de autor, contratos, privacidad, samples, grabaciones, letras, melodías, composiciones o cualquier otro derecho protegido.

Cada Autor será responsable por cualquier reclamación relacionada con la parte que haya aportado a la Composición.

## 4. Samples, interpolaciones y material de terceros

Si un Autor incorpora o aporta un sample, interpolación, melodía, letra, grabación o cualquier material de terceros, dicho Autor será responsable de obtener las autorizaciones necesarias.

Cualquier reducción de participación requerida para compensar al dueño de dicho material afectará únicamente la participación del Autor que lo incorporó, salvo que todos los Autores acuerden otra cosa por escrito.

Los Porcentajes de Titularidad de los demás Autores no serán reducidos por material que no hayan incorporado o aprobado.

## 5. Autoridad e indemnización

Cada Autor declara que tiene pleno derecho, poder y autoridad para firmar este Acuerdo, y que su participación está libre de reclamaciones, gravámenes, obligaciones o conflictos con terceros.

Cada Autor acuerda indemnizar y proteger a los demás Autores contra cualquier reclamación, daño, pérdida, costo, gasto, responsabilidad u honorario legal que surja por el incumplimiento de sus declaraciones, garantías u obligaciones bajo este Acuerdo.

## 6. Ley aplicable y jurisdicción

Este Acuerdo se regirá e interpretará conforme a las leyes del Estado Libre Asociado de Puerto Rico.

Cualquier disputa relacionada con este Acuerdo será sometida a la jurisdicción de los tribunales estatales o federales ubicados en Puerto Rico, Estados Unidos, salvo que las partes acuerden otra cosa por escrito.

## 7. Firma electrónica y contrapartes

Este Acuerdo podrá firmarse electrónicamente y en varias contrapartes. Todas las firmas y copias firmadas tendrán la misma validez que un original y, en conjunto, constituirán un solo acuerdo.

## 8. Asesoría legal independiente

Cada Autor reconoce que tuvo la oportunidad de consultar con un abogado independiente antes de firmar este Acuerdo, y que firma libre y voluntariamente, con o sin dicha asesoría.

## 9. Compensación total

Los Autores reconocen que los Porcentajes de Titularidad, pagos y beneficios establecidos en este Acuerdo representan la compensación total por sus contribuciones, servicios y derechos otorgados en relación con la Composición, salvo que exista otro acuerdo escrito firmado por las partes.

## COMPOSITORES

{{TABLA}}

## FIRMAS

{{FIRMAS}}`;

const distributionBody = `## {{empresa}}

# ACUERDO DE DISTRIBUCIÓN MUSICAL

**Artista:** {{artista}}
**Fecha de entrada en vigor:** {{fecha}}

El presente Acuerdo de Distribución ("Acuerdo") se celebra entre {{empresa}} ("el Distribuidor") y {{artista}} ("el Titular"), con fecha de entrada en vigor {{fecha}}.

## 1. Objeto

El Titular encarga al Distribuidor la distribución digital de {{lanzamiento}} en las plataformas de streaming y descarga aplicables.

## 2. Territorio

La distribución se realizará en el siguiente territorio: {{territorio}}.

## 3. Vigencia

El presente Acuerdo permanecerá vigente por {{vigencia}}, renovable por acuerdo escrito de las partes.

## 4. Regalías y Comisión

El Distribuidor retendrá una comisión del {{comision}} sobre los ingresos netos recaudados y abonará al Titular el porcentaje restante, conforme a los reportes de las plataformas.

## 5. Titularidad de Derechos

El Titular conserva la propiedad de sus grabaciones (masters) y de su composición, y otorga al Distribuidor una licencia para distribuir las obras durante la vigencia.

## 6. Declaraciones del Titular

El Titular declara y garantiza ser el legítimo titular o tener autorización sobre los derechos de las obras entregadas, y mantendrá indemne al Distribuidor frente a reclamaciones de terceros.

## 7. Ley Aplicable

Este Acuerdo se regirá conforme a las leyes del Estado Libre Asociado de Puerto Rico y las leyes federales de los Estados Unidos de América.

## Firmas

{{FIRMAS}}`;

const templates = [
  {
    slug: 'split-master',
    name: 'Split Sheet + Cesión de Grabación',
    category: 'split_sheet',
    description: 'Composición (splitsheet) + cesión de derechos sobre la grabación maestra (work-made-for-hire).',
    sort_order: 1,
    body: splitMasterBody,
    fields: [
      { key: 'empresa', label: 'Empresa / Sello', default: 'X7 MUSIC GROUP, INC.' },
      { key: 'titulo', label: 'Título de la canción' },
      { key: 'artista', label: 'Artista' },
      { key: 'productor', label: 'Productor' },
      { key: 'fecha', label: 'Fecha' },
      { key: 'isrc', label: 'ISRC' },
    ],
  },
  {
    slug: 'split-composition',
    name: 'Split Sheet de Composición (9 cláusulas)',
    category: 'split_sheet',
    description: 'Acuerdo de coautores con las 9 cláusulas estándar + tabla de compositores y firmas.',
    sort_order: 2,
    body: splitCompositionBody,
    fields: [
      { key: 'fecha', label: 'Fecha' },
      { key: 'titulo', label: 'Título' },
      { key: 'artista', label: 'Artista' },
      { key: 'productor', label: 'Productor' },
      { key: 'sello', label: 'Sello' },
      { key: 'isrc', label: 'ISRC' },
    ],
  },
  {
    slug: 'distribution',
    name: 'Acuerdo de Distribución',
    category: 'distribution_agreement',
    description: 'Acuerdo de distribución musical editable.',
    sort_order: 3,
    body: distributionBody,
    fields: [
      { key: 'empresa', label: 'Empresa / Distribuidor', default: 'X7 MUSIC GROUP, INC.' },
      { key: 'artista', label: 'Artista (Titular)' },
      { key: 'fecha', label: 'Fecha de entrada en vigor' },
      { key: 'lanzamiento', label: 'Lanzamiento / Catálogo' },
      { key: 'territorio', label: 'Territorio', default: 'Mundial (Worldwide)' },
      { key: 'vigencia', label: 'Vigencia', default: '2 años renovables' },
      { key: 'comision', label: 'Comisión', default: '15%' },
    ],
  },
];

async function run() {
  for (const t of templates) {
    const { error } = await sb.from('agreement_templates').upsert(t, { onConflict: 'slug' });
    if (error) { console.error(`✖ ${t.slug}: ${error.message}`); continue; }
    console.log(`✓ template ${t.slug} (${t.body.length} chars)`);
  }
  console.log('\n✅ Templates seeded.');
}
run().catch((e) => { console.error(e); process.exit(1); });
