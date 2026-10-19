const { buildModel } = require("./_ownedModel");

const base = buildModel({
  table: "skills",
  ownerColumn: "user",
  ownerProp: "user",
  defaultSort: "created_at DESC",
  activeWhere: "is_active = true",
  expireWhere: "is_active = false AND updated_at < NOW() - INTERVAL '24 hours'",
  columns: [
    { col: "title", prop: "title" },
    { col: "description", prop: "description" },
    { col: "category", prop: "category" },
    { col: "location", prop: "location" },
    { col: "contact", prop: "contact" },
    { col: "reviews", prop: "reviews", json: true, array: true },
    { col: "rating", prop: "rating" },
    { col: "num_reviews", prop: "numReviews" },
    { col: "is_active", prop: "isActive" },
  ],
});

function Skill(data) { return base._make(data); }
Skill.find = base.find.bind(base);
Skill.findActive = () => base.find({ _activeOnly: true });
Skill.findById = base.findById.bind(base);
Skill.create = base.create.bind(base);
Skill.count = base.count.bind(base);
Skill.adminDelete = base.adminDelete.bind(base);
Skill.cleanupExpired = base.cleanupExpired.bind(base);

module.exports = Skill;
