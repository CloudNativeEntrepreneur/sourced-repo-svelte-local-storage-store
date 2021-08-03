import { Repository } from 'index'
import { Entity } from 'sourced'

class Example extends Entity {
  constructor(snapshot, events) {
    super()
    this.value = 0
    this.rehydrate(snapshot, events)
  }

  init(id) {
    this.id = id
  }

  increment() {
    this.value++
    this.digest('increment')
    this.enqueue('incremented', this)
  }
}

describe('sourced-repo-svelte-local-storage-store', () => {
  it('should exist', async () => {
    expect(Repository).toBeDefined()

    const repo = new Repository(Example)

    expect(repo.get).toBeDefined
    expect(repo.commit).toBeDefined

    let empty = await repo.get()
    expect(empty).toEqual(null)

    let noevents = new Example()
    await repo.commit(noevents)

    let noId = new Example()
    noId.increment()
    try {
      await repo.commit(noId)
    } catch (err) {
      expect(err).toBeDefined()
    }

    try {
      await repo.get('does-not-exist')
    } catch (err) {
      expect(err).toBeDefined()
    }

    const example = new Example()
    example.init('test-1')
    example.increment()
    expect(example.value).toEqual(1)
    
    let x = 0
    while (x < 20) {
      example.increment()
      x++
    }

    await repo.commit(example)

    let test1 = await repo.get('test-1')
    expect(test1.value).toEqual(21)

  })
})
