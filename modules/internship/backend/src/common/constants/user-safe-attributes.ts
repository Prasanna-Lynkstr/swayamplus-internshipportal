// Never include the full User model without excluding passwordHash — this is
// the one field on the whole schema that must never leave the process. Every
// `include: [{ model: userModel, as: 'user', ... }]` site should spread this
// in rather than reimplementing the exclusion inline.
export const USER_SAFE_ATTRIBUTES = {
  attributes: { exclude: ['passwordHash'] },
};
