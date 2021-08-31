import { EventEmitter } from "eventemitter3";
import { get } from "svelte/store";
import { writable as writeableWithLocalStorage } from "svelte-local-storage-store";

const log = console.log;

export interface RepositoryOptions {
  indices: string[];
  forceSnapshot: boolean;
  snapshotFrequency: number;
}

export class Repository extends EventEmitter {
  EntityType: any;
  options: RepositoryOptions;
  indices: string[];
  forceSnapshot: boolean;
  snapshotFrequency: number;
  events: any;
  snapshots: any;

  constructor(
    EntityType,
    options = {
      indices: [],
      forceSnapshot: false,
      snapshotFrequency: 10,
    }
  ) {
    super();

    const indices = [...new Set([...options.indices, ...["id"]])];

    this.EntityType = EntityType;
    this.indices = indices;
    this.snapshotFrequency = options.snapshotFrequency;
    this.forceSnapshot = options.forceSnapshot;

    // snapshot store setup
    const snapshotsKey = `${EntityType.name}.snapshots`;
    const snapshots = writeableWithLocalStorage(snapshotsKey, []);
    this.snapshots = snapshots;

    // event store setup
    const eventsKey = `${EntityType.name}.events`;
    const events = writeableWithLocalStorage(eventsKey, []);
    this.events = events;

    log(`initialized ${this.EntityType.name} entity store`);

    this.emit("ready");
  }

  commit(entity) {
    log(`committing ${this.EntityType.name} for id ${entity.id}`);
    this._commitEvents(entity);
    this._commitSnapshots(entity);
    this._emitEvents(entity);
    return this;
  }

  get(id) {
    return this._getByIndex("id", id);
  }

  _getByIndex(index, value) {
    log(`getting ${this.EntityType.name} where "${index}" is "${value}"`);

    const allSnapshots: unknown[] = get(this.snapshots) as any[];
    const snapshots = allSnapshots.filter(
      (snapshot) => snapshot[index] === value
    );
    const snapshot: any = snapshots[0];

    const allEvents: unknown[] = get(this.events) as any[];
    const events: any[] = allEvents
      .filter((event: any) => event[index] === value)
      .filter((event: any) =>
        snapshot ? event.version > snapshot.version : true
      );

    log({ snapshots, snapshot, events });

    // if (snapshot && snapshot._id) delete snapshot._id
    if (!snapshot && !events.length) {
      return null;
    }

    const id = index === "id" ? value : snapshot ? snapshot.id : events[0].id;

    const entity = this._deserialize(id, snapshot, events);
    return entity;
  }

  _commitEvents(entity) {
    if (entity.newEvents.length === 0) return null;

    if (!entity.id) {
      throw new Error(
        `Cannot commit an entity of type ${this.EntityType} without an [id] property`
      );
    }

    const newEvents = entity.newEvents;
    newEvents.forEach((event) => {
      this.indices.forEach(function (index) {
        event[index] = entity[index];
      });
    });

    this.events.update((previousEvents) => [...previousEvents, ...newEvents]);
    entity.newEvents = [];

    log(`committed ${this.EntityType.name}.events for id ${entity.id}`);

    return entity;
  }

  _commitSnapshots(entity) {
    if (
      this.forceSnapshot ||
      entity.version >= entity.snapshotVersion + this.snapshotFrequency
    ) {
      const snapshot = entity.snapshot();
      // put new one at the beginning for premptive sorting
      this.snapshots.update((previousSnapshots) => [
        snapshot,
        ...previousSnapshots,
      ]);

      log(
        `committed ${this.EntityType.name}.snapshot for id ${entity.id}`,
        snapshot
      );

      return entity;
    } else {
      return entity;
    }
  }

  _deserialize(id, snapshot, events) {
    log("deserializing %s entity ", this.EntityType.name);
    const entity = new this.EntityType(snapshot, events);
    entity.id = id;
    return entity;
  }

  _emitEvents(entity) {
    log("emitting events");
    const eventsToEmit = entity.eventsToEmit;
    entity.eventsToEmit = [];
    eventsToEmit.forEach((eventToEmit) => {
      const args = Array.prototype.slice.call(eventToEmit);
      this.EntityType.prototype.emit.apply(entity, args);
    });

    log("emitted local events for id %s", entity.id);
  }
}
