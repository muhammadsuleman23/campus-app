// Run once to create all tables in your Neon database:
//   npm run init-db      (or: node config/initDb.js)
require('dns').setDefaultResultOrder('ipv4first');
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { neon } = require("@neondatabase/serverless");

(async () => {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL is not set in .env");
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);
  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");

  // Execute one raw (no-parameter) SQL statement across driver versions.
  async function exec(statement) {
    if (typeof sql.query === "function") return sql.query(statement); // neon >= 1.0
    if (typeof sql.unsafe === "function") return sql.unsafe(statement);
    return sql([statement]);
  }

  try {
    const statements = splitSql(schema);
    for (const stmt of statements) {
      if (!stmt) continue;
      await exec(stmt);
    }
    console.log("✅ Neon schema created / verified successfully.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Failed to initialize schema:", err.message);
    if (/sql\.query is not a function|unsafe is not a function/.test(err.message)) {
      console.error(
        "\nThis usually means an old @neondatabase/serverless is installed.\n" +
        "Fix it with:\n  npm install @neondatabase/serverless@^1.0.0\n"
      );
    }
    process.exit(1);
  }
})();

// 1) strip line-comments, 2) split on semicolons that are OUTSIDE $$..$$ blocks.
// The neon HTTP driver rejects multiple commands per call, so each returned
// statement must be exactly one command (no trailing semicolon, no comments).
function splitSql(sqlText) {
  // remove `-- ...` comments (schema has no -- inside string literals)
  const noComments = sqlText
    .split("\n")
    .map((line) => {
      const i = line.indexOf("--");
      return i === -1 ? line : line.slice(0, i);
    })
    .join("\n");

  const out = [];
  let current = "";
  let inDollar = false;

  for (let i = 0; i < noComments.length; i++) {
    const two = noComments.slice(i, i + 2);
    if (two === "$$") {
      inDollar = !inDollar;
      current += "$$";
      i++; // skip second $
      continue;
    }
    const ch = noComments[i];
    if (ch === ";" && !inDollar) {
      const trimmed = current.trim();
      if (trimmed) out.push(trimmed);
      current = "";
    } else {
      current += ch;
    }
  }
  const last = current.trim();
  if (last) out.push(last);
  return out;
}
