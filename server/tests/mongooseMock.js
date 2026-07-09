const dbStore = {
  users: [],
  categories: [],
  tasks: [],
  preferences: [],
  auditlogs: [],
  notifications: [],
  reminders: []
};

const clearDbStore = () => {
  dbStore.users = [];
  dbStore.categories = [];
  dbStore.tasks = [];
  dbStore.preferences = [];
  dbStore.auditlogs = [];
  dbStore.notifications = [];
  dbStore.reminders = [];
};

class MockQuery {
  constructor(promise) {
    this.promise = promise;
    this.populatePaths = [];
  }
  select() { return this; }
  populate(path) {
    if (path) this.populatePaths.push(path);
    return this;
  }
  sort() { return this; }
  skip() { return this; }
  limit() { return this; }
  then(onFulfilled, onRejected) {
    return this.promise.then(data => {
      if (data && this.populatePaths.length > 0) {
        const isArray = Array.isArray(data);
        const items = isArray ? data : [data];
        
        items.forEach(item => {
          this.populatePaths.forEach(pathName => {
            if (item[pathName]) {
              const idVal = item[pathName].toString();
              let targetStore = [];
              if (pathName === 'task') targetStore = dbStore.tasks;
              else if (pathName === 'user') targetStore = dbStore.users;
              else if (pathName === 'category') targetStore = dbStore.categories;
              
              const doc = targetStore.find(d => d._id.toString() === idVal);
              if (doc) {
                item[pathName] = doc;
              }
            }
          });
        });
      }
      return onFulfilled ? onFulfilled(data) : data;
    }, onRejected);
  }
  catch(onRejected) {
    return this.promise.catch(onRejected);
  }
}

const createMockModel = (collectionName) => {
  const getStoreKey = () => {
    let key = collectionName.toLowerCase();
    if (key === 'category') {
      return 'categories';
    }
    if (key === 'userpreference' || key === 'preference') {
      return 'preferences';
    }
    if (!key.endsWith('s')) {
      return key + 's';
    }
    return key;
  };

  const getStore = () => {
    const key = getStoreKey();
    if (!dbStore[key]) {
      dbStore[key] = [];
    }
    return dbStore[key];
  };

  const setStore = (val) => {
    const key = getStoreKey();
    dbStore[key] = val;
  };

  class MockModel {
    constructor(properties = {}) {
      Object.assign(this, properties);
      if (!this._id) {
        this._id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      }
      this.id = this._id.toString();
      if (collectionName.toLowerCase() === 'user' && !this.refreshTokens) {
        this.refreshTokens = [];
      }
      this.createdAt = new Date();
      this.updatedAt = new Date();
    }

    async save() {
      const store = getStore();
      const idx = store.findIndex(item => item._id.toString() === this._id.toString());
      if (idx > -1) {
        store[idx] = this;
      } else {
        store.push(this);
      }
      return this;
    }

    static async create(data) {
      if (data.password && !data.password.startsWith('$hashed_')) {
        data.password = `$hashed_${data.password}`;
      }
      const instance = new MockModel(data);
      await instance.save();
      return instance;
    }

    static findOne(query = {}) {
      const store = getStore();
      const found = store.find(item => {
        for (const key in query) {
          if (key === '$or' && Array.isArray(query.$or)) {
            const orMatched = query.$or.some(subQuery => {
              for (const subKey in subQuery) {
                if (item[subKey]?.toString() !== subQuery[subKey]?.toString()) {
                  return false;
                }
              }
              return true;
            });
            if (!orMatched) return false;
          } else if (query[key] && typeof query[key] === 'object' && query[key].$regex) {
            const reg = query[key].$regex;
            const options = query[key].$options || '';
            const regex = new RegExp(reg, options);
            if (!regex.test(item[key])) return false;
          } else if (item[key]?.toString() !== query[key]?.toString()) {
            return false;
          }
        }
        return true;
      });
      return new MockQuery(Promise.resolve(found || null));
    }

    static findById(id) {
      const store = getStore();
      if (!id) return new MockQuery(Promise.resolve(null));
      const found = store.find(item => item._id.toString() === id.toString());
      return new MockQuery(Promise.resolve(found || null));
    }

    static findByIdAndDelete(id) {
      const store = getStore();
      if (!id) return new MockQuery(Promise.resolve(null));
      const idx = store.findIndex(item => item._id.toString() === id.toString());
      if (idx > -1) {
        const deleted = store.splice(idx, 1)[0];
        return new MockQuery(Promise.resolve(deleted));
      }
      return new MockQuery(Promise.resolve(null));
    }

    static find(query = {}) {
      const store = getStore();
      let matched = store.filter(item => {
        for (const key in query) {
          if (key === '$or' && Array.isArray(query.$or)) {
            const orMatched = query.$or.some(subQuery => {
              for (const subKey in subQuery) {
                if (subQuery[subKey] && typeof subQuery[subKey] === 'object' && subQuery[subKey].$regex) {
                  const reg = subQuery[subKey].$regex;
                  const options = subQuery[subKey].$options || '';
                  const regex = new RegExp(reg, options);
                  if (!regex.test(item[subKey])) return false;
                } else if (item[subKey]?.toString() !== subQuery[subKey]?.toString()) {
                  return false;
                }
              }
              return true;
            });
            if (!orMatched) return false;
          } else if (key === 'user' && item.user?.toString() !== query.user?.toString()) return false;
          if (key === 'status' && item.status !== query.status) return false;
          if (key === 'priority' && item.priority !== query.priority) return false;
          if (key === 'category' && item.category?.toString() !== query.category?.toString()) return false;
          if (key === '_id' && typeof query._id === 'object' && query._id.$in) {
            const ids = query._id.$in.map(id => id.toString());
            if (!ids.includes(item._id.toString())) return false;
          }
        }
        return true;
      });
      return new MockQuery(Promise.resolve(matched));
    }

    static countDocuments(query = {}) {
      const store = getStore();
      const matched = store.filter(item => {
        for (const key in query) {
          if (key === 'user' && item.user?.toString() !== query.user?.toString()) return false;
          if (key === 'status' && item.status !== query.status) return false;
          if (key === 'priority' && item.priority !== query.priority) return false;
          if (key === 'category' && item.category?.toString() !== query.category?.toString()) return false;
          if (key === '_id' && typeof query._id === 'object' && query._id.$in) {
            const ids = query._id.$in.map(id => id.toString());
            if (!ids.includes(item._id.toString())) return false;
          }
        }
        return true;
      });
      return new MockQuery(Promise.resolve(matched.length));
    }

    static deleteMany(query = {}) {
      const store = getStore();
      let deletedCount = 0;
      const remaining = store.filter(item => {
        let match = true;
        for (const key in query) {
          if (key === '_id' && query._id.$in) {
            const ids = query._id.$in.map(id => id.toString());
            match = ids.includes(item._id.toString());
          } else if (key === 'user' && item.user?.toString() !== query.user?.toString()) {
            match = false;
          } else if (key !== '_id' && key !== 'user' && item[key]?.toString() !== query[key]?.toString()) {
            match = false;
          }
        }
        if (match) deletedCount++;
        return !match;
      });
      setStore(remaining);
      return new MockQuery(Promise.resolve({ deletedCount }));
    }

    static updateMany(query = {}, update = {}) {
      const store = getStore();
      let modifiedCount = 0;
      store.forEach(item => {
        let match = true;
        for (const key in query) {
          if (key === '_id' && query._id.$in) {
            const ids = query._id.$in.map(id => id.toString());
            match = ids.includes(item._id.toString());
          } else if (key === 'user' && item.user?.toString() !== query.user?.toString()) {
            match = false;
          } else if (key !== '_id' && key !== 'user' && item[key]?.toString() !== query[key]?.toString()) {
            match = false;
          }
        }
        if (match) {
          if (update.$set) {
            Object.assign(item, update.$set);
          } else {
            Object.assign(item, update);
          }
          modifiedCount++;
        }
      });
      return new MockQuery(Promise.resolve({ modifiedCount }));
    }

    static aggregate(pipeline = []) {
      const store = getStore();
      const results = [];
      
      const isStatusGroup = pipeline.some(p => p.$group && p.$group._id === '$status');
      const isPriorityGroup = pipeline.some(p => p.$group && p.$group._id === '$priority');
      const isCategoryGroup = pipeline.some(p => p.$group && p.$group._id === '$category');

      if (isStatusGroup) {
        ['pending', 'in-progress', 'completed'].forEach(s => {
          const count = store.filter(t => t.status === s).length;
          results.push({ _id: s, count });
        });
      } else if (isPriorityGroup) {
        ['low', 'medium', 'high'].forEach(p => {
          const count = store.filter(t => t.priority === p).length;
          results.push({ _id: p, count });
        });
      } else if (isCategoryGroup) {
        dbStore.categories.forEach(c => {
          const count = store.filter(t => t.category?.toString() === c._id.toString()).length;
          const completed = store.filter(t => t.category?.toString() === c._id.toString() && t.status === 'completed').length;
          results.push({
            _id: c._id,
            count,
            completed,
            categoryDetails: c
          });
        });
      } else {
        results.push({ _id: 'default', count: store.length });
      }

      return new MockQuery(Promise.resolve(results));
    }

    async comparePassword(candidatePassword) {
      return this.password === `$hashed_${candidatePassword}` || this.password === candidatePassword;
    }
  }

  MockModel.index = () => {};
  MockModel.schema = { pre: () => {}, methods: {} };

  return MockModel;
};

const makeMockFn = (defaultVal, impl) => {
  if (typeof jest !== 'undefined') {
    const fn = jest.fn();
    if (impl) fn.mockImplementation(impl);
    else if (defaultVal !== undefined) fn.mockResolvedValue(defaultVal);
    return fn;
  }
  const fn = (...args) => {
    if (impl) return impl(...args);
    return Promise.resolve(defaultVal);
  };
  fn.mockResolvedValue = (val) => makeMockFn(val);
  fn.mockImplementation = (i) => makeMockFn(undefined, i);
  return fn;
};

const mockModels = {};

const mongooseMock = {
  connect: makeMockFn({
    connection: { host: 'mock-mongo-db-server' }
  }),
  disconnect: makeMockFn(true),
  connection: {
    host: 'mock-mongo-db-server',
    readyState: 1,
    collections: {},
    close: makeMockFn(true)
  },
  Schema: class {
    constructor() {}
    pre() {}
    index() {}
    methods = {};
    static Types = {
      ObjectId: 'ObjectId',
      Mixed: 'Mixed'
    };
  },
  model: makeMockFn(undefined, (name, schema) => {
    if (!mockModels[name]) {
      mockModels[name] = createMockModel(name);
    }
    return mockModels[name];
  }),
  Types: {
    ObjectId: class {
      constructor(id) {
        this.id = id || Math.random().toString(36).substring(2, 15);
      }
      toString() {
        return this.id.toString();
      }
    }
  },
  clearDbStore
};

module.exports = mongooseMock;
