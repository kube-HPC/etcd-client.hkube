
const { expect } = require('chai');
const Etcd = require('../index');
const sinon = require('sinon');
const uuidv4 = require('uuid/v4');
let etcd;

describe('etcd', () => {
    beforeEach(() => {
        etcd = new Etcd({ host: 'localhost', port: 4001 });
    });
    describe('get/set', () => {
        it('should set a key and then get the same key', async () => {
            const uuid = uuidv4();
            const path = `tests/sample/${uuid}`;
            const value = { bla: 'bla' };
            await etcd.put({ path, value });
            const result = await etcd.get({ path });
            expect(result).to.deep.equal(value);
        });
        it('should watch path', () => {
            return new Promise(async (resolve, reject) => {
                const uuid = uuidv4();
                const path = `tests/sample/${uuid}`;
                const value = { bla: 'bla' };
                const watch = await etcd.watch({ path });
                watch.on('disconnected', () => console.log('disconnected...'));
                watch.on('connected', () => console.log('successfully reconnected!'));
                watch.on('put', (res) => {
                    const key = res.key.toString();
                    const result = JSON.parse(res.value.toString());
                    expect(key).to.deep.equal(path);
                    expect(result).to.deep.equal(value);
                    resolve();
                });
                watch.on('delete', (res) => {

                });
                watch.on('data', (res) => {

                });
                await etcd.put({ path, value });
            });
        });
        it('should get and watch', () => {
            return new Promise(async (resolve, reject) => {
                const uuid = uuidv4();
                const path = `tests/sample/${uuid}`;
                const value = { bla: 'bla' };
                const watch = await etcd.getAndWatch({ path });
                expect(watch).to.have.property('watcher');
                expect(watch).to.have.property('data');
                watch.watcher.on('put', (res) => {
                    const key = res.key.toString();
                    const result = JSON.parse(res.value.toString());
                    expect(key).to.deep.equal(path);
                    expect(result).to.deep.equal(value);
                    resolve();
                });
                await etcd.put({ path, value });
            });
        });
        it('should get lease', () => {
            return new Promise(async (resolve, reject) => {
                const uuid = uuidv4();
                const path = `tests/sample/${uuid}`;
                const value1 = { data: 'lease1' };
                await etcd.createLease({ path, ttl: 5, value: value1 });

                const result1 = await etcd.get({ path });
                expect(result1).to.deep.equal(value1);

                const value2 = { data: 'lease2' };
                await etcd.updateLease({ path, value: value2 });
                const result2 = await etcd.get({ path });
                expect(result2).to.deep.equal(value2);
                resolve();

            });
        });
        it('etcd sort with limit', async () => {
            const uuid = uuidv4();
            const expected = [];
            const limit = 5;
            const max = 10;
            for (let i = 0; i < max; i++) {
                const obj = { path: `${uuid}/${i}`, value: `val${i}` };
                expected.push(obj);
                await etcd.put(obj);
            }
            const data = await etcd.getSortLimit({ path: uuid }, ['Mod', 'Ascend'], limit);
            expected.splice(limit, max);
            expect(data).to.deep.equal(expected);
            expect(data.length).to.equal(limit);
        });
    });
});