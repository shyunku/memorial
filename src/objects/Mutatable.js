class Mutatable {
  constructor(entityMap) {
    this.entityMap = entityMap;
  }

  static fromEntity(entity) {
    const ctx = new this();
    for (let key in entity) {
      const localKey = ctx.entityMap[key];
      if (!localKey) continue;
      let value = entity[key];
      // console.log(`${key} -> ${localKey} = ${value}`);
      if (localKey.endsWith("At") || localKey.toLowerCase().endsWith("date")) {
        value = value ? new Date(value) : value;
      }
      ctx[localKey] = value;
    }
    return ctx;
  }

  toEntity() {
    const entity = {};
    for (let key in this.entityMap) {
      const localKey = this.entityMap[key];
      let value = this[localKey];
      if (value instanceof Date) {
        value = value.getTime();
      }
      entity[key] = value;
    }
    return entity;
  }

  toObject() {
    const { ...object } = this;
    return object;
  }
}

export default Mutatable;
