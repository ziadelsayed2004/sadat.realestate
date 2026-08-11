import mongoose, { type Connection } from 'mongoose';
import type { AppEnvironment } from '../config/environment.js';
import type { DatabaseEnvironment } from './environment.js';
import { resolveDatabaseIndexPolicy, type DatabaseIndexPolicy } from './index-policy.js';

export type DatabaseConnectionState = 'disconnected' | 'connecting' | 'connected' | 'disconnecting' | 'error';

export interface DatabaseReadiness {
  isReady(): Promise<boolean>;
}

export interface DatabaseConnection extends DatabaseReadiness {
  readonly state: DatabaseConnectionState;
  readonly indexPolicy: DatabaseIndexPolicy;
  readonly nativeConnection: Connection;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

const SERVER_SELECTION_TIMEOUT_MS = 5_000;
const READINESS_TIMEOUT_MS = 1_000;

export function createDatabaseConnection(
  environment: DatabaseEnvironment,
  appEnvironment: AppEnvironment,
  connectionFactory: () => Connection = () => mongoose.createConnection()
): DatabaseConnection {
  const nativeConnection = connectionFactory();
  const indexPolicy = resolveDatabaseIndexPolicy(appEnvironment);
  let state: DatabaseConnectionState = 'disconnected';
  let connectPromise: Promise<void> | undefined;
  let disconnectPromise: Promise<void> | undefined;

  nativeConnection.on('connected', () => { state = 'connected'; });
  nativeConnection.on('reconnected', () => { state = 'connected'; });
  nativeConnection.on('disconnected', () => { state = 'disconnected'; });
  nativeConnection.on('error', () => { state = 'error'; });

  const databaseConnection: DatabaseConnection = {
    get state() { return state; },
    indexPolicy,
    nativeConnection,
    async connect() {
      if (state === 'connected' && nativeConnection.readyState === 1) return;
      if (connectPromise) return connectPromise;
      state = 'connecting';
      connectPromise = nativeConnection.openUri(environment.uri, {
        autoIndex: indexPolicy.autoIndex,
        serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS
      }).then(() => {
        state = 'connected';
      }).catch((error: unknown) => {
        state = 'error';
        throw error;
      }).finally(() => {
        connectPromise = undefined;
      });
      return connectPromise;
    },
    async disconnect() {
      if (disconnectPromise) return disconnectPromise;
      if (nativeConnection.readyState === 0) {
        state = 'disconnected';
        return;
      }
      state = 'disconnecting';
      disconnectPromise = nativeConnection.close().then(() => {
        state = 'disconnected';
      }).catch((error: unknown) => {
        state = 'error';
        throw error;
      }).finally(() => {
        disconnectPromise = undefined;
      });
      return disconnectPromise;
    },
    async isReady() {
      if (state !== 'connected' || nativeConnection.readyState !== 1 || !nativeConnection.db) return false;
      try {
        await nativeConnection.db.command({ ping: 1 }, { timeoutMS: READINESS_TIMEOUT_MS });
        return true;
      } catch {
        return false;
      }
    }
  };

  return databaseConnection;
}
