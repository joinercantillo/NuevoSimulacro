#!/usr/bin/env node
/**
 * Generates the Entity-Relationship documentation from a single source of
 * truth (`model` below). Nothing inside docs/diagrams is written by hand.
 *
 *   npm run diagrams
 *
 * Outputs:
 *   docs/diagrams/der.mmd     Conceptual DER (entities, attributes, cardinalities)
 *   docs/diagrams/mer.mmd     Physical MER (tables, columns, SQL types, PK/FK)
 *   docs/diagrams/mer.dbml    DBML to paste in https://dbdiagram.io
 *   docs/diagrams/schema.sql  PostgreSQL DDL equivalent to the TypeORM entities
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = join(projectRoot, 'docs', 'diagrams');

/** Mermaid files need `erDiagram` in the first line, so the notice uses %%. */
const MERMAID_NOTICE = [
  '%% AUTO GENERATED FILE: do not edit by hand. Regenerate with: npm run diagrams',
  '%% Source of the model: scripts/generate-diagrams.mjs',
];

const renotice = (prefix) =>
  [
    'AUTO GENERATED FILE: do not edit by hand.',
    '',
    'Regenerate it with: npm run diagrams',
    '',
    'Source of the model: scripts/generate-diagrams.mjs',
  ].map((line) => `${prefix} ${line}`.trimEnd());

const DBML_HEADER = renotice('//');
const SQL_HEADER = renotice('--');

/**
 * The model follows the ER diagram of the assignment translated to English:
 * hoteles_sedes -> hotels, habitaciones -> rooms, recepcionistas ->
 * receptionists and reservas -> reservations. The original assignment keeps
 * the users table in memory, so it does not appear here.
 */
const model = {
  enumerations: [
    { name: 'room_type_enum', values: ['SINGLE', 'DOUBLE', 'SUITE'] },
    { name: 'room_status_enum', values: ['AVAILABLE', 'OCCUPIED', 'MAINTENANCE'] },
    { name: 'reservation_status_enum', values: ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'FINISHED', 'CANCELLED'] },
  ],
  entities: [
    {
      table: 'hotels',
      concept: 'Hotel',
      comment: 'Branches of the Arenosa Hotels chain',
      columns: [
        { name: 'id', type: 'integer', concept: 'id', conceptType: 'integer', pk: true, increment: true },
        { name: 'name', type: 'varchar(100)', concept: 'name', conceptType: 'string' },
        { name: 'location', type: 'varchar(100)', concept: 'location', conceptType: 'string' },
        { name: 'address', type: 'varchar(200)', concept: 'address', conceptType: 'string' },
        { name: 'city', type: 'varchar(100)', concept: 'city', conceptType: 'string' },
        { name: 'active', type: 'boolean', concept: 'active', conceptType: 'boolean' },
        { name: 'created_at', type: 'timestamp', concept: 'createdAt', conceptType: 'datetime' },
        { name: 'updated_at', type: 'timestamp', concept: 'updatedAt', conceptType: 'datetime' },
      ],
    },
    {
      table: 'rooms',
      concept: 'Room',
      comment: 'Rooms of each branch',
      columns: [
        { name: 'id', type: 'integer', concept: 'id', conceptType: 'integer', pk: true, increment: true },
        { name: 'number', type: 'varchar(10)', concept: 'number', conceptType: 'string' },
        { name: 'room_type', type: 'varchar(20)', concept: 'roomType', conceptType: 'enum', enumRef: 'room_type_enum' },
        { name: 'capacity', type: 'integer', concept: 'capacity', conceptType: 'integer' },
        { name: 'status', type: 'varchar(20)', concept: 'status', conceptType: 'enum', enumRef: 'room_status_enum' },
        { name: 'hotel_id', type: 'integer', concept: 'hotelId', conceptType: 'integer', fk: true },
        { name: 'created_at', type: 'timestamp', concept: 'createdAt', conceptType: 'datetime' },
        { name: 'updated_at', type: 'timestamp', concept: 'updatedAt', conceptType: 'datetime' },
      ],
    },
    {
      table: 'receptionists',
      concept: 'Receptionist',
      comment: 'Receptionists referenced by the reservations',
      columns: [
        { name: 'id', type: 'integer', concept: 'id', conceptType: 'integer', pk: true, increment: true },
        { name: 'name', type: 'varchar(100)', concept: 'name', conceptType: 'string' },
        { name: 'document', type: 'varchar(20)', concept: 'document', conceptType: 'string' },
        { name: 'phone', type: 'varchar(20)', concept: 'phone', conceptType: 'string' },
        { name: 'email', type: 'varchar(100)', concept: 'email', conceptType: 'string' },
        { name: 'active', type: 'boolean', concept: 'active', conceptType: 'boolean' },
        { name: 'created_at', type: 'timestamp', concept: 'createdAt', conceptType: 'datetime' },
        { name: 'updated_at', type: 'timestamp', concept: 'updatedAt', conceptType: 'datetime' },
      ],
    },
    {
      table: 'reservations',
      concept: 'Reservation',
      comment: 'Reservation of a room by a guest, owned by one receptionist',
      columns: [
        { name: 'id', type: 'integer', concept: 'id', conceptType: 'integer', pk: true, increment: true },
        { name: 'guest', type: 'varchar(100)', concept: 'guest', conceptType: 'string' },
        { name: 'guest_document', type: 'varchar(12)', concept: 'guestDocument', conceptType: 'string' },
        { name: 'room_type', type: 'varchar(20)', concept: 'roomType', conceptType: 'enum', enumRef: 'room_type_enum' },
        { name: 'check_in', type: 'date', concept: 'checkInDate', conceptType: 'date' },
        { name: 'check_out', type: 'date', concept: 'checkOutDate', conceptType: 'date' },
        { name: 'receptionist_id', type: 'integer', concept: 'receptionistId', conceptType: 'integer', fk: true },
        { name: 'room_id', type: 'integer', concept: 'roomId', conceptType: 'integer', fk: true },
        { name: 'status', type: 'varchar(20)', concept: 'status', conceptType: 'enum', enumRef: 'reservation_status_enum' },
        { name: 'created_at', type: 'timestamp', concept: 'createdAt', conceptType: 'datetime' },
        { name: 'updated_at', type: 'timestamp', concept: 'updatedAt', conceptType: 'datetime' },
      ],
    },
  ],
  /**
   * Cardinalities: one branch has many rooms, one room hosts many
   * reservations on different dates and one receptionist is responsible for
   * many reservations.
   */
  relationships: [
    { from: 'hotels', to: 'rooms', symbol: '||--o{', label: 'has' },
    { from: 'rooms', to: 'reservations', symbol: '||--o{', label: 'hosts' },
    { from: 'receptionists', to: 'reservations', symbol: '||--o{', label: 'is responsible for' },
  ],
  foreignKeys: [
    { table: 'rooms', column: 'hotel_id', references: 'hotels', on: 'id' },
    { table: 'reservations', column: 'receptionist_id', references: 'receptionists', on: 'id' },
    { table: 'reservations', column: 'room_id', references: 'rooms', on: 'id' },
  ],
};

const findEntity = (table) => model.entities.find((entity) => entity.table === table);
const findEnum = (name) => model.enumerations.find((enumeration) => enumeration.name === name);

/** Mermaid attribute types cannot contain parentheses, spaces or pipes. */
const mermaidType = (type) => type.replace(/\(.*\)/, '').replace(/\|/g, '_');

const markersOf = (column) =>
  [column.pk ? 'PK' : '', column.fk ? 'FK' : ''].filter(Boolean).join(', ');

const buildDer = () => {
  const lines = [
    ...HEADER,
    '%% Conceptual entity-relationship diagram (DER) of the reservations model',
    'erDiagram',
  ];

  for (const enumeration of model.enumerations) {
    lines.push(`  %% ${enumeration.name}: ${enumeration.values.join(', ')}`);
  }
  lines.push('');

  for (const entity of model.entities) {
    lines.push(`  %% ${entity.comment}`);
    lines.push(`  ${entity.concept} {`);
    for (const column of entity.columns) {
      const markers = markersOf(column);
      lines.push(
        `    ${mermaidType(column.conceptType)} ${column.concept}${markers ? ` "${markers}"` : ''}`,
      );
    }
    lines.push('  }');
    lines.push('');
  }

  for (const relation of model.relationships) {
    lines.push(
      `  ${findEntity(relation.from).concept} ${relation.symbol} ${findEntity(relation.to).concept} : "${relation.label}"`,
    );
  }

  return lines.join('\n');
};

const buildMer = () => {
  const lines = [...HEADER, '%% Physical relational model (MER) of the reservations model', 'erDiagram', ''];

  for (const entity of model.entities) {
    lines.push(`  %% ${entity.comment}`);
    lines.push(`  ${entity.table} {`);
    for (const column of entity.columns) {
      const markers = markersOf(column);
      lines.push(
        `    ${mermaidType(column.type)} ${column.name}${markers ? ` "${markers}"` : ''}`,
      );
    }
    lines.push('  }');
    lines.push('');
  }

  for (const relation of model.relationships) {
    lines.push(`  ${relation.from} ${relation.symbol} ${relation.to} : "${relation.label}"`);
  }

  return lines.join('\n');
};

const buildDbml = () => {
  const lines = [...DBML_HEADER, '', '// Physical model (MER): paste it in https://dbdiagram.io', ''];

  for (const enumeration of model.enumerations) {
    lines.push(`Enum ${enumeration.name} {`);
    for (const value of enumeration.values) lines.push(`  ${value}`);
    lines.push('}');
    lines.push('');
  }

  for (const entity of model.entities) {
    lines.push(`Table ${entity.table} {`);
    for (const column of entity.columns) {
      const type = column.enumRef ?? column.type;
      const settings = column.pk
        ? ['pk', ...(column.increment ? ['increment'] : [])]
        : ['not null'];
      lines.push(`  ${column.name} ${type} [${settings.join(', ')}]`);
    }
    lines.push(`  Note: '${entity.comment}'`);
    lines.push('}');
    lines.push('');
  }

  for (const foreignKey of model.foreignKeys) {
    lines.push(
      `Ref: ${foreignKey.table}.${foreignKey.column} > ${foreignKey.references}.${foreignKey.on}`,
    );
  }

  return lines.join('\n');
};

const sqlType = (column) =>
  column.increment ? 'SERIAL' : column.type.toUpperCase();

const checkConstraint = (column) => {
  if (!column.enumRef) return '';
  const values = findEnum(column.enumRef)
    .values.map((value) => `'${value}'`)
    .join(', ');
  return ` CHECK (${column.name} IN (${values}))`;
};

const buildSchema = () => {
  const lines = [
    ...SQL_HEADER,
    '',
    '-- PostgreSQL schema equivalent to the TypeORM entities',
    '-- TypeORM creates it automatically while DB_SYNCHRONIZE=true.',
    '',
  ];

  for (const entity of model.entities) {
    lines.push(`-- ${entity.comment}`);
    lines.push(`CREATE TABLE ${entity.table} (`);

    const columns = entity.columns.map((column) => {
      const parts = [column.name, sqlType(column), column.pk ? 'PRIMARY KEY' : 'NOT NULL'];
      if (column.name === 'created_at' || column.name === 'updated_at') {
        parts.push('DEFAULT CURRENT_TIMESTAMP');
      }
      return `  ${parts.join(' ')}${checkConstraint(column)}`;
    });

    const foreignKeys = model.foreignKeys
      .filter((foreignKey) => foreignKey.table === entity.table)
      .map(
        (foreignKey) =>
          `  , CONSTRAINT fk_${foreignKey.table}_${foreignKey.column} FOREIGN KEY (${foreignKey.column}) ` +
          `REFERENCES ${foreignKey.references} (${foreignKey.on}) ON DELETE RESTRICT`,
      );

    lines.push([...columns, ...foreignKeys].join(',\n'));
    lines.push(');');
    lines.push('');
  }

  return lines.join('\n');
};

const outputs = [
  { file: 'der.mmd', content: buildDer() },
  { file: 'mer.mmd', content: buildMer() },
  { file: 'mer.dbml', content: buildDbml() },
  { file: 'schema.sql', content: buildSchema() },
];

mkdirSync(outputDir, { recursive: true });

for (const output of outputs) {
  writeFileSync(join(outputDir, output.file), `${output.content.trim()}\n`, 'utf8');
  console.log(`generated docs/diagrams/${output.file}`);
}

console.log('\nOpen der.mmd / mer.mmd in the Mermaid Live Editor (https://mermaid.live)');
console.log('or paste mer.dbml into https://dbdiagram.io to explore the model.');
