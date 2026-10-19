// Generic factory for the "owned by a user" resources
// (Product, Ride, Skill, Roommate, LostItem). Each returns document-like
// objects with .save()/.deleteOne() so existing controllers keep working.
const { sql } = require("../config/db");
const { mapPopulatedUser } = require("./_helpers");

// camel <-> snake helpers for a fixed column map
function buildModel(config) {
  const {
    table,
    ownerColumn,        // e.g. "seller" or "user" or "driver"
    ownerProp,          // camelCase prop name on the doc, e.g. "seller"
    columns,            // [{ col: "is_sold", prop: "isSold", json: false }]
    defaultSort,        // e.g. 'created_at DESC'
    activeWhere,        // raw SQL condition to hide sold/closed/expired rows from public listings
    expireWhere,        // raw SQL condition (rows matching this get hard-deleted by the cleanup job)
  } = config;

  const colByProp = Object.fromEntries(columns.map((c) => [c.prop, c]));

  // Props that hold real numbers (NUMERIC/INT columns the pg driver returns as
  // strings). Only these get coerced — NOT phone numbers or codes, which must
  // keep their exact string form (leading zeros, etc.).
  const NUMERIC_PROPS = new Set([
    "rating", "numReviews", "price", "budget", "seats",
    "originLat", "originLng", "destinationLat", "destinationLng", "distanceKm", "durationMins",
  ]);

  // Convert a DB row into a doc object (with instance methods + populated owner)
  function makeDoc(row, ownerRow) {
    const doc = { _id: row.id, createdAt: row.created_at, updatedAt: row.updated_at };
    for (const c of columns) {
      let v = row[c.col];
      // JSON/array columns (JSONB) may come back as a raw string depending on
      // the driver. Always hand the frontend a real array/object, never a string
      // or null (otherwise .map()/.length crash the page -> white screen).
      if (c.json) {
        if (typeof v === "string") {
          try { v = JSON.parse(v); } catch { v = c.array ? [] : null; }
        }
        if (v == null) v = c.array ? [] : null;
      } else if (NUMERIC_PROPS.has(c.prop) && typeof v === "string" && v !== "") {
        // NUMERIC columns (e.g. rating) come back as strings from the driver.
        // Coerce to a real number so .toFixed() etc. work on the frontend.
        const n = Number(v);
        if (!isNaN(n)) v = n;
      }
      doc[c.prop] = v;
    }
    // owner: either a populated object or a raw id string with .toString()
    if (ownerRow && ownerRow.id) {
      doc[ownerProp] = mapPopulatedUser({ u_id: ownerRow.id, u_name: ownerRow.name, u_email: ownerRow.email });
    } else {
      const ownerId = row[ownerColumn];
      // string already has toString(); controllers do owner.toString() / owner._id
      doc[ownerProp] = ownerId;
    }

    doc.save = async function () {
      const setProps = columns.map((c) => c.prop);
      const assignments = [];
      const values = [];
      let i = 1;
      for (const c of columns) {
        let v = this[c.prop];
        if (c.json) v = JSON.stringify(v ?? (c.array ? [] : null));
        assignments.push(`${quoteCol(c.col)} = $${i++}`);
        values.push(v);
      }
      assignments.push(`updated_at = NOW()`);
      values.push(this._id);
      const q = `UPDATE ${table} SET ${assignments.join(", ")} WHERE id = $${i} RETURNING *`;
      const rows = await sql.query(q, values);
      Object.assign(this, makeDoc(rows[0]));
      return this;
    };

    doc.deleteOne = async function () {
      await sql`DELETE FROM ${sql.unsafe(table)} WHERE id = ${this._id}`;
      return { acknowledged: true };
    };

    return doc;
  }

  return {
    // .find({}).populate(ownerProp, "name email").sort({...})
    find(filter = {}) {
      let sortClause = defaultSort;
      const builder = {
        populate() { return builder; },
        select() { return builder; },
        sort(spec) {
          if (spec && typeof spec === "object") {
            const [key, dir] = Object.entries(spec)[0] || [];
            const colMap = { createdAt: "created_at", date: "date", updatedAt: "updated_at" };
            const col = colMap[key] || "created_at";
            sortClause = `${col} ${dir === 1 ? "ASC" : "DESC"}`;
          }
          return builder;
        },
        async then(resolve, reject) {
          try {
            const whereClause = filter && filter._activeOnly && activeWhere
              ? `WHERE ${activeWhere}` : "";
            const q = `
              SELECT t.*, u.id AS u_id, u.name AS u_name, u.email AS u_email
              FROM ${table} t
              LEFT JOIN users u ON u.id = t.${quoteCol(ownerColumn)}
              ${whereClause}
              ORDER BY t.${sortClause}`;
            const rows = await sql.query(q);
            const docs = rows.map((r) =>
              makeDoc(r, { id: r.u_id, name: r.u_name, email: r.u_email })
            );
            resolve(docs);
          } catch (e) { reject(e); }
        },
      };
      return builder;
    },

    // .findById(id).populate(ownerProp, "name email")
    findById(id) {
      let populated = false;
      const run = async () => {
        if (populated) {
          const rows = await sql.query(
            `SELECT t.*, u.id AS u_id, u.name AS u_name, u.email AS u_email
             FROM ${table} t LEFT JOIN users u ON u.id = t.${quoteCol(ownerColumn)}
             WHERE t.id = $1 LIMIT 1`, [id]);
          if (!rows[0]) return null;
          const r = rows[0];
          return makeDoc(r, { id: r.u_id, name: r.u_name, email: r.u_email });
        }
        const rows = await sql.query(`SELECT * FROM ${table} WHERE id = $1 LIMIT 1`, [id]);
        return rows[0] ? makeDoc(rows[0]) : null;
      };
      return {
        populate() { populated = true; return run(); },
        then(resolve, reject) { return run().then(resolve, reject); },
      };
    },

    // .create({...}) or `new Model({...})` then .save()
    async create(data) {
      const cols = [];
      const placeholders = [];
      const values = [];
      let i = 1;
      // owner
      cols.push(ownerColumn);
      placeholders.push(`$${i++}`);
      values.push(data[ownerProp]);
      for (const c of columns) {
        if (data[c.prop] === undefined) continue;
        cols.push(c.col);
        placeholders.push(`$${i++}`);
        let v = data[c.prop];
        if (c.json) v = JSON.stringify(v ?? []);
        values.push(v);
      }
      const q = `INSERT INTO ${table} (${cols.map(quoteCol).join(", ")})
                 VALUES (${placeholders.join(", ")}) RETURNING *`;
      const rows = await sql.query(q, values);
      return makeDoc(rows[0]);
    },

    // support `new Model({...})` style used in some controllers
    _make(data) {
      const self = this;
      return {
        ...data,
        async save() {
          const created = await self.create(data);
          Object.assign(this, created);
          return this;
        },
      };
    },

    async count() {
      const rows = await sql.query(`SELECT COUNT(*)::int AS n FROM ${table}`);
      return rows[0].n;
    },
    async adminDelete(id) {
      await sql.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
      return { acknowledged: true };
    },

    // Hard-delete rows that are sold/closed/expired past their grace period.
    // Used by the scheduled cleanup job (see utils/cleanupExpired.js).
    async cleanupExpired() {
      if (!expireWhere) return 0;
      const rows = await sql.query(`DELETE FROM ${table} WHERE ${expireWhere} RETURNING id`);
      return rows.length;
    },
  };
}

function quoteCol(c) {
  // "user" is a reserved word in Postgres -> must be quoted
  return c === "user" ? `"user"` : c;
}

module.exports = { buildModel };
