import { Repository } from "../../src/index";
import { Entity } from "sourced";

class Example extends Entity {
  id: string;
  value: number;
  constructor(snapshot?: any, events?: any) {
    super();
    this.value = 0;
    this.rehydrate(snapshot, events);
  }

  init(id) {
    this.id = id;
  }

  increment() {
    this.value++;
    this.digest("increment", {});
    this.enqueue("incremented", this);
  }
}

describe("sourced-repo-svelte-local-storage-store", () => {
  it("should exist", async () => {
    expect(Repository).toBeDefined();

    const repo = new Repository(Example);

    expect(repo.get).toBeDefined();
    expect(repo.commit).toBeDefined();

    const noevents = new Example();
    await repo.commit(noevents);

    const noId = new Example();
    noId.increment();
    try {
      await repo.commit(noId);
    } catch (err) {
      expect(err).toBeDefined();
    }

    try {
      await repo.get("does-not-exist");
    } catch (err) {
      expect(err).toBeDefined();
    }

    const example = new Example();
    example.init("test-1");
    example.increment();
    expect(example.value).toEqual(1);

    let x = 0;
    while (x < 20) {
      example.increment();
      x++;
    }

    await repo.commit(example);

    const test1 = (await repo.get("test-1")) as Example;
    expect(test1.value).toEqual(21);
  });
});
