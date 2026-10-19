const { buildModel } = require("./_ownedModel");

const base = buildModel({
  table: "lost_items",
  ownerColumn: "user",
  ownerProp: "user",
  defaultSort: "created_at DESC",
  columns: [
    { col: "title", prop: "title" },
    { col: "description", prop: "description" },
    { col: "category", prop: "category" },
    { col: "location", prop: "location" },
    { col: "date", prop: "date" },
    { col: "image", prop: "image" },
    { col: "contact", prop: "contact" },
    { col: "security_question", prop: "securityQuestion" },
    { col: "is_resolved", prop: "isResolved" },
  ],
});

function LostItem(data) { return base._make(data); }
LostItem.find = base.find.bind(base);
LostItem.findById = base.findById.bind(base);
LostItem.create = base.create.bind(base);
LostItem.count = base.count.bind(base);
LostItem.adminDelete = base.adminDelete.bind(base);

module.exports = LostItem;
