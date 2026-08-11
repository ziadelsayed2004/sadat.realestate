import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';
import type { Connection } from 'mongoose';
import { createDatabaseConnection } from '../../src/modules/database/connection.js';

interface FakeConnection extends EventEmitter {
  readyState: number;
  db?: { command(command: { ping: number }, options: { maxTimeMS: number }): Promise<unknown> };
  openUri(uri: string, options: { autoIndex: boolean; serverSelectionTimeoutMS: number }): Promise<unknown>;
  close(): Promise<void>;
}

function fakeConnection(): FakeConnection {
  const connection = new EventEmitter() as FakeConnection;
  connection.readyState = 0;
  connection.openUri = async () => {
    connection.readyState = 1;
    connection.db = { command: async () => ({ ok: 1 }) };
    connection.emit('connected');
  };
  connection.close = async () => {
    connection.readyState = 0;
    connection.emit('disconnected');
  };
  return connection;
}

test('supports concurrent connect, readiness, and idempotent disconnect', async () => {
  const native = fakeConnection();
  const database = createDatabaseConnection(
    { uri: 'mongodb://127.0.0.1:27017/sadat' },
    'test',
    () => native as unknown as Connection
  );

  assert.equal(await database.isReady(), false);
  await Promise.all([database.connect(), database.connect()]);
  assert.equal(database.state, 'connected');
  assert.equal(await database.isReady(), true);
  await Promise.all([database.disconnect(), database.disconnect()]);
  assert.equal(database.state, 'disconnected');
  assert.equal(await database.isReady(), false);
});

test('reports a failed connection without exposing credentials through the state API', async () => {
  const native = fakeConnection();
  native.openUri = async () => { throw new Error('mongodb://user:password@host.invalid'); };
  const database = createDatabaseConnection(
    { uri: 'mongodb://user:password@host.invalid/sadat' },
    'test',
    () => native as unknown as Connection
  );
  await assert.rejects(database.connect(), /mongodb/);
  assert.equal(database.state, 'error');
});

test('tracks reconnect events and failed graceful disconnects', async () => {
  const native = fakeConnection();
  const database = createDatabaseConnection(
    { uri: 'mongodb://127.0.0.1:27017/sadat' },
    'test',
    () => native as unknown as Connection
  );

  await database.connect();
  native.readyState = 0;
  native.emit('disconnected');
  assert.equal(database.state, 'disconnected');
  native.readyState = 1;
  native.emit('reconnected');
  assert.equal(database.state, 'connected');

  native.close = async () => { throw new Error('close failed'); };
  await assert.rejects(database.disconnect(), /close failed/);
  assert.equal(database.state, 'error');
});
