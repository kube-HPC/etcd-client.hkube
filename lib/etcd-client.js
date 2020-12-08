const { Etcd3 } = require('etcd3');
const djsv = require('djsv');
const { initSchema } = require('./schema');

class EtcdClient {
    constructor(options) {
        this._client = null;
        this._lease = null;
        const schema = djsv(initSchema, options);
        if (schema.valid) {
            const host = `${options.protocol}://${options.host}:${options.port}`;
            this._client = new Etcd3({ hosts: host });
        }
        else {
            throw new Error(schema.error);
        }
    }

    async put(options) {
        return this._client.put(options.path).value(JSON.stringify(options.value));
    }

    async get(options) {
        if (options.isPrefix) {
            return this._client.getAll().prefix(options.path);
        }
        const res = await this._client.get(options.path);
        return JSON.parse(res);
    }

    async getAndWatch(options) {
        const data = await this.get(options);
        const watcher = await this.watch(options);
        return { data, watcher };
    }

    async delete(options) {
        if (options.isPrefix) {
            return this._client.delete().prefix(options.path);
        }
        return this._client.delete().key(options.path);
    }

    async watch(options) {
        return this._client.watch().prefix(options.path).create();
    }

    async createLease(options) {
        if (this._lease && !this._lease.revoked()) {
            throw new Error('cannot register twice');
        }
        this._lease = this._client.lease(options.ttl);
        this._lease.on('lost', () => {
            this.createLease(options);
        });
        await this.updateLease({ path: options.path, value: options.value });
        await this._lease.keepaliveOnce();
    }

    async updateLease(options) {
        return this._lease.put(options.path).value(JSON.stringify(options.value));
    }

    // sort(target: "Key" | "Version" | "Create" | "Mod" | "Value", order: "None" | "Ascend" | "Descend"):
    async getSortLimit(options, sort = ['Mod', 'Ascend'], limit = 100) {
        const result = await this._client.getAll()
            .prefix(options.path)
            .sort(...sort)
            .limit(limit);

        return Object.entries(result).map(([k, v]) => ({ path: k, value: JSON.parse(v) }));
    }
}

module.exports = EtcdClient;
