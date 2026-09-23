import { storyEventSchema, type StoryEvent } from '@asf/contracts';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter } from 'node:events';

type Listener = (event: StoryEvent) => void;

/**
 * Доставка событий внутри одного процесса API: воркеры и SSE живут вместе.
 * Нет подписчика — событие теряется, клиент восстановит состояние из GET.
 */
@Injectable()
export class StoryEventsService {
  private readonly logger = new Logger(StoryEventsService.name);
  private readonly rooms = new Map<string, EventEmitter>();

  publish(storyId: string, event: StoryEvent): void {
    const parsed = storyEventSchema.safeParse(event);
    if (!parsed.success) {
      this.logger.warn(`drop invalid story event story=${storyId}`);
      return;
    }

    this.rooms.get(storyId)?.emit('event', parsed.data);
  }

  subscribe(storyId: string, listener: Listener): () => void {
    const room = this.room(storyId);
    room.on('event', listener);
    return () => {
      room.off('event', listener);
      if (room.listenerCount('event') === 0) {
        this.rooms.delete(storyId);
      }
    };
  }

  private room(storyId: string): EventEmitter {
    const existing = this.rooms.get(storyId);
    if (existing) {
      return existing;
    }

    const created = new EventEmitter();
    created.setMaxListeners(0);
    this.rooms.set(storyId, created);
    return created;
  }
}
