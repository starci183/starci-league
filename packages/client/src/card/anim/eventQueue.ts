/** Lossless FIFO: socket deliveries must not depend on React render batching. */
export class PresentationInbox<T> {
    private items: T[] = []
    private consumer: ((item: T) => void) | null = null

    push(item: T) {
        this.items.push(item)
        this.flush()
    }

    subscribe(consumer: (item: T) => void): () => void {
        this.consumer = consumer
        this.flush()
        return () => {
            if (this.consumer === consumer) this.consumer = null
        }
    }

    clear() { this.items = [] }

    private flush() {
        while (this.consumer && this.items.length) this.consumer(this.items.shift()!)
    }
}
