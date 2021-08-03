import { Repository } from 'index'
import { Entity } from 'sourced'

class Example extends Entity {
  constructor(snapshot, events) {
    super()
    this.value = 0
    this.rehydrate(snapshot, events)
  }

  increment() {
    this.value++
    this.digest('increment')
    this.enqueue('incremented', this)
  }
}

describe('sourced-repo-svelte-local-storage-store', () => {
  it('should exist', () => {
    expect(Repository).toBeDefined()

    const repo = new Repository(Example)

    expect(repo.get).toBeDefined
    expect(repo.commit).toBeDefined
  })
})
