const { buildModel } = require("./_ownedModel");

const base = buildModel({
  table: "roommates",
  ownerColumn: "user",
  ownerProp: "user",
  defaultSort: "created_at DESC",
  activeWhere: "is_closed = false",
  expireWhere: "is_closed = true AND updated_at < NOW() - INTERVAL '24 hours'",
  columns: [
    { col: "type", prop: "type" },
    { col: "location", prop: "location" },
    { col: "budget", prop: "budget" },
    { col: "gender", prop: "gender" },
    { col: "contact", prop: "contact" },
    { col: "description", prop: "description" },
    { col: "tags", prop: "tags", json: true, array: true },
    { col: "images", prop: "images", json: true, array: true },
    { col: "is_closed", prop: "isClosed" },
  ],
});

function Roommate(data) { return base._make(data); }
Roommate.find = base.find.bind(base);
Roommate.findActive = () => base.find({ _activeOnly: true });
Roommate.findById = base.findById.bind(base);
Roommate.create = base.create.bind(base);
Roommate.count = base.count.bind(base);
Roommate.adminDelete = base.adminDelete.bind(base);
Roommate.cleanupExpired = base.cleanupExpired.bind(base);

module.exports = Roommate;
